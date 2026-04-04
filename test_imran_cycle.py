from src.fraud.cycle_detector import CycleDetector
import networkx as nx
import polars as pl
from src.fraud.graph_builder import FraudGraphBuilder

df = pl.read_parquet('data/graphs/edges_20260404.parquet')
builder = FraudGraphBuilder()
G = builder.build_from_dataframe(df)

d = CycleDetector()
res = d.detect(G)

imran = "07AFDYP4721H7Z9"
r = res.get(imran)
print("Imran result:", r)
