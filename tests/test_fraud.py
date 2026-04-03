"""
unit tests fraud graph builder cycle detector
validates ring detection edge filtering incremental graph updates fraud merging
"""

from datetime import datetime, timedelta

import networkx as nx
import polars as pl
import pytest

from src.features.schemas import EngineeredFeatureVector
from src.fraud.cycle_detector import CycleDetector, FraudResult, merge_fraud_into_features
from src.fraud.graph_builder import FraudGraphBuilder, upi_edges_from_transactions


def make_circular_graph(
    nodes: list[str], amount: float = 50000.0, n_repeats: int = 5
) -> nx.MultiDiGraph:
    """
    builds directed multigraph circular edges abca repeated n times
    timestamps spaced 6 hours apart
    """
    graph = nx.MultiDiGraph()
    base_ts = datetime(2024, 1, 1)
    for i in range(n_repeats):
        ts = base_ts + timedelta(hours=i * 6)
        for idx in range(len(nodes)):
            from_node = nodes[idx]
            to_node = nodes[(idx + 1) % len(nodes)]
            graph.add_edge(
                from_node,
                to_node,
                amount=amount,
                timestamp=ts,
                txn_type="upi",
                edge_id=f"{from_node}_{to_node}_{i}",
            )
    return graph


def test_cycle_detection_finds_simple_ring() -> None:
    """
    detector finds 3node circular ring injected directly
    """
    nodes = ["27A0000A1Z5", "27B0000B1Z5", "27C0000C1Z5"]
    graph = make_circular_graph(nodes, amount=50000.0, n_repeats=10)

    detector = CycleDetector(velocity_threshold=100000.0, recurrence_threshold=3)
    results = detector.detect(graph, window_days=30)

    for gstin in nodes:
        assert gstin in results
        assert results[gstin].fraud_ring_flag == True


def test_cycle_detection_no_cycle_in_dag() -> None:
    """
    detector returns no fraud flags directed acyclic graph
    """
    graph = nx.MultiDiGraph()
    base_ts = datetime(2024, 1, 1)
    graph.add_edge(
        "27A0000A1Z5",
        "27B0000B1Z5",
        amount=50000.0,
        timestamp=base_ts,
        txn_type="upi",
        edge_id="A_B_0",
    )
    graph.add_edge(
        "27B0000B1Z5",
        "27C0000C1Z5",
        amount=50000.0,
        timestamp=base_ts + timedelta(hours=6),
        txn_type="upi",
        edge_id="B_C_0",
    )

    detector = CycleDetector(velocity_threshold=100000.0, recurrence_threshold=3)
    results = detector.detect(graph, window_days=30)

    assert all(not v.fraud_ring_flag for v in results.values())


def test_cycle_detection_4_node_ring() -> None:
    """
    detector finds 4node ring within length bound 5
    """
    nodes = ["27A0000A1Z5", "27B0000B1Z5", "27C0000C1Z5", "27D0000D1Z5"]
    graph = make_circular_graph(nodes, amount=50000.0, n_repeats=10)

    detector = CycleDetector(velocity_threshold=100000.0, recurrence_threshold=3)
    results = detector.detect(graph, window_days=30)

    for gstin in nodes:
        assert gstin in results
        assert results[gstin].fraud_ring_flag == True


def test_upi_edges_from_transactions_filters_correctly() -> None:
    """
    only outbound success transactions become graph edges
    """
    base_ts = datetime(2024, 1, 1)
    upi_df = pl.DataFrame(
        {
            "gstin": ["27A0000A1Z5", "27B0000B1Z5", "27C0000C1Z5"],
            "vpa": ["27A0000A1Z5@upi", "27B0000B1Z5@upi", "27C0000C1Z5@upi"],
            "timestamp": [
                base_ts,
                base_ts + timedelta(hours=1),
                base_ts + timedelta(hours=2),
            ],
            "amount": [10000.0, 5000.0, 8000.0],
            "direction": ["outbound", "inbound", "outbound"],
            "counterparty_vpa": ["vendor1@upi", "customer1@upi", "vendor2@upi"],
            "txn_type": ["p2p", "p2m", "p2p"],
            "status": ["success", "success", "failed_funds"],
        }
    ).with_columns(pl.col("timestamp").cast(pl.Datetime("us")))

    result = upi_edges_from_transactions(upi_df)

    assert result.height == 1


def test_graph_builder_incremental_add() -> None:
    """
    add_edges_incremental appends without losing existing edges
    """
    base_ts = datetime(2024, 1, 1)
    builder = FraudGraphBuilder(edge_dir="/tmp/test_graph_builder_edges")

    initial_edges = pl.DataFrame(
        {
            "from_gstin": ["27A0000A1Z5", "27B0000B1Z5"],
            "to_gstin": ["27B0000B1Z5", "27C0000C1Z5"],
            "amount": [50000.0, 50000.0],
            "timestamp": [base_ts, base_ts + timedelta(hours=6)],
            "txn_type": ["upi", "upi"],
            "edge_id": ["A_B_0", "B_C_0"],
        }
    ).with_columns(pl.col("timestamp").cast(pl.Datetime("us")))

    graph = builder.build_from_dataframe(initial_edges)

    new_edge = pl.DataFrame(
        {
            "from_gstin": ["27C0000C1Z5"],
            "to_gstin": ["27A0000A1Z5"],
            "amount": [50000.0],
            "timestamp": [base_ts + timedelta(hours=12)],
            "txn_type": ["upi"],
            "edge_id": ["C_A_0"],
        }
    ).with_columns(pl.col("timestamp").cast(pl.Datetime("us")))

    updated_graph = builder.add_edges_incremental(graph, new_edge)

    assert updated_graph.number_of_edges() == 3


def test_merge_fraud_into_features() -> None:
    """
    merge function updates fraud fields feature vectors matching fraud results
    """
    gstin = "27TEST0000T1Z5"

    fv = EngineeredFeatureVector(
        gstin=gstin,
        computed_at=datetime(2024, 1, 1),
        gst_7d_value=0.0,
        gst_30d_value=0.0,
        gst_90d_value=0.0,
        upi_7d_inbound_count=0.0,
        upi_30d_inbound_count=0.0,
        upi_90d_inbound_count=0.0,
        ewb_7d_value=0.0,
        ewb_30d_value=0.0,
        ewb_90d_value=0.0,
        gst_30d_unique_buyers=0.0,
        upi_30d_unique_counterparties=0.0,
        gst_mean_filing_interval_days=0.0,
        gst_std_filing_interval_days=0.0,
        upi_inbound_std_interval_days=0.0,
        ewb_median_interval_days=0.0,
        gst_filing_delay_trend=0.0,
        upi_inbound_outbound_ratio_30d=0.0,
        gst_revenue_cv_90d=0.0,
        ewb_volume_growth_mom=0.0,
        filing_compliance_rate=0.0,
        upi_hhi_30d=0.0,
        ewb_distance_per_value_ratio=0.0,
        invoice_to_ewb_lag_hours_median=0.0,
        upi_p2m_ratio_30d=0.0,
        upi_outbound_failure_rate=0.0,
        months_active_gst=0,
        data_completeness_score=0.0,
        longest_gap_days=0,
        data_maturity_flag=0.0,
    )

    fraud_result = FraudResult(
        gstin=gstin,
        fraud_ring_flag=True,
        fraud_confidence=0.8,
        cycle_velocity=5000.0,
        cycle_recurrence=4.0,
        participating_cycles=[[gstin, "27OTHER000O1Z5"]],
    )

    updated = merge_fraud_into_features({gstin: fraud_result}, [fv])

    assert updated[0].fraud_ring_flag == True
    assert updated[0].fraud_confidence == pytest.approx(0.8)


def test_cycle_detector_confidence_high_velocity() -> None:
    """
    fraud confidence high high velocity circular transactions
    """
    nodes = ["27A0000A1Z5", "27B0000B1Z5", "27C0000C1Z5"]
    graph = make_circular_graph(nodes, amount=10_000_000.0, n_repeats=10)

    detector = CycleDetector(velocity_threshold=100000.0, recurrence_threshold=3)
    results = detector.detect(graph, window_days=30)

    for gstin in nodes:
        assert gstin in results
        assert results[gstin].fraud_confidence > 0.5


def test_partition_by_time_window() -> None:
    """
    partition function splits edges into correct daywindowed batches
    """
    base_ts = datetime(2024, 1, 1)
    n = 10
    edges_df = pl.DataFrame(
        {
            "from_gstin": ["27A0000A1Z5"] * n,
            "to_gstin": ["27B0000B1Z5"] * n,
            "amount": [50000.0] * n,
            "timestamp": [base_ts + timedelta(days=i * 2) for i in range(n)],
            "txn_type": ["upi"] * n,
            "edge_id": [f"A_B_{i}" for i in range(n)],
        }
    ).with_columns(pl.col("timestamp").cast(pl.Datetime("us")))

    builder = FraudGraphBuilder(edge_dir="/tmp/test_partition_edges")
    partitions = builder.partition_by_time_window(edges_df, window_days=7)

    assert len(partitions) >= 2
    for partition in partitions:
        assert partition.height > 0
