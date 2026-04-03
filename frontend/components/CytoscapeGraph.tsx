"use client";
import { useEffect, useRef, useState, useCallback } from "react";

export interface GraphNode {
  id: string;
  label: string;
  flagged: boolean;
  total_volume_inr?: number;
}
export interface GraphEdge {
  source: string;
  target: string;
  tx_count: number;
  total_amount_inr: number;
}
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface CytoscapeGraphProps {
  data: GraphData;
  height?: number;
  highlightId?: string;
  onNodeClick?: (id: string) => void;
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

function useForceLayout(data: GraphData, width: number, height: number) {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    if (!data.nodes.length || !width || !height) return;

    const maxVol = Math.max(...data.nodes.map((n) => n.total_volume_inr || 1), 1);
    const nodes: SimNode[] = data.nodes.map((n, i) => {
      const angle = (i / data.nodes.length) * 2 * Math.PI;
      const r = Math.min(width, height) * 0.32;
      return {
        ...n,
        x: width / 2 + r * Math.cos(angle) + (Math.random() - 0.5) * 20,
        y: height / 2 + r * Math.sin(angle) + (Math.random() - 0.5) * 20,
        vx: 0,
        vy: 0,
        size: 16 + ((n.total_volume_inr || 0) / maxVol) * 24,
      };
    });

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const REPULSION = 2800;
    const SPRING_LENGTH = 110;
    const SPRING_K = 0.04;
    const DAMPING = 0.82;
    const CENTER_K = 0.012;
    const ITERATIONS = 220;

    for (let iter = 0; iter < ITERATIONS; iter++) {
      // Repulsion between all nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = REPULSION / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }

      // Spring attraction on edges
      for (const edge of data.edges) {
        const a = nodeMap.get(edge.source);
        const b = nodeMap.get(edge.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const stretch = dist - SPRING_LENGTH;
        const force = SPRING_K * stretch;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }

      // Gravity towards center
      for (const n of nodes) {
        n.vx += (width / 2 - n.x) * CENTER_K;
        n.vy += (height / 2 - n.y) * CENTER_K;
        n.vx *= DAMPING;
        n.vy *= DAMPING;
        n.x += n.vx;
        n.y += n.vy;
        // Clamp
        n.x = Math.max(n.size, Math.min(width - n.size, n.x));
        n.y = Math.max(n.size, Math.min(height - n.size, n.y));
      }
    }

    const result: Record<string, { x: number; y: number }> = {};
    for (const n of nodes) result[n.id] = { x: n.x, y: n.y };
    setPositions(result);
  }, [data, width, height]);

  return positions;
}

export function CytoscapeGraph({
  data,
  height = 420,
  highlightId,
  onNodeClick,
}: CytoscapeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [selectedId, setSelectedId] = useState<string | null>(highlightId ?? null);

  useEffect(() => {
    setSelectedId(highlightId ?? null);
  }, [highlightId]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    ro.observe(containerRef.current);
    setWidth(containerRef.current.clientWidth || 600);
    return () => ro.disconnect();
  }, []);

  const positions = useForceLayout(data, width, height);

  const maxVol = Math.max(...data.nodes.map((n) => n.total_volume_inr || 1), 1);
  const maxTx = Math.max(...data.edges.map((e) => e.tx_count), 1);

  const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));

  const connectedIds = useCallback(
    (id: string): Set<string> => {
      const set = new Set<string>();
      for (const e of data.edges) {
        if (e.source === id) set.add(e.target);
        if (e.target === id) set.add(e.source);
      }
      return set;
    },
    [data.edges]
  );

  const neighbours = selectedId ? connectedIds(selectedId) : null;

  const handleNodeClick = (id: string) => {
    const next = selectedId === id ? null : id;
    setSelectedId(next);
    if (next) onNodeClick?.(next);
  };

  const isReady = Object.keys(positions).length === data.nodes.length && data.nodes.length > 0;

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height }}
      className="rounded-lg border border-border bg-slate-50 relative overflow-hidden select-none"
    >
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          {data.nodes.length === 0 ? "No graph data" : "Laying out graph…"}
        </div>
      )}
      {isReady && (
        <svg
          width={width}
          height={height}
          className="absolute inset-0"
          onClick={(e) => {
            if ((e.target as SVGElement).tagName === "svg") setSelectedId(null);
          }}
        >
          {/* Edges */}
          {data.edges.map((edge, i) => {
            const sp = positions[edge.source];
            const tp = positions[edge.target];
            if (!sp || !tp) return null;
            const strokeW = 1 + (edge.tx_count / maxTx) * 4;
            const isDimmed =
              selectedId !== null &&
              edge.source !== selectedId &&
              edge.target !== selectedId;
            const isHighlighted =
              selectedId !== null &&
              (edge.source === selectedId || edge.target === selectedId);
            return (
              <line
                key={`e${i}`}
                x1={sp.x}
                y1={sp.y}
                x2={tp.x}
                y2={tp.y}
                strokeWidth={strokeW}
                stroke={isHighlighted ? "#0c0861" : "#cbd5e1"}
                strokeOpacity={isDimmed ? 0.12 : isHighlighted ? 1 : 0.7}
              />
            );
          })}

          {/* Nodes */}
          {data.nodes.map((node) => {
            const pos = positions[node.id];
            if (!pos) return null;
            const nodeSize = 16 + ((node.total_volume_inr || 0) / maxVol) * 24;
            const isDimmed =
              selectedId !== null &&
              selectedId !== node.id &&
              !neighbours?.has(node.id);
            const isSelected = selectedId === node.id;
            const fill = node.flagged ? "#dc2626" : "#94a3b8";
            const stroke = isSelected ? "#0c0861" : node.flagged ? "#991b1b" : "#64748b";
            return (
              <g
                key={node.id}
                transform={`translate(${pos.x},${pos.y})`}
                style={{ cursor: "pointer", opacity: isDimmed ? 0.25 : 1 }}
                onClick={() => handleNodeClick(node.id)}
              >
                <circle
                  r={nodeSize / 2}
                  fill={isSelected ? (node.flagged ? "#dc2626" : "#0c0861") : fill}
                  stroke={stroke}
                  strokeWidth={isSelected ? 3 : 1.5}
                />
                <text
                  textAnchor="middle"
                  y={nodeSize / 2 + 12}
                  fontSize={9}
                  fill="#374151"
                  fontFamily="Inter, sans-serif"
                  style={{ pointerEvents: "none" }}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
