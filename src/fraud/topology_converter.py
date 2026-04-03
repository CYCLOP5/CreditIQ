"""
converts networkx digraph to json-serializable dict for frontend fraud topology viewer
node-link format with fraud annotation on nodes and amount on edges
"""

from __future__ import annotations

import networkx as nx


def graph_to_json(G: nx.DiGraph, fraud_gstins: set[str]) -> dict:
    """
    converts networkx digraph to node-link json for frontend
    nodes have id label fraud bool
    edges have source target amount timestamp
    """
    nodes: list[dict] = []
    for node_id in G.nodes():
        nodes.append({
            "id": str(node_id),
            "label": str(node_id),
            "fraud": str(node_id) in fraud_gstins,
        })

    edges: list[dict] = []
    for src, dst, data in G.edges(data=True):
        edge: dict = {
            "source": str(src),
            "target": str(dst),
            "amount": float(data.get("amount", 0.0) or 0.0),
        }
        ts = data.get("timestamp")
        if ts is not None:
            edge["timestamp"] = str(ts)
        edges.append(edge)

    return {"nodes": nodes, "edges": edges}


def multigraph_to_json(G: nx.MultiDiGraph, fraud_gstins: set[str]) -> dict:
    """
    converts networkx multidigraph to node-link json for frontend
    parallel edges collapsed to single edge with summed amount
    nodes have id label fraud bool
    edges have source target amount
    """
    nodes: list[dict] = []
    for node_id in G.nodes():
        nodes.append({
            "id": str(node_id),
            "label": str(node_id),
            "fraud": str(node_id) in fraud_gstins,
        })

    edge_map: dict[tuple[str, str], float] = {}
    for src, dst, data in G.edges(data=True):
        key = (str(src), str(dst))
        amount = float(data.get("amount", 0.0) or 0.0)
        edge_map[key] = edge_map.get(key, 0.0) + amount

    edges: list[dict] = [
        {"source": src, "target": dst, "amount": amount}
        for (src, dst), amount in edge_map.items()
    ]

    return {"nodes": nodes, "edges": edges}
