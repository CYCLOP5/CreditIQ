import React from 'react';

const MAX_FEATURES = 15;

/** Converts snake_case feature names to readable Title Case. */
function formatFeatureName(name) {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Formats a SHAP value with sign, 3 decimal places. */
function formatShapValue(v) {
  if (v > 0) return `+${v.toFixed(3)}`;
  return v.toFixed(3);
}

// ---------------------------------------------------------------------------
// SVG horizontal bar chart (diverging, centered on the zero line)
// Positive SHAP value  → bar grows RIGHT  → red/orange  (increases risk)
// Negative SHAP value  → bar grows LEFT   → green/blue  (decreases risk)
// ---------------------------------------------------------------------------

const SVG_WIDTH = 800;
const ROW_HEIGHT = 38;
const HEADER_HEIGHT = 36;
const LABEL_WIDTH = 220;   // left column: feature name
const VALUE_WIDTH = 80;    // right column: numeric value
const CHART_AREA = SVG_WIDTH - LABEL_WIDTH - VALUE_WIDTH;
const CENTER_X = LABEL_WIDTH + CHART_AREA / 2; // x position of the zero line
const MAX_HALF_BAR = CHART_AREA / 2 - 12;      // max bar half-width (px), with margin

function ShapSvgChart({ items }) {
  const maxAbs = Math.max(...items.map((d) => Math.abs(d.value)), 0.001);
  const svgHeight = HEADER_HEIGHT + items.length * ROW_HEIGHT + 8;

  return (
    <svg
      viewBox={`0 0 ${SVG_WIDTH} ${svgHeight}`}
      width="100%"
      role="img"
      aria-label="SHAP feature contribution waterfall chart"
      className="shap-svg"
    >
      {/* ---------- Column headers ---------- */}
      <text
        x={LABEL_WIDTH - 10}
        y={22}
        textAnchor="end"
        className="shap-header-text"
      >
        Feature
      </text>
      <text
        x={CENTER_X}
        y={22}
        textAnchor="middle"
        className="shap-header-text"
      >
        ← raises score &nbsp;&nbsp; lowers score →
      </text>
      <text
        x={SVG_WIDTH - VALUE_WIDTH + 8}
        y={22}
        textAnchor="start"
        className="shap-header-text"
      >
        SHAP
      </text>

      {/* ---------- Zero (centre) line ---------- */}
      <line
        x1={CENTER_X}
        y1={HEADER_HEIGHT}
        x2={CENTER_X}
        y2={svgHeight}
        stroke="var(--color-grey-300)"
        strokeWidth={1}
        strokeDasharray="4 3"
      />

      {/* ---------- Rows ---------- */}
      {items.map((item, i) => {
        const rowY = HEADER_HEIGHT + i * ROW_HEIGHT;
        const barHalfWidth = (Math.abs(item.value) / maxAbs) * MAX_HALF_BAR;
        const isPositive = item.value >= 0;

        // Positive → bar from centerX to the right (red)
        // Negative → bar from (centerX - width) to centerX (green)
        const barX = isPositive ? CENTER_X : CENTER_X - barHalfWidth;
        const barColor = isPositive
          ? 'var(--color-danger)'      // orange-red: increases risk
          : 'var(--color-success)';    // green: decreases risk

        return (
          <g key={item.feature}>
            {/* Alternating row tint */}
            {i % 2 === 0 && (
              <rect
                x={LABEL_WIDTH}
                y={rowY}
                width={CHART_AREA}
                height={ROW_HEIGHT}
                fill="var(--color-grey-50)"
              />
            )}

            {/* Feature name label */}
            <text
              x={LABEL_WIDTH - 10}
              y={rowY + ROW_HEIGHT / 2 + 5}
              textAnchor="end"
              className="shap-feature-label"
            >
              {formatFeatureName(item.feature)}
            </text>

            {/* Diverging bar */}
            {barHalfWidth > 0 && (
              <rect
                x={barX}
                y={rowY + 9}
                width={barHalfWidth}
                height={ROW_HEIGHT - 18}
                rx={3}
                fill={barColor}
                opacity={0.82}
              />
            )}

            {/* SHAP numeric value */}
            <text
              x={SVG_WIDTH - VALUE_WIDTH + 8}
              y={rowY + ROW_HEIGHT / 2 + 5}
              textAnchor="start"
              className={`shap-value-text ${isPositive ? 'shap-positive' : 'shap-negative'}`}
            >
              {formatShapValue(item.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="empty-state-card surface-card">
      <div className="empty-state-icon">📊</div>
      <div className="empty-state-title">No score data yet</div>
      <p className="empty-state-body">
        Run a <strong>Score Lookup</strong> first, then return here to see how each
        signal contributed to the model's output.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main exported content component
// ---------------------------------------------------------------------------

export default function FeatureContributionsContent({ result }) {
  if (!result) {
    return (
      <div className="page-stack">
        <div>
          <h1 className="page-heading">Feature Contributions</h1>
        </div>
        <EmptyState />
      </div>
    );
  }

  const waterfall = result.shap_waterfall || [];

  // Sort descending by absolute SHAP magnitude, take top N
  const sorted = [...waterfall]
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, MAX_FEATURES);

  return (
    <div className="page-stack">
      <div>
        <h1 className="page-heading">Feature Contributions</h1>
        <p className="page-subheading left">
          SHAP waterfall for GSTIN{' '}
          <span className="mono-text">{result.gstin}</span> — each bar shows how
          much a signal pushed the score away from the base score. Green bars
          raise the score; red bars lower it.
        </p>
      </div>

      {waterfall.length === 0 ? (
        <div className="surface-card">
          <p className="page-subheading left">
            No SHAP data was returned by the model for this result.
          </p>
        </div>
      ) : (
        <div className="surface-card">
          <div className="section-label">
            Top {sorted.length} features by SHAP magnitude (base score:{' '}
            {waterfall[0]?.base_value != null
              ? waterfall[0].base_value.toFixed(3)
              : '—'}
            )
          </div>

          <div className="shap-chart-wrap">
            <ShapSvgChart items={sorted} />
          </div>

          {/* Legend */}
          <div className="shap-legend">
            <span className="shap-legend-item">
              <span className="shap-legend-dot shap-legend-negative" />
              Negative SHAP — decreases risk (raises score)
            </span>
            <span className="shap-legend-item">
              <span className="shap-legend-dot shap-legend-positive" />
              Positive SHAP — increases risk (lowers score)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
