import React, { useEffect, useState } from 'react';
import { getHealth } from '../lib/api';

const POLL_INTERVAL_MS = 5_000;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Green / red dot + label + "OK" / "Error" status text. */
function HealthIndicator({ label, value }) {
  return (
    <div className="health-indicator">
      <span
        className={`health-dot ${value ? 'health-dot-green' : 'health-dot-red'}`}
        aria-hidden="true"
      />
      <span className="health-indicator-label">{label}</span>
      <span className={`health-indicator-status ${value ? 'is-ok' : 'is-error'}`}>
        {value ? 'OK' : 'Error'}
      </span>
    </div>
  );
}

/** RAM usage progress bar with percentage annotation. */
function RamBar({ used, total }) {
  if (total == null || total === 0) return <p className="helper-text">RAM data unavailable.</p>;
  const pct = Math.min(100, Math.round((used / total) * 100));
  const barColor =
    pct > 85
      ? 'var(--color-danger)'
      : pct > 65
      ? 'var(--color-warning-amber)'
      : 'var(--color-success)';

  return (
    <div className="ram-bar-wrap">
      <div className="ram-bar-header">
        <span>RAM Usage</span>
        <span>
          {used?.toFixed(1)} GB / {total?.toFixed(1)} GB &nbsp;({pct}%)
        </span>
      </div>
      <div className="pipeline-track">
        <div
          className="pipeline-track-fill"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  );
}

/** Single KPI box used in the health grid. */
function HealthCard({ label, children }) {
  return (
    <div className="surface-card health-card">
      <div className="section-label">{label}</div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main exported content component
// ---------------------------------------------------------------------------

export default function SystemHealthContent() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function fetchHealth() {
      try {
        const data = await getHealth();
        if (!mounted) return;
        setHealth(data);
        setLastUpdated(new Date());
        setError('');
      } catch (err) {
        if (!mounted) return;
        setError(err.message);
      }
    }

    fetchHealth(); // immediate first fetch
    const interval = setInterval(fetchHealth, POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="page-stack">
      <div>
        <h1 className="page-heading">System Health</h1>
        <p className="page-subheading left">
          Live backend status — auto-refreshes every{' '}
          {POLL_INTERVAL_MS / 1000} seconds.
        </p>
      </div>

      {/* Network / API error */}
      {error && (
        <div className="error-banner" role="alert">
          <span className="error-banner-icon">⚠</span>
          <span>Could not reach the API: {error}</span>
        </div>
      )}

      {/* Loading skeleton (only on first load) */}
      {!health && !error && (
        <div className="surface-card">
          <div className="loading-line-row">
            <span className="spinner" aria-hidden="true" />
            <span>Fetching health data…</span>
          </div>
        </div>
      )}

      {/* Health data */}
      {health && (
        <>
          {/* 4-column indicator grid */}
          <div className="health-grid">
            <HealthCard label="API">
              <HealthIndicator label="API service" value={health.status === 'ok'} />
            </HealthCard>

            <HealthCard label="Redis">
              <HealthIndicator label="Redis connected" value={health.redis_connected} />
            </HealthCard>

            <HealthCard label="Model">
              <HealthIndicator label="Model loaded" value={health.model_loaded} />
            </HealthCard>

            <HealthCard label="Worker Queue">
              <div className="queue-depth">
                {health.worker_queue_depth ?? '—'}
              </div>
              <div className="queue-label">
                {health.worker_queue_depth === 1 ? 'task pending' : 'tasks pending'}
              </div>
            </HealthCard>
          </div>

          {/* RAM usage */}
          <div className="surface-card">
            <div className="section-label">Memory</div>
            <RamBar
              used={health.system_ram_used_gb}
              total={health.system_ram_total_gb}
            />
          </div>

          {/* Timestamp */}
          {lastUpdated && (
            <p className="health-timestamp">
              Last updated:{' '}
              {lastUpdated.toLocaleTimeString('en-IN', { timeStyle: 'medium' })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
