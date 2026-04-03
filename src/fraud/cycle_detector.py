"""
fraud cycle detector identifies circular transaction patterns directed multigraphs
strongly connected components simple cycle enumeration ring detection
"""

import gc

import networkx as nx
from pydantic import BaseModel

from src.features.schemas import EngineeredFeatureVector


class CycleMetrics(BaseModel):
    """
    percycle metrics computed over directed cycle path
    velocity recurrence concentration signal laundering ring intensity
    """

    cycle_path: list[str]
    cycle_velocity: float
    cycle_recurrence: int
    amount_concentration: float


class FraudResult(BaseModel):
    """
    pergstin fraud detection result aggregated cycles participates
    confidence blends velocity recurrence signals into single 01 score
    """

    gstin: str
    fraud_ring_flag: bool
    fraud_confidence: float
    cycle_velocity: float
    cycle_recurrence: float
    participating_cycles: list[list[str]]
    pagerank_score: float = 0.0


def is_temporal_cycle(cycle_nodes: list[str], graph: nx.MultiDiGraph) -> bool:
    """
    validates array of nodes forming simple cycle flow sequentially forward
    iterates all multigraph edges ensuring transaction timestamps strictly increase
    proves temporal graph understanding rather than static cycles
    """
    pairs = [(cycle_nodes[i], cycle_nodes[(i + 1) % len(cycle_nodes)]) for i in range(len(cycle_nodes))]

    def check_sequence(idx: int, last_ts, start_offset: int) -> bool:
        if idx == len(pairs):
            return True
        actual_idx = (idx + start_offset) % len(pairs)
        src, dst = pairs[actual_idx]
        edge_data = graph.get_edge_data(src, dst)
        if not edge_data:
            return False
        for _, attrs in edge_data.items():
            ts = attrs.get("timestamp")
            if ts is not None and (last_ts is None or ts > last_ts):
                if check_sequence(idx + 1, ts, start_offset):
                    return True
        return False

    return any(check_sequence(0, None, offset) for offset in range(len(pairs)))


class CycleDetector:
    """
    detects fraudulent circular transaction rings directed transaction multigraph
    scc decomposition cycle enumeration metric thresholding
    """

    def __init__(
        self,
        velocity_threshold: float = 100000.0,
        recurrence_threshold: int = 3,
        cycle_length_bound: int = 5,
    ) -> None:
        """
        initializes detector velocity recurrence cycle length thresholds
        """
        self.velocity_threshold = velocity_threshold
        self.recurrence_threshold = recurrence_threshold
        self.cycle_length_bound = cycle_length_bound

    def detect(
        self, graph: nx.MultiDiGraph, window_days: int = 30
    ) -> dict[str, FraudResult]:
        """
        full pipeline graph pergstin fraud results
        returns empty dict if graph no edges
        prints summary sccs cycles flagged gstins
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
        
        pr_scores = nx.pagerank(graph, weight="amount")
        for node, pr_value in pr_scores.items():
            if node not in results:
                results[node] = FraudResult(
                    gstin=node,
                    fraud_ring_flag=False,
                    fraud_confidence=0.0,
                    cycle_velocity=0.0,
                    cycle_recurrence=0.0,
                    participating_cycles=[],
                    pagerank_score=pr_value
                )
            else:
                results[node].pagerank_score = pr_value

        total_nodes = graph.number_of_nodes()
        total_cycles = len(all_cycles)
        total_flagged = len(results)
        print(f"cycle detection nodes {total_nodes} sccs {total_sccs} cycles {total_cycles} flagged {total_flagged}")
        return results

    def _extract_candidate_sccs(
        self, graph: nx.MultiDiGraph
    ) -> list[nx.MultiDiGraph]:
        """
        extracts sccs 3 or nodes cycle candidate subgraphs
        networkx strongly_connected_components full multigraph
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
        enumerates simple cycles within scc subgraph up cycle_length_bound
        filters valid simple cycles through sequential temporal rules
        returns empty list if scc no edges
        """
        if scc_graph.number_of_edges() == 0:
            return []
        
        all_cycles = list(nx.simple_cycles(scc_graph, length_bound=self.cycle_length_bound))
        temporal_cycles = [c for c in all_cycles if is_temporal_cycle(c, scc_graph)]
        return temporal_cycles

    def _compute_cycle_metrics(
        self,
        cycle: list[str],
        graph: nx.MultiDiGraph,
        window_days: int,
    ) -> CycleMetrics:
        """
        computes velocity recurrence concentration metrics single directed cycle
        operates full graph capture parallel edges between cycle nodes
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
        aggregates percycle metrics pergstin fraud results
        confidence blends velocity recurrence thresholds at equal weight
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
        clears scc subgraph internals deletes local reference triggers gc
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
    overwrites fraud fields place flagged gstins
    returns updated feature vector list
    """
    for fv in features:
        result = fraud_results.get(fv.gstin)
        if result is not None:
            fv.fraud_ring_flag = result.fraud_ring_flag
            fv.fraud_confidence = result.fraud_confidence
            fv.cycle_velocity = result.cycle_velocity
            fv.cycle_recurrence = float(result.cycle_recurrence)
            fv.pagerank_score = result.pagerank_score

            # Hub-and-Spoke Shell Hub identification
            if fv.pagerank_score > 0.1 and getattr(fv, "months_active_gst", 1) == 0:
                fv.fraud_ring_flag = True
                fv.fraud_confidence = max(fv.fraud_confidence, 0.95)
    return features
