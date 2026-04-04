"""
fraud graph builder constructs manages networkx directed multigraphs
parquet edge lists representing upi ewb transaction flows
supports incremental updates partitioned loading parquet persistence
"""

from datetime import timedelta
from pathlib import Path

import networkx as nx
import polars as pl


class FraudGraphBuilder:
    """
    builds manages directed multigraphs transaction edge lists
    supports incremental updates partitioned loading parquet persistence
    """

    def __init__(self, edge_dir: str = "data/graphs", max_nodes: int = 50000) -> None:
        """
        initializes builder edge storage directory node memory guard threshold
        """
        self.edge_dir = Path(edge_dir)
        self.max_nodes = max_nodes

    def build_from_parquet(self, date_from: str, date_to: str) -> nx.MultiDiGraph:
        """
        scans edge_dir parquet files within yyyymmdd date range inclusive
        concatenates qualifying frames delegates build_from_dataframe
        returns empty multigraph if no qualifying files found
        """
        frames = []
        for parquet_file in sorted(self.edge_dir.glob("edges_*.parquet")):
            stem = parquet_file.stem
            parts = stem.split("_", 1)
            if len(parts) < 2:
                continue
            date_str = parts[1]
            if date_from <= date_str <= date_to:
                frames.append(pl.read_parquet(parquet_file))
        if not frames:
            return nx.MultiDiGraph()
        combined = pl.concat(frames)
        return self.build_from_dataframe(combined)

    def build_from_dataframe(self, edges_df: pl.DataFrame) -> nx.MultiDiGraph:
        """
        constructs directed multigraph polars edge dataframe
        each row becomes directed edge amount timestamp txn_type edge_id attrs
        iter_rows named efficient attribute extraction
        """
        graph = nx.MultiDiGraph()
        for row in edges_df.iter_rows(named=True):
            graph.add_edge(
                row["from_gstin"],
                row["to_gstin"],
                amount=row["amount"],
                timestamp=row["timestamp"],
                txn_type=row["txn_type"],
                edge_id=row["edge_id"],
            )
        return graph

    def add_edges_incremental(
        self, graph: nx.MultiDiGraph, new_edges_df: pl.DataFrame
    ) -> nx.MultiDiGraph:
        """
        merges new edge dataframe into existing graph via temp multigraph
        preserves existing edges appends new parallel edges
        """
        temp_graph = self.build_from_dataframe(new_edges_df)
        graph.add_edges_from(temp_graph.edges(data=True))
        return graph

    def save_edges(self, edges_df: pl.DataFrame, date_str: str) -> None:
        """
        persists edge dataframe parquet at standard path convention
        creates parent directories if absent
        """
        self.edge_dir.mkdir(parents=True, exist_ok=True)
        path = self.edge_dir / f"edges_{date_str}.parquet"
        edges_df.write_parquet(path)

    def load_edges(self, date_str: str) -> pl.DataFrame | None:
        """
        reads edge parquet given yyyymmdd date string
        returns none if file not exist
        """
        path = self.edge_dir / f"edges_{date_str}.parquet"
        if not path.exists():
            return None
        return pl.read_parquet(path)

    def _check_node_limit(self, graph: nx.MultiDiGraph) -> bool:
        """
        returns true if graph node count exceeds max_nodes ceiling
        triggers partition strategy caller
        """
        return graph.number_of_nodes() > self.max_nodes

    def partition_by_time_window(
        self, edges_df: pl.DataFrame, window_days: int = 7
    ) -> list[pl.DataFrame]:
        """
        splits edge dataframe into sequential temporal partitions window_days duration
        sorts timestamp before partitioning skips empty partitions
        """
        sorted_df = edges_df.sort("timestamp")
        if sorted_df.is_empty():
            return []
        min_ts = sorted_df["timestamp"].min()
        max_ts = sorted_df["timestamp"].max()
        partitions: list[pl.DataFrame] = []
        window_start = min_ts
        delta = timedelta(days=window_days)
        while window_start <= max_ts:
            window_end = window_start + delta
            partition = sorted_df.filter(
                (pl.col("timestamp") >= window_start) & (pl.col("timestamp") < window_end)
            )
            if not partition.is_empty():
                partitions.append(partition)
            window_start = window_end
        return partitions


def upi_edges_from_transactions(upi_df: pl.DataFrame, profiles_df: pl.DataFrame = None) -> pl.DataFrame:
    """
    converts upi transaction dataframe edge list format
    outbound transactions only produce directed edges gstin counterparty
    filters direction outbound status success before projection
    """
    filtered = upi_df.filter(
        (pl.col("direction") == "outbound") & (pl.col("status") == "success")
    )
    
    if profiles_df is not None:
        # Map counterparty_vpa to its actual GSTIN
        vpa_to_gstin = profiles_df.select([pl.col("vpa"), pl.col("gstin").alias("to_gstin")])
        filtered = filtered.join(vpa_to_gstin, left_on="counterparty_vpa", right_on="vpa", how="left")
        # For external VPAs not in our profiles, just keep the VPA string or fill nulls
        filtered = filtered.with_columns(
            pl.coalesce(["to_gstin", "counterparty_vpa"]).alias("to_gstin")
        )
    else:
        filtered = filtered.with_columns(pl.col("counterparty_vpa").alias("to_gstin"))

    return filtered.select(
        [
            pl.col("gstin").alias("from_gstin"),
            pl.col("to_gstin"),
            pl.col("amount"),
            pl.col("timestamp"),
            pl.lit("upi").alias("txn_type"),
            (
                pl.col("gstin")
                + pl.lit("_")
                + pl.col("to_gstin")
                + pl.lit("_")
                + pl.col("timestamp").cast(pl.Utf8)
            ).alias("edge_id"),
        ]
    )
    return filtered.select(
        [
            pl.col("gstin").alias("from_gstin"),
            pl.col("counterparty_vpa").alias("to_gstin"),
            pl.col("amount"),
            pl.col("timestamp"),
            pl.lit("upi").alias("txn_type"),
            (
                pl.col("gstin")
                + pl.lit("_")
                + pl.col("counterparty_vpa")
                + pl.lit("_")
                + pl.col("timestamp").cast(pl.Utf8)
            ).alias("edge_id"),
        ]
    )
