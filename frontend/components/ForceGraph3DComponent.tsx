"use client";

import { useEffect, useRef } from "react";

interface GraphNode {
  id: string;
  flagged?: boolean;
  label?: string;
  group?: string;
  [key: string]: unknown;
}

interface GraphEdge {
  source: string;
  target: string;
  weight?: number;
  [key: string]: unknown;
}

interface ForceGraph3DProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  height?: number;
  onNodeClick?: (id: string) => void;
}

export default function ForceGraph3DComponent({
  nodes,
  edges,
  height = 560,
  onNodeClick,
}: ForceGraph3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    let localGraph: any = null;
    let ro: ResizeObserver | null = null;

    const timer = setTimeout(() => {
      import("3d-force-graph")
        .then(({ default: ForceGraph3D }) => {
          if (!containerRef.current) return;

          const width = containerRef.current.clientWidth || 800;
          const targetHeight = height || 560;

          const initialNodes = nodes.map(n => ({ ...n }));
          const initialLinks = edges.map(e => ({ source: e.source, target: e.target, weight: e.weight || 1 }));

          console.log("[ForceGraph3D] Initializing with real nodes:", nodes.length);

          const graph = (ForceGraph3D as any)()(containerRef.current)
            .width(width)
            .height(targetHeight)
            .backgroundColor("#010409")
            .showNavInfo(true)
            .graphData({
              nodes: initialNodes,
              links: initialLinks,
            })
            .nodeColor((node: any) =>
              node.flagged ? "#ff3333" : "#00f5d4"
            )
            .nodeRelSize(9)
            .nodeResolution(24)
            .nodeLabel((node: any) => `<div style="color:white; background:#161b22; padding:8px 12px; border-radius:8px; border: 1px solid #30363d; font-size:14px; font-weight:bold;">${node.label || node.id}</div>`)
            .nodeOpacity(1)
            .linkColor(() => "rgba(0, 245, 212, 0.5)")
            .linkWidth(3)
            .linkOpacity(0.6)
            .linkDirectionalParticles(5)
            .linkDirectionalParticleWidth(3.5)
            .linkDirectionalParticleSpeed(0.01)
            .linkDirectionalParticleColor(() => "#ffffff")
            .onNodeClick((node: any) => {
              if (onNodeClick) onNodeClick(node.id as string);
              const distance = 250;
              const distRatio = 1 + distance / Math.hypot(node.x || 1, node.y || 1, node.z || 1);
              graph.cameraPosition(
                { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
                node as any,
                800
              );
            });

          graphRef.current = graph;
          localGraph = graph;

          ro = new ResizeObserver(() => {
            if (containerRef.current && graph) {
              const newWidth = containerRef.current.clientWidth;
              if (newWidth > 0) graph.width(newWidth);
            }
          });
          ro.observe(containerRef.current);

          requestAnimationFrame(() => {
            if (graph) graph.cameraPosition({ z: 600 });
          });
        })
        .catch((err) => {
          console.error("[ForceGraph3D] Failed to load library:", err);
        });
    }, 200);

    return () => {
      clearTimeout(timer);
      if (ro) ro.disconnect();
      if (localGraph) {
        try {
          if (localGraph._destructor) localGraph._destructor();
        } catch (e) {}
      }
      if (containerRef.current) containerRef.current.innerHTML = "";
      graphRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!graphRef.current || nodes.length === 0) return;
    graphRef.current.graphData({
      nodes: nodes.map((n) => ({ ...n })),
      links: edges.map((e) => ({ source: e.source, target: e.target, weight: e.weight || 1 })),
    });
  }, [nodes, edges]);

  return (
    <div
      ref={containerRef}
      style={{ 
        height, 
        width: "100%", 
        cursor: "grab", 
        position: "relative",
        zIndex: 1,
        background: "#010409",
        overflow: "hidden"
      }}
    />
  );
}
