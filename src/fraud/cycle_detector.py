"""
fraud cycle detector identifies circular transaction patterns in directed multigraphs
uses strongly connected components and simple cycle enumeration for ring detection
"""

import gc

import networkx as nx
from pydantic import BaseModel

from src.features.schemas import EngineeredFeatureVector


class CycleMetrics(BaseModel):
    """
    per-cycle metrics computed over a directed cycle path
    velocity recurrence and concentration signal laundering ring intensity
    """

    cycle_path: list[str]
    cycle_velocity: float
    cycle_recurrence: int
    amount_concentration: float


class FraudResult(BaseModel):
    """
    per-gstin fraud detection result aggregated from all cycles it participates in
    confidence blends velocity and recurrence signals into a single 0-1 score
    """

    gstin: str
    fraud_ring_flag: bool
    fraud_confidence: float
    cycle_velocity: float
    cycle_recurrence: float
    participating_cycles: list[list[str]]


class CycleDetector:
    """
    detects fraudulent circular transaction rings in a directed transaction multigraph
    uses scc decomposition cycle enumeration and metric thresholding
    """

    def __init__(
        self,
        velocity_threshold: float = 100000.0,
        recurrence_threshold: int = 3,
        cycle_length_bound: int = 5,
    ) -> None:
        """
        initializes detector with velocity recurrence and cycle length thresholds
        """
        self.velocity_threshold = velocity_threshold
        self.recurrence_threshold = recurrence_threshold
        self.cycle_length_bound = cycle_length_bound

    def detect(
        self, graph: nx.MultiDiGraph, window_days: int = 30
    ) -> dict[str, FraudResult]:
        """
        full pipeline from graph to per-gstin fraud results
        returns empty dict if graph has no edges
        prints summary of sccs cycles and flagged gstins
        """
        if graph.number_of_edges() == 0:
            return {}
        sccs = self._extract_candidate_sccs(graph)
        total_sccs = len(sccs)
        all_cycles: list[list[str]] = []
        all_metrics: list[CycleMetrics] = []
        for scc_graph in sccs:
            cycles = self._detect_cycles_in_scc(scc_graph)
            for cycle in cycles:
                metrics = self._compute_cycle_metrics(cycle, graph, window_days)
                all_cycles.append(cycle)
                all_metrics.append(metrics)
            self._cleanup_subgraph(scc_graph)
        results = self._flag_participants(all_cycles, all_metrics)
        total_nodes = graph.number_of_nodes()
        total_cycles = len(all_cycles)
        total_flagged = len(results)
        print(f"cycle detection nodes {total_nodes} sccs {total_sccs} cycles {total_cycles} flagged {total_flagged}")
        return results

    def _extract_candidate_sccs(
        self, graph: nx.MultiDiGraph
    ) -> list[nx.MultiDiGraph]:
        """
        extracts sccs with 3 or more nodes as cycle candidate subgraphs
        uses networkx strongly_connected_components on the full multigraph
        """
        candidate_subgraphs: list[nx.MultiDiGraph] = []
        for scc_nodes in nx.strongly_connected_components(graph):
            if len(scc_nodes) >= 3:
                subgraph = graph.subgraph(scc_nodes).copy()
                candidate_subgraphs.append(subgraph)
        return candidate_subgraphs

    def _detect_cycles_in_scc(
        self, scc_graph: nx.MultiDiGraph
    ) -> list[list[str]]:
        """
        enumerates simple cycles within an scc subgraph up to cycle_length_bound
        returns empty list if scc has no edges
        """
        if scc_graph.number_of_edges() == 0:
            return []
        return list(nx.simple_cycles(scc_graph, length_bound=self.cycle_length_bound))

    def _compute_cycle_metrics(
        self,
        cycle: list[str],
        graph: nx.MultiDiGraph,
        window_days: int,
    ) -> CycleMetrics:
        """
        computes velocity recurrence and concentration metrics for a single directed cycle
        operates on the full graph to capture all parallel edges between cycle nodes
        """
        pairs = [(cycle[i], cycle[(i + 1) % len(cycle)]) for i in range(len(cycle))]

        cycle_flow = 0.0
        per_pair_days: list[set] = []

        for src, dst in pairs:
            edge_data = graph.get_edge_data(src, dst) or {}
            pair_days: set = set()
            for _, attrs in edge_data.items():
                amount = attrs.get("amount", 0.0)
                cycle_flow += amount if amount else 0.0
                ts = attrs.get("timestamp")
                if ts is not None and hasattr(ts, "date"):
                    pair_days.add(ts.date())
            per_pair_days.append(pair_days)

        cycle_velocity = cycle_flow / max(window_days, 1)

        if per_pair_days:
            common_days: set = per_pair_days[0].copy()
            for day_set in per_pair_days[1:]:
                common_days = common_days & day_set
            cycle_recurrence = len(common_days)
        else:
            cycle_recurrence = 0

        participating = set(cycle)
        total_flow = 0.0
        for node in participating:
            for _, _, attrs in graph.out_edges(node, data=True):
                total_flow += attrs.get("amount", 0.0) or 0.0
            for _, _, attrs in graph.in_edges(node, data=True):
                total_flow += attrs.get("amount", 0.0) or 0.0

        amount_concentration = cycle_flow / max(total_flow, 1.0)

        return CycleMetrics(
            cycle_path=cycle,
            cycle_velocity=cycle_velocity,
            cycle_recurrence=cycle_recurrence,
            amount_concentration=amount_concentration,
        )

    def _flag_participants(
        self,
        cycles: list[list[str]],
        metrics: list[CycleMetrics],
    ) -> dict[str, FraudResult]:
        """
        aggregates per-cycle metrics to per-gstin fraud results
        confidence blends velocity and recurrence thresholds at equal weight
        """
        gstin_cycle_map: dict[str, list[tuple[list[str], CycleMetrics]]] = {}
        for cycle, metric in zip(cycles, metrics):
            for gstin in cycle:
                if gstin not in gstin_cycle_map:
                    gstin_cycle_map[gstin] = []
                gstin_cycle_map[gstin].append((cycle, metric))

        results: dict[str, FraudResult] = {}
        for gstin, pairs in gstin_cycle_map.items():
            participating_cycles = [c for c, _ in pairs]
            max_velocity = max(m.cycle_velocity for _, m in pairs)
            max_recurrence = max(m.cycle_recurrence for _, m in pairs)
            confidence = min(
                1.0,
                max_velocity / self.velocity_threshold * 0.5
                + min(max_recurrence / self.recurrence_threshold, 1.0) * 0.5,
            )
            results[gstin] = FraudResult(
                gstin=gstin,
                fraud_ring_flag=confidence > 0.5,
                fraud_confidence=confidence,
                cycle_velocity=max_velocity,
                cycle_recurrence=float(max_recurrence),
                participating_cycles=participating_cycles,
            )
        return results

    def _cleanup_subgraph(self, scc_graph: nx.MultiDiGraph) -> None:
        """
        clears scc subgraph internals deletes local reference and triggers gc
        prevents multigraph memory accumulation across large scc sets
        """
        scc_graph.clear()
        del scc_graph
        gc.collect()


def merge_fraud_into_features(
    fraud_results: dict[str, FraudResult],
    features: list[EngineeredFeatureVector],
) -> list[EngineeredFeatureVector]:
    """
    merges fraud detection results into feature vectors
    overwrites fraud fields in place for flagged gstins
    returns updated feature vector list
    """
    for fv in features:
        result = fraud_results.get(fv.gstin)
        if result is not None:
            fv.fraud_ring_flag = result.fraud_ring_flag
            fv.fraud_confidence = result.fraud_confidence
            fv.cycle_velocity = result.cycle_velocity
            fv.cycle_recurrence = float(result.cycle_recurrence)
    return features
