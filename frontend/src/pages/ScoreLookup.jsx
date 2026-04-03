import React, { useState, useEffect, useRef } from 'react';
import { postScore, getScore } from '../lib/api';

// GSTIN: exactly 15 uppercase alphanumeric characters
const GSTIN_RE = /^[A-Z0-9]{15}$/;

function validateGstin(value) {
  if (!value || !value.trim()) return 'GSTIN is required.';
  if (value.length !== 15) return 'GSTIN must be exactly 15 characters.';
  if (!GSTIN_RE.test(value)) return 'GSTIN must be alphanumeric (A–Z, 0–9) with no spaces or symbols.';
  return '';
}

/** Returns a CSS colour variable name based on numeric score. */
function scoreColor(score) {
  if (score >= 750) return 'var(--color-success)';        // green
  if (score >= 650) return 'var(--color-indigo-600)';     // blue
  if (score >= 550) return 'var(--color-warning-amber)';  // yellow / amber
  return 'var(--color-danger)';                           // red
}

/** Formats a rupee amount as "₹X.X lakh" */
function formatLakh(amount) {
  if (amount == null) return '—';
  const lakh = amount / 100_000;
  return `₹${Number.isInteger(lakh) ? lakh : lakh.toFixed(1)} lakh`;
}

/** Converts snake_case risk band to Title Case. */
function formatBand(band) {
  if (!band) return '—';
  return band.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScoreHero({ result }) {
  const color = scoreColor(result.credit_score);
  return (
    <div className="surface-card score-hero-card">
      <div className="score-display-wrap">
        <div className="score-number" style={{ color }}>{result.credit_score}</div>
        <div className="score-range-label">out of 900</div>
      </div>
      <div className="score-band-label" style={{ color }}>{formatBand(result.risk_band)}</div>

      <dl className="score-meta-list">
        <div className="score-meta-row">
          <dt className="hero-label">GSTIN</dt>
          <dd className="mono-text">{result.gstin}</dd>
        </div>
        <div className="score-meta-row">
          <dt className="hero-label">MSME Category</dt>
          <dd>
            <span className="badge badge-default">
              {result.msme_category ? result.msme_category.toUpperCase() : '—'}
            </span>
          </dd>
        </div>
        <div className="score-meta-row">
          <dt className="hero-label">Data Maturity</dt>
          <dd>{result.data_maturity_months ?? '—'} months</dd>
        </div>
        <div className="score-meta-row">
          <dt className="hero-label">Score Freshness</dt>
          <dd className="score-freshness">
            {result.score_freshness
              ? new Date(result.score_freshness).toLocaleString('en-IN')
              : '—'}
          </dd>
        </div>
      </dl>

      <div className="badge-row">
        <span className={`badge ${result.cgtmse_eligible ? 'badge-success' : 'badge-grey'}`}>
          {result.cgtmse_eligible ? '✓' : '✗'} CGTMSE
        </span>
        <span className={`badge ${result.mudra_eligible ? 'badge-indigo' : 'badge-grey'}`}>
          {result.mudra_eligible ? '✓' : '✗'} Mudra
        </span>
      </div>
    </div>
  );
}

function ScoreDetails({ result }) {
  return (
    <div className="surface-card">
      <div className="section-label">Loan Recommendations</div>
      <div className="loan-rec-grid">
        <div className="loan-rec-item">
          <div className="hero-label">Working Capital</div>
          <div className="loan-amount-display">{formatLakh(result.recommended_wc_amount)}</div>
        </div>
        <div className="loan-rec-item">
          <div className="hero-label">Term Loan</div>
          <div className="loan-amount-display">{formatLakh(result.recommended_term_amount)}</div>
        </div>
      </div>

      <div className="section-label" style={{ marginTop: '20px' }}>Top Reasons</div>
      {result.top_reasons && result.top_reasons.length > 0 ? (
        <ul className="reason-bullets">
          {result.top_reasons.map((reason, i) => (
            <li key={i} className="reason-bullet-item">{reason}</li>
          ))}
        </ul>
      ) : (
        <p className="helper-text">No reasons provided for this score.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main exported content component (no AppShell — parent renders the shell)
// ---------------------------------------------------------------------------

export default function ScoreLookupContent({ result, onResult }) {
  const [gstin, setGstin] = useState('');
  const [gstinError, setGstinError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const intervalRef = useRef(null);

  // Clear the polling interval
  function clearPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  // Clean up on unmount
  useEffect(() => () => clearPolling(), []);

  function handleGstinChange(e) {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setGstin(val);
    // Live-clear validation error once user starts correcting
    if (gstinError) setGstinError(validateGstin(val));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const normalized = gstin.trim().toUpperCase();
    const err = validateGstin(normalized);
    if (err) {
      setGstinError(err);
      return;
    }

    setGstinError('');
    setError('');
    setLoading(true);
    onResult(null); // clear previous result

    try {
      const { task_id } = await postScore(normalized);

      // Poll every 2 seconds until we get a non-pending status
      intervalRef.current = setInterval(async () => {
        try {
          const data = await getScore(task_id);
          if (data.status === 'complete' || data.status === 'failed') {
            clearPolling();
            setLoading(false);
            onResult(data);
          }
        } catch (pollErr) {
          clearPolling();
          setLoading(false);
          setError(`Polling failed: ${pollErr.message}`);
        }
      }, 2000);
    } catch (submitErr) {
      setLoading(false);
      setError(`Could not submit scoring request: ${submitErr.message}`);
    }
  }

  return (
    <div className="page-stack">
      {/* Page header */}
      <div>
        <h1 className="page-heading">Score Lookup</h1>
        <p className="page-subheading left">
          Enter a GSTIN to generate a real-time MSME credit score from live GST, UPI and e-way bill signals.
        </p>
      </div>

      {/* Input card */}
      <div className="surface-card">
        <form onSubmit={handleSubmit} noValidate>
          <div className="gstin-input-row">
            <div className="field-group gstin-field-group">
              <label className="input-label" htmlFor="score-lookup-gstin">GSTIN</label>
              <div className="counted-input-wrap">
                <input
                  id="score-lookup-gstin"
                  className={`input-field mono-input${gstinError ? ' has-error' : ''}`}
                  value={gstin}
                  maxLength={15}
                  placeholder="22AAAAA0000A1Z5"
                  autoComplete="off"
                  spellCheck={false}
                  onChange={handleGstinChange}
                  disabled={loading}
                />
                <div className="char-count">{gstin.length}/15</div>
              </div>
              <p className="field-error" aria-live="polite">{gstinError}</p>
            </div>
            <div className="gstin-submit-wrap">
              <button
                type="submit"
                className="btn-primary gstin-submit-btn"
                disabled={loading}
              >
                {loading ? 'Scoring…' : 'Get Score'}
              </button>
            </div>
          </div>
          <p className="helper-text">Format: state-code (2 digits) + PAN (10 chars) + check digit (3 chars)</p>
        </form>

        {/* Polling spinner */}
        {loading && (
          <div className="loading-block" style={{ marginTop: '20px' }}>
            <div className="loading-line-row">
              <span className="spinner" aria-hidden="true" />
              <span>Fetching live GST, UPI and e-way bill signals — this may take up to 30 seconds.</span>
            </div>
          </div>
        )}

        {/* API / network error */}
        {error && (
          <div className="error-banner" role="alert">
            <span className="error-banner-icon">⚠</span>
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Result section */}
      {result && (
        <>
          {/* Fraud warning banner (shown when fraud_flag is true) */}
          {result.fraud_flag && (
            <div className="fraud-alert-banner" role="alert">
              <span className="fraud-alert-icon">⚠</span>
              <span>
                <strong>Fraud Alert:</strong> Circular transaction patterns detected for this GSTIN.
                Check the Fraud Topology tab for details.
              </span>
            </div>
          )}

          <div className="score-result-grid">
            <ScoreHero result={result} />
            <ScoreDetails result={result} />
          </div>
        </>
      )}
    </div>
  );
}
