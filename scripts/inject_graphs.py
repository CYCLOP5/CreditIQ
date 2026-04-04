import polars as pl
from pathlib import Path
import glob
from src.fraud.graph_builder import FraudGraphBuilder, upi_edges_from_transactions

def build_graphs():
    builder = FraudGraphBuilder()
    builder.edge_dir.mkdir(parents=True, exist_ok=True)
    
    upi_files = glob.glob("data/raw/upi_transactions_chunk_*.parquet")
    if not upi_files:
        print("No upi files found!")
        return

    print("loading upi data...")
    df = pl.concat([pl.read_parquet(f) for f in upi_files])
    
    print("converting to edge list...")
    edges_df = upi_edges_from_transactions(df)
    
    print(f"saving {len(edges_df)} edges...")
    builder.save_edges(edges_df, "20260404")
    
    print("graph building complete.")

if __name__ == "__main__":
    build_graphs()
