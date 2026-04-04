import polars as pl
from pathlib import Path
import glob
import networkx as nx
from src.fraud.graph_builder import FraudGraphBuilder
from src.fraud.cycle_detector import CycleDetector

def run():
    print("Loading graphs...")
    edge_files = sorted(Path("data/graphs").glob("edges_*.parquet"))
    if not edge_files:
        print("No edges!")
        return

    frames = [pl.read_parquet(str(f)) for f in edge_files]
    combined = pl.concat(frames)
    builder = FraudGraphBuilder(edge_dir="data/graphs")
    graph = builder.build_from_dataframe(combined)
    
    print(f"Graph loaded with {graph.number_of_edges()} edges")
    
    detector = CycleDetector()
    fraud_results = detector.detect(graph)
    print(f"Graph detection complete. Found fraud results: {len(fraud_results)}")
    
    feature_files = glob.glob("data/features/gstin=*/features.parquet")
    print(f"Updating features for {len(feature_files)} GSTINs")
    
    for f in feature_files:
        df = pl.read_parquet(f)
        gstin = df["gstin"][0]
        result = fraud_results.get(gstin)
        if result:
            df = df.with_columns([
                pl.lit(result.fraud_ring_flag).alias("fraud_ring_flag"),
                pl.lit(result.fraud_confidence).alias("fraud_confidence"),
                pl.lit(result.cycle_velocity).alias("cycle_velocity"),
                pl.lit(float(result.cycle_recurrence)).alias("cycle_recurrence"),
                pl.lit(result.pagerank_score).alias("pagerank_score"),
            ])
            # Hub-and-Spoke Shell Hub identification
            if result.pagerank_score > 0.1 and df["months_active_gst"][0] == 0:
                df = df.with_columns([pl.lit(True).alias("fraud_ring_flag")])
            df.write_parquet(f)
            
    print("Done generating fraud features.")

if __name__ == "__main__":
    run()
