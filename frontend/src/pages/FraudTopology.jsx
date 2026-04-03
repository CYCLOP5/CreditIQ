import React from 'react';

/** Abbreviate a GSTIN for display inside a small node circle. */
function abbrev(gstin) {
  if (!gstin) return '?';
  if (gstin.length <= 8) return gstin;
  return `${gstin.slice(0, 4)}…${gstin.slice(-3)}`;
}

// ---------------------------------------------------------------------------
// Circular SVG layout — no external library required.
//
// Nodes are placed on a regular polygon inscribed in a circle of `RING_R`.
// Edges are drawn as directed lines with arrowhead markers.
// Fraudulent nodes are coloured red; non-fraudulent nodes are grey.
// ---------------------------------------------------------------------------

const SVG_SIZE = 520;
const CX = SVG_SIZE / 2;
const CY = SVG_SIZE / 2;
const RING_R = 170;      // radius of the circular layout
const NODE_R = 30;       // radius of each node circle

function computePositions(nodes) {
  const n = nodes.length;
  return nodes.map((node, i) => {
    // Start at the top (−π/2) and distribute evenly
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return {
      ...node,
      x: CX + RING_R * Math.cos(angle),
      y: CY + RING_R * Math.sin(angle),
    };
  });
}

function CircularGraph({ nodes, edges }) {
  if (nodes.length === 0) {
    return (
      <p className="page-subheading left">No node data is available for this fraud ring.</p>
    );
  }

  const positioned = computePositions(nodes);
  const byGstin = Object.fromEntries(positioned.map((n) => [n.gstin, n]));

  return (
    <svg
      viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
      width="100%"
      style={{ maxWidth: SVG_SIZE, margin: '0 auto', display: 'block' }}
      role="img"
      aria-label="Fraud ring topology graph"
    >
      <defs>
        {/* Arrowhead for non-fraud edges */}
        <marker
          id="arrow-grey"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="var(--color-grey-400)" />
        </marker>

        {/* Arrowhead for fraud-adjacent edges */}
        <marker
          id="arrow-red"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="var(--color-danger)" />
        </marker>
      </defs>

      {/* ---------- Edges ---------- */}
      {edges.map((edge, i) => {
        const src = byGstin[edge.source];
        const dst = byGstin[edge.target];
        if (!src || !dst || edge.source === edge.target) return null;

        const dx = dst.x - src.x;
        const dy = dst.y - src.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const ux = dx / len;
        const uy = dy / len;

        // Shorten the line so it starts/ends at the node circumference
        const x1 = src.x + ux * (NODE_R + 2);
        const y1 = src.y + uy * (NODE_R + 2);
        const x2 = dst.x - ux * (NODE_R + 12); // extra gap for arrowhead
        const y2 = dst.y - uy * (NODE_R + 12);

        const isFraud = src.is_fraudulent || dst.is_fraudulent;

        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={isFraud ? 'var(--color-danger)' : 'var(--color-grey-400)'}
            strokeWidth={isFraud ? 2 : 1.5}
            opacity={0.72}
            markerEnd={isFraud ? 'url(#arrow-red)' : 'url(#arrow-grey)'}
          />
        );
      })}

      {/* ---------- Nodes ---------- */}
      {positioned.map((node) => (
        <g key={node.gstin} aria-label={`GSTIN ${node.gstin}`}>
          <circle
            cx={node.x}
            cy={node.y}
            r={NODE_R}
            fill={node.is_fraudulent ? 'var(--color-danger-bg)' : 'var(--color-grey-100)'}
            stroke={node.is_fraudulent ? 'var(--color-danger)' : 'var(--color-grey-400)'}
            strokeWidth={node.is_fraudulent ? 2.5 : 1.5}
          />
          <text
            x={node.x}
            y={node.y + 4}
            textAnchor="middle"
            fontSize={9.5}
            fill={node.is_fraudulent ? 'var(--color-danger)' : 'var(--color-grey-600)'}
            fontFamily="DM Mono, monospace"
          >
            {abbrev(node.gstin)}
          </text>
          {/* Fraud marker badge */}
          {node.is_fraudulent && (
            <text
              x={node.x + NODE_R - 4}
              y={node.y - NODE_R + 8}
              textAnchor="middle"
              fontSize={12}
              aria-label="Fraudulent"
            >
              ⚠
            </text>
          )}
        </g>
      ))}

      {/* Centre label when only 1 node */}
      {positioned.length === 1 && (
        <text
          x={CX}
          y={CY + NODE_R + 22}
          textAnchor="middle"
          fontSize={12}
          fill="var(--color-grey-600)"
        >
          (no ring edges — single flagged node)
        </text>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

function GraphLegend() {
  return (
    <div className="fraud-graph-legend">
      <span className="fraud-legend-item">
        <span className="fraud-legend-node fraud-legend-node-red" /> Fraudulent GSTIN
      </span>
      <span className="fraud-legend-item">
        <span className="fraud-legend-node fraud-legend-node-grey" /> Other GSTIN in ring
      </span>
      <span className="fraud-legend-item">
        <span className="fraud-legend-arrow" /> Directed transaction
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="empty-state-card surface-card">
      <div className="empty-state-icon">🕸</div>
      <div className="empty-state-title">No data yet</div>
      <p className="empty-state-body">
        Run a <strong>Score Lookup</strong> first to load fraud topology for the
        scored GSTIN.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main exported content component
// ---------------------------------------------------------------------------

export default function FraudTopologyContent({ result }) {
  if (!result) {
    return (
      <div className="page-stack">
        <div>
          <h1 className="page-heading">Fraud Topology</h1>
        </div>
        <EmptyState />
      </div>
    );
  }

  if (!result.fraud_flag) {
    return (
      <div className="page-stack">
        <div>
          <h1 className="page-heading">Fraud Topology</h1>
        </div>
        <div className="surface-card fraud-clean-card">
          <div className="fraud-clean-icon">✅</div>
          <div className="fraud-clean-title">No fraud patterns detected</div>
          <p className="fraud-clean-body">
            No circular transaction rings or suspicious patterns were identified
            for GSTIN{' '}
            <span className="mono-text">{result.gstin}</span>.
          </p>
        </div>
      </div>
    );
  }

  // Parse fraud_details — expected shape: { nodes: [...], edges: [...] }
  const details = result.fraud_details;
  const hasGraph =
    details &&
    typeof details === 'object' &&
    (Array.isArray(details.nodes) || Array.isArray(details.edges));

  // Fall back to a single node representing the flagged GSTIN
  const nodes = hasGraph
    ? details.nodes || []
    : [{ gstin: result.gstin, is_fraudulent: true }];
  const edges = hasGraph ? details.edges || [] : [];

  return (
    <div className="page-stack">
      <div>
        <h1 className="page-heading">Fraud Topology</h1>
        <p className="page-subheading left">
          Circular transaction ring detected for GSTIN{' '}
          <span className="mono-text">{result.gstin}</span>. Red nodes are
          flagged entities; arrows show the direction of suspicious transactions.
        </p>
      </div>

      {/* Warning banner */}
      <div className="fraud-alert-banner" role="alert">
        <span className="fraud-alert-icon">⚠</span>
        <span>
          <strong>Fraud flag active</strong> — this GSTIN is associated with a
          suspicious circular transaction network.
        </span>
      </div>

      {/* Graph card */}
      <div className="surface-card">
        <div className="section-label">
          Transaction Ring — {nodes.length} node{nodes.length !== 1 ? 's' : ''},{' '}
          {edges.length} edge{edges.length !== 1 ? 's' : ''}
        </div>
        <CircularGraph nodes={nodes} edges={edges} />
        <GraphLegend />
      </div>

      {/* Raw details dump (only when fraud_details exists but is not a graph object) */}
      {details && !hasGraph && (
        <div className="surface-card">
          <div className="section-label">Raw Fraud Details</div>
          <pre className="fraud-details-pre">
            {JSON.stringify(details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
