import polars as pl
import networkx as nx

df = pl.read_parquet('data/graphs/edges_20260404.parquet')
G = nx.MultiDiGraph()
for row in df.iter_rows(named=True):
    G.add_edge(row["from_gstin"], row["to_gstin"])

print("Nodes:", G.number_of_nodes(), "Edges:", G.number_of_edges())
sccs = list(nx.strongly_connected_components(G))
sccs_sizes = [len(c) for c in sccs if len(c) >= 3]
print("SCC sizes >= 3:", sccs_sizes)
