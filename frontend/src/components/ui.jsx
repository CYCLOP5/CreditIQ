import React from 'react';

export function EyeIcon({ hidden }) {
  if (hidden) {
    return (
      <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 3l18 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        <path d="M10.58 10.58A3 3 0 0 0 13.42 13.42" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        <path d="M6.62 6.62C4.04 8.36 2.25 12 2.25 12s3.75 7.5 9.75 7.5c1.87 0 3.47-.38 4.84-1.03" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        <path d="M9.9 4.74A9.72 9.72 0 0 1 12 4.5c6 0 9.75 7.5 9.75 7.5a16.16 16.16 0 0 1-3.03 3.96" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.25 12s3.75-7.5 9.75-7.5S21.75 12 21.75 12 18 19.5 12 19.5 2.25 12 2.25 12Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.25" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg className="role-card-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 7.5V6.75A1.75 1.75 0 0 1 10.75 5h2.5A1.75 1.75 0 0 1 15 6.75v.75" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <rect x="3.75" y="7.5" width="16.5" height="11.25" rx="2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M3.75 12h16.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="role-card-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 19.5h15" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M7.5 15v-3" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M12 15V8.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M16.5 15v-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M6.75 15.75h1.5M11.25 15.75h1.5M15.75 15.75h1.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="role-card-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.75 18 6v5.25c0 4.08-2.58 7.74-6 9-3.42-1.26-6-4.92-6-9V6l6-2.25Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M9.25 12.25 11 14l3.75-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="role-card-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10.5 4.5h3l.42 2.03c.49.18.95.42 1.38.72l1.94-.68 1.5 2.6-1.55 1.29c.04.27.06.54.06.83s-.02.56-.06.83l1.55 1.29-1.5 2.6-1.94-.68c-.43.3-.89.54-1.38.72l-.42 2.03h-3l-.42-2.03a6.8 6.8 0 0 1-1.38-.72l-1.94.68-1.5-2.6 1.55-1.29A5.9 5.9 0 0 1 6.75 12c0-.29.02-.56.06-.83L5.26 9.88l1.5-2.6 1.94.68c.43-.3.89-.54 1.38-.72l.42-2.03Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="role-card-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.25" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M5.5 19.25C6.6 16.3 8.98 14.5 12 14.5s5.4 1.8 6.5 4.75" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

export function RoleIcon({ name }) {
  if (name === 'Credit Analyst') return <ChartIcon />;
  if (name === 'Risk Manager') return <ShieldIcon />;
  if (name === 'Admin') return <SettingsIcon />;
  if (name === 'MSME Owner') return <UserIcon />;
  return <BriefcaseIcon />;
}

export function CheckCircleIcon() {
  return (
    <svg className="check-circle-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="m8.5 12.25 2.25 2.25 4.75-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

export function SignalIcon({ type }) {
  if (type === 'upi') {
    return (
      <svg className="signal-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.5 13.5h2.75c1.5 0 2.5-.75 2.5-2.25S10.75 9 9.25 9H6.5v7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        <path d="M13 9.5c1.2-.75 2.75-.75 3.75 0 1.05.8 1.3 2.25.6 3.3-.6.9-1.55 1.3-2.55 1.2-.95-.1-1.6-.6-2.1-1.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }

  if (type === 'eway') {
    return (
      <svg className="signal-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 14.5V9.75A1.75 1.75 0 0 1 6.75 8h6.2l3.05 3.05V14.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        <path d="M5 14.5h1.75a2 2 0 0 0 4 0h2.5a2 2 0 0 0 4 0H19v-1.65c0-.64-.26-1.25-.72-1.69L15.2 8.7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        <circle cx="8.75" cy="14.5" r="2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        <circle cx="14.25" cy="14.5" r="2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg className="signal-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 7.25H17.5c.69 0 1.25.56 1.25 1.25v8.75H5.25V8.5c0-.69.56-1.25 1.25-1.25Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M9 5.75h6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M8 10h8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M8 13h8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

export function getRiskBand(score) {
  if (score >= 750) return { label: 'Excellent', color: 'var(--color-success)', bg: 'var(--color-success-bg)' };
  if (score >= 650) return { label: 'Good', color: 'var(--color-warning-yellow)', bg: 'var(--color-warning-bg)' };
  if (score >= 550) return { label: 'Fair', color: 'var(--color-warning-amber)', bg: 'var(--color-warning-amber-bg)' };
  return { label: 'High Risk', color: 'var(--color-danger)', bg: 'var(--color-danger-bg)' };
}

export function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatDateTime(dateValue) {
  return dateValue.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function SectionLabel({ children }) {
  return <div className="section-label">{children}</div>;
}

export function StatusDot({ color }) {
  return <span className="status-dot" style={{ backgroundColor: color }} aria-hidden="true" />;
}

export function Pill({ children, tone = 'indigo' }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

export function Card({ children, className = '', style }) {
  return <section className={`surface-card ${className}`.trim()} style={style}>{children}</section>;
}

export function KpiCard({ label, value, subvalue, tone = 'default' }) {
  return (
    <Card className="kpi-card">
      <SectionLabel>{label}</SectionLabel>
      <div className={`kpi-value ${tone === 'danger' ? 'is-danger' : ''}`}>{value}</div>
      {subvalue ? <div className="kpi-subvalue">{subvalue}</div> : null}
    </Card>
  );
}

export function ScoreRing({ score, size = 160, showLabel = true }) {
  const band = getRiskBand(score);
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.max(0, Math.min(1, (score - 300) / 600));
  const dashOffset = circumference * (1 - percent);

  return (
    <div className="score-ring-wrap" style={{ width: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} className="score-ring-track" />
        <circle cx={size / 2} cy={size / 2} r={radius} className="score-ring-fill" style={{ stroke: band.color, strokeDasharray: circumference, strokeDashoffset: dashOffset }} />
      </svg>
      <div className="score-ring-center" style={{ color: band.color }}>
        <div className="score-ring-value">{score}</div>
        {showLabel ? <div className="score-ring-label">{band.label}</div> : null}
      </div>
    </div>
  );
}

export function StepLineChart({ data, height = 220, yMin = 300, yMax = 900, showDots = true, showYAxis = true }) {
  const width = 720;
  const padding = { top: 16, right: 20, bottom: 28, left: 44 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const stepX = data.length > 1 ? innerWidth / (data.length - 1) : innerWidth;

  const points = data.map((point, index) => {
    const x = padding.left + index * stepX;
    const ratio = (point.value - yMin) / (yMax - yMin);
    const y = padding.top + innerHeight - ratio * innerHeight;
    return { ...point, x, y };
  });

  const stepPath = points.map((point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const prev = points[index - 1];
    return `L ${point.x} ${prev.y} L ${point.x} ${point.y}`;
  }).join(' ');

  const yTicks = [yMax, Math.round((yMax + yMin) / 2), yMin];

  return (
    <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Step line chart">
      {showYAxis ? (
        <g className="chart-y-axis">
          {yTicks.map((tick) => {
            const ratio = (tick - yMin) / (yMax - yMin);
            const y = padding.top + innerHeight - ratio * innerHeight;
            return (
              <g key={tick}>
                <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} className="chart-axis-line" />
                <text x={12} y={y + 4} className="chart-axis-label">{tick}</text>
              </g>
            );
          })}
        </g>
      ) : null}
      <path d={stepPath} className="chart-step-line" />
      {showDots ? points.map((point) => <circle key={`${point.label}-${point.value}`} cx={point.x} cy={point.y} r="3.5" className="chart-point" />) : null}
      {points.map((point) => <text key={`${point.label}-x`} x={point.x} y={height - 8} className="chart-x-label" textAnchor="middle">{point.label}</text>)}
    </svg>
  );
}

export function WaterfallBars({ data }) {
  return (
    <div className="waterfall-chart">
      {data.map((item, index) => (
        <div className="waterfall-row" key={item.label} style={{ animationDelay: `${index * 100}ms` }}>
          <div className="waterfall-label">{item.label}</div>
          <div className="waterfall-track">
            <div className={`waterfall-bar ${item.value >= 0 ? 'is-positive' : 'is-negative'}`} style={{ width: `${Math.abs(item.value)}%` }} />
          </div>
          <div className={`waterfall-value ${item.value >= 0 ? 'is-positive' : 'is-negative'}`}>{item.value > 0 ? '+' : ''}{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function Sparkline({ data }) {
  return <StepLineChart data={data} height={120} showDots={false} />;
}

export function ProgressBar({ value, duration = 800 }) {
  return <div className="progress-bar-fill" style={{ width: `${value}%`, animationDuration: `${duration}ms` }} />;
}

export function Table({ columns, rows, dense = false, onRowClick }) {
  return (
    <div className="table-wrap">
      <table className={`data-table ${dense ? 'is-dense' : ''}`}>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} onClick={() => onRowClick?.(row)}>
              {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({ title, children, onCancel, onConfirm, confirmLabel = 'Confirm', confirmTone = 'primary' }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h3 id="modal-title" className="modal-title">{title}</h3>
        <div className="modal-body">{children}</div>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className={confirmTone === 'danger' ? 'btn-destructive' : 'btn-primary'} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function Toast({ children, tone = 'success' }) {
  return <div className={`toast toast-${tone}`}>{children}</div>;
}
