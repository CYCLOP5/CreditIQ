import React, { useEffect, useState } from 'react';
import { AppShell } from '../components/shell';
import {
  Card,
  KpiCard,
  Pill,
  ProgressBar,
  ScoreRing,
  SectionLabel,
  Sparkline,
  StatusDot,
  StepLineChart,
  Table,
  Toast,
  WaterfallBars,
  formatCurrency,
  formatDateTime,
  getRiskBand,
} from '../components/ui';

export function GstinSubmissionPage({ userName, selectedRole, onSuccess }) {
  const [gstin, setGstin] = useState('22AAAAA0000A1Z5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetched, setFetched] = useState(false);
  const isValid = /^[0-9]{2}[A-Z0-9]{13}$/.test(gstin);

  useEffect(() => {
    if (!loading) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setLoading(false);
      setFetched(true);
      onSuccess();
    }, 2400);

    return () => window.clearTimeout(timeout);
  }, [loading, onSuccess]);

  function handleSubmit(event) {
    event.preventDefault();
    if (!isValid) {
      setError('Enter a valid GSTIN format.');
      return;
    }
    setError('');
    setLoading(true);
  }

  return (
    <AppShell breadcrumb="GSTIN submission" userName={userName} userRole={selectedRole}>
      <div className="center-column viewport-center">
        <Card className={`gstin-card ${loading ? 'is-loading' : ''} ${fetched ? 'is-fading' : ''}`}>
          <div className="center-stack">
            <div className="hero-icon">🔍</div>
            <h1 className="page-heading">Check your credit score</h1>
            <p className="page-subheading">Enter your GSTIN to generate a real-time credit assessment.</p>
          </div>

          <form onSubmit={handleSubmit} className="gstin-form">
            <div className="field-group">
              <label className="input-label" htmlFor="gstin">GSTIN</label>
              <div className="counted-input-wrap">
                <input id="gstin" className={`input-field mono-input ${error ? 'has-error' : ''}`} value={gstin} maxLength={15} onChange={(event) => setGstin(event.target.value.toUpperCase())} />
                <div className="char-count">{gstin.length}/15</div>
              </div>
              <p className="field-error">{error}</p>
            </div>

            <p className="helper-text">Format: 22AAAAA0000A1Z5</p>

            {loading ? (
              <div className="loading-block">
                <div className="loading-line-row"><span className="spinner" /><span>Fetching live signals…</span></div>
                {['GST data', 'UPI signals', 'E-way bills'].map((label, index) => (
                  <div key={label} className="pipeline-row">
                    <div className="pipeline-label">{label}</div>
                    <div className="pipeline-track"><ProgressBar value={100} duration={800 + index * 200} /></div>
                  </div>
                ))}
              </div>
            ) : (
              <button type="submit" className="btn-primary btn-lg">Generate score →</button>
            )}
          </form>
        </Card>
      </div>
    </AppShell>
  );
}

export function ScoreHeroCard({ score, gstin, businessName, timestamp, recommendLoan, tenure, fraudState = 'clean' }) {
  const band = getRiskBand(score);
  return (
    <Card className="hero-card">
      <div className="hero-grid">
        <div className="hero-left"><ScoreRing score={score} size={180} /></div>
        <div className="hero-right">
          <div className="hero-metric"><div className="hero-label">GSTIN</div><div className="hero-value mono-text">{gstin}</div></div>
          <div className="hero-metric"><div className="hero-label">Business name</div><div className="hero-value">{businessName}</div></div>
          <div className="hero-metric"><div className="hero-label">Score freshness timestamp</div><div className="hero-value">{timestamp}</div></div>
          <div className="loan-highlight"><div className="hero-label">Recommended loan</div><div className="loan-amount">{formatCurrency(recommendLoan)}</div><div className="loan-tenure">{tenure}</div></div>
          {fraudState !== 'clean' ? (
            <div className="fraud-row is-danger"><span className="inline-icon">⚠</span> Circular transaction risk detected</div>
          ) : (
            <div className="fraud-row"><StatusDot color={band.color} /> No fraud signals detected</div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function ScoreReportPage({ userName, selectedRole, onNext }) {
  const history = [540, 560, 575, 610, 645, 680];
  const data = history.map((value, index) => ({ label: `W${index + 1}`, value }));
  const reasons = [
    ['GST filings are consistent', 'High impact', 'var(--color-success)'],
    ['UPI collections remain steady', 'High impact', 'var(--color-success)'],
    ['E-way bill volume grew recently', 'Medium', 'var(--color-success)'],
    ['A few payment delays appeared', 'Medium', 'var(--color-danger)'],
    ['Recent activity is improving', 'Low', 'var(--color-success)'],
  ];

  return (
    <AppShell breadcrumb="My credit score" userName={userName} userRole={selectedRole}>
      <div className="page-stack">
        <ScoreHeroCard score={678} gstin="22AAAAA0000A1Z5" businessName="Aaradhya Traders" timestamp={formatDateTime(new Date())} recommendLoan={2500000} tenure="Recommended tenure: 24 months" />
        <Card>
          <SectionLabel>Why this score</SectionLabel>
          <div className="reason-list">
            {reasons.map(([text, label, color]) => (
              <div className="reason-row" key={text}>
                <div className="reason-main"><StatusDot color={color} /> {text}</div>
                <Pill tone={label.toLowerCase().includes('high') ? 'red' : label === 'Medium' ? 'amber' : 'indigo'}>{label}</Pill>
              </div>
            ))}
          </div>
        </Card>
        <Card><SectionLabel>Score history</SectionLabel><Sparkline data={data} /></Card>
        <div className="bottom-actions"><button className="btn-primary" onClick={onNext}>View score history</button></div>
      </div>
    </AppShell>
  );
}

export function ScoreHistoryPage({ userName, selectedRole, onNext }) {
  const data = [520, 540, 580, 610, 625, 650].map((value, index) => ({ label: `M${index + 1}`, value }));
  const events = [
    ['12 Apr 2026', 650, '+20', 'Good', 'GST filing detected'],
    ['18 Mar 2026', 630, '-12', 'Fair', 'UPI inactivity'],
    ['08 Feb 2026', 642, '+18', 'Fair', 'E-way bill spike'],
  ];

  return (
    <AppShell breadcrumb="Score history" userName={userName} userRole={selectedRole}>
      <div className="page-stack">
        <div><h1 className="page-heading">Score history</h1><p className="page-subheading left">Your credit score over time, updated with each new data ingestion.</p></div>
        <Card><div className="tabs-row"><Pill>3M</Pill><Pill tone="indigo">6M</Pill><Pill>1Y</Pill><Pill>All</Pill></div><StepLineChart data={data} height={280} /></Card>
        <Card><SectionLabel>Scoring events</SectionLabel><Table columns={[ 'Date', 'Score', 'Change', 'Risk band', 'Trigger' ]} rows={events.map(([date, score, change, band, trigger]) => [date, <span className="mono-text">{score}</span>, <span className={change.startsWith('+') ? 'positive' : 'negative'}>{change}</span>, <span>{band}</span>, trigger ])} dense /></Card>
        <div className="bottom-actions"><button className="btn-primary" onClick={onNext}>Go to queue</button></div>
      </div>
    </AppShell>
  );
}

export function ApplicationQueuePage({ userName, selectedRole, onNext }) {
  const rows = [
    ['Aaradhya Traders', '22AAAAA0000A1Z5', 782, 'Excellent', formatCurrency(3000000), '2h ago'],
    ['Blue Peak Industries', '29BBBBB1111B2Z4', 684, 'Good', formatCurrency(1500000), '8h ago'],
    ['Crescent Retail', '27CCCCC2222C3Z3', 542, 'High Risk', formatCurrency(800000), '1d ago'],
  ];

  return (
    <AppShell breadcrumb="Application queue" userName={userName} userRole={selectedRole}>
      <div className="page-stack">
        <div><h1 className="page-heading">Application queue</h1><p className="page-subheading left">3 applications pending review.</p></div>
        <div className="filter-bar">
          <input className="input-field filter-input" placeholder="Search by GSTIN or business name" />
          <div className="pill-row">{['All', 'Excellent', 'Good', 'Fair', 'High Risk'].map((item, index) => <Pill key={item} tone={index === 0 ? 'indigo' : 'default'}>{item}</Pill>)}</div>
          <select className="input-field select-field"><option>Newest first</option><option>Score: High to Low</option><option>Score: Low to High</option></select>
        </div>
        <Card>
          <Table columns={[ 'Business', 'GSTIN', 'Score', 'Band', 'Recommended loan', 'Freshness', 'Actions' ]} rows={rows.map((row) => [row[0], row[1], <span className="score-cell" style={{ color: getRiskBand(row[2]).color }}>{row[2]}</span>, row[3], row[4], row[5], <button className="btn-secondary btn-sm" onClick={onNext}>Review</button> ])} />
          <div className="pagination-footer">Showing 1–25 of 3 results</div>
        </Card>
      </div>
    </AppShell>
  );
}

export function ApplicantDetailPage({ userName, selectedRole, onNext }) {
  const waterfallData = [
    { label: 'GST velocity', value: 18 },
    { label: 'UPI cadence', value: 14 },
    { label: 'E-way bills', value: 11 },
    { label: 'Recent returns', value: -8 },
    { label: 'Payment delays', value: -12 },
  ];

  return (
    <AppShell breadcrumb="Application queue → Aaradhya Traders" userName={userName} userRole={selectedRole}>
      <div className="page-stack">
        <ScoreHeroCard score={782} gstin="22AAAAA0000A1Z5" businessName="Aaradhya Traders" timestamp={formatDateTime(new Date())} recommendLoan={3000000} tenure="Recommended tenure: 24 months" />
        <div className="action-bar"><div className="action-label">Loan Officer: Neha Sharma</div><div className="action-buttons"><button className="btn-primary" onClick={onNext}>Approve</button><button className="btn-secondary">Escalate</button><button className="btn-destructive">Reject</button></div></div>
        <Card><SectionLabel>Why this score</SectionLabel><div className="reason-list"><div className="reason-row"><div className="reason-main"><StatusDot color="var(--color-success)" /> GST filings are stable</div><Pill tone="indigo">High impact</Pill></div><div className="reason-row"><div className="reason-main"><StatusDot color="var(--color-success)" /> UPI volume is steady</div><Pill tone="amber">Medium</Pill></div><div className="reason-row"><div className="reason-main"><StatusDot color="var(--color-danger)" /> Slight collection delays</div><Pill tone="red">Low</Pill></div></div></Card>
        <div className="three-col-grid"><KpiCard label="GST velocity" value="42 filings/month" subvalue="+8% vs last month" /><KpiCard label="UPI cadence" value="1,200 tx/month" subvalue="+4% vs last month" /><KpiCard label="E-way bill volume" value="90 bills/month" subvalue="Stable" /></div>
        <Card><SectionLabel>Score trend</SectionLabel><StepLineChart data={[560, 590, 620, 650, 690, 705, 720, 735, 748, 760, 770, 782].map((value, index) => ({ label: `${index + 1}`, value }))} height={260} /></Card>
        <Card><SectionLabel>SHAP waterfall</SectionLabel><WaterfallBars data={waterfallData} /></Card>
      </div>
    </AppShell>
  );
}

export function DecisionFormPage({ userName, selectedRole, onNext }) {
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState('3000000');
  const [showToast, setShowToast] = useState(false);

  return (
    <AppShell breadcrumb="Application queue → Aaradhya Traders → Decision" userName={userName} userRole={selectedRole}>
      <div className="two-col-layout">
        <Card>
          <SectionLabel>Decision details</SectionLabel>
          <div className="form-stack">
            <div className="pill-row"><Pill tone="indigo">Approve</Pill></div>
            <label className="input-label">Approved loan amount (₹)<input className="input-field" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
            <label className="input-label">Tenure<select className="input-field"><option>12 months</option><option>24 months</option><option>36 months</option></select></label>
            <label className="input-label">Interest rate<input className="input-field" defaultValue="14.5%" /></label>
            <label className="input-label">Decision notes (required)<textarea className="input-field textarea-field" value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
            <label className="input-label">Conditions<textarea className="input-field textarea-field" placeholder="Any conditions attached to this approval" /></label>
            <button className="btn-primary" onClick={() => { setShowToast(true); window.setTimeout(() => onNext(), 1000); }}>Confirm approval</button>
          </div>
        </Card>
        <Card className="sticky-card">
          <SectionLabel>Summary</SectionLabel>
          <ScoreRing score={782} size={120} />
          <div className="summary-stack">
            <div><div className="hero-label">Business</div><div>Aaradhya Traders</div></div>
            <div><div className="hero-label">GSTIN</div><div className="mono-text">22AAAAA0000A1Z5</div></div>
            <div><div className="hero-label">Risk band</div><div><StatusDot color="var(--color-success)" /> Excellent</div></div>
            <div><div className="hero-label">Recommended loan</div><div>{formatCurrency(3000000)}</div></div>
          </div>
          <a href="#" className="inline-link">View full profile →</a>
        </Card>
        {showToast ? <Toast>Decision recorded successfully.</Toast> : null}
      </div>
    </AppShell>
  );
}

export function ComparisonPage({ userName, selectedRole, onNext }) {
  const [active] = useState(['Aaradhya Traders', 'Blue Peak Industries']);
  const applicantData = [
    { name: 'Aaradhya Traders', score: 782, gstin: '22AAAAA0000A1Z5', loan: formatCurrency(3000000) },
    { name: 'Blue Peak Industries', score: 684, gstin: '29BBBBB1111B2Z4', loan: formatCurrency(1500000) },
    { name: 'Crescent Retail', score: 542, gstin: '27CCCCC2222C3Z3', loan: formatCurrency(800000) },
  ].filter((item) => active.includes(item.name));

  return (
    <AppShell breadcrumb="Compare applicants" userName={userName} userRole={selectedRole}>
      <div className="page-stack">
        <h1 className="page-heading">Compare applicants</h1>
        <div className="selector-bar">
          {['Applicant 1', 'Applicant 2', 'Applicant 3'].map((label, index) => <label key={label} className="input-label">{label}<input className="input-field" value={applicantData[index]?.gstin || ''} readOnly={index < 2} placeholder={index === 2 ? 'Add applicant' : ''} /></label>)}
          <button className="btn-primary" onClick={onNext} disabled={active.length < 2}>Compare →</button>
        </div>
        <Card>
          <div className="ring-row">{applicantData.map((item) => <div key={item.name} className="ring-item"><ScoreRing score={item.score} size={100} /><div className="ring-name">{item.name}</div></div>)}</div>
          <Table columns={[ 'Attribute', ...applicantData.map((item) => item.name) ]} rows={[
            ['Credit Score', ...applicantData.map((item) => <span className="mono-text" style={{ color: getRiskBand(item.score).color }}>{item.score}</span>)],
            ['Risk Band', ...applicantData.map((item) => <span><StatusDot color={getRiskBand(item.score).color} /> {getRiskBand(item.score).label}</span>)],
            ['Recommended loan', ...applicantData.map((item) => item.loan)],
          ]} />
        </Card>
      </div>
    </AppShell>
  );
}

export function ShapExplainabilityPage({ userName, selectedRole, onNext }) {
  const shapRows = [
    ['gst_velocity', '42', '38', '+0.18', 'Strong filing rhythm'],
    ['upi_cadence', '1200', '1180', '+0.12', 'Consistent payments'],
    ['late_payments', '2', '2', '-0.08', 'Minor negative impact'],
  ];

  return (
    <AppShell breadcrumb="SHAP explainability → 22AAAAA0000A1Z5" userName={userName} userRole={selectedRole}>
      <div className="page-stack">
        <div className="selector-bar"><input className="input-field filter-input" defaultValue="22AAAAA0000A1Z5" /><button className="btn-primary">Load</button></div>
        <Card className="summary-strip"><div className="summary-strip-row"><span>Aaradhya Traders</span><span className="mono-text">782</span><span><StatusDot color="var(--color-success)" /> Excellent</span><span>{formatDateTime(new Date())}</span></div></Card>
        <Card><SectionLabel>Feature contributions — SHAP waterfall</SectionLabel><p className="page-subheading left">Each bar shows how much a signal pushed the score up or down from the base score.</p><WaterfallBars data={[{ label: 'GST velocity', value: 24 }, { label: 'UPI cadence', value: 18 }, { label: 'E-way bills', value: 12 }, { label: 'Overdue payments', value: -10 }, { label: 'Recent dips', value: -7 }]} /><div className="helper-text">Base score: 550 | Model output: 782</div></Card>
        <Card><SectionLabel>Feature breakdown</SectionLabel><Table columns={[ 'Feature Name', 'Raw Value', 'Engineered Value', 'SHAP Contribution', 'Reason' ]} rows={shapRows.map(([a,b,c,d,e]) => [a, b, c, <span className={d.startsWith('+') ? 'positive' : 'negative'}>{d}</span>, e])} dense /></Card>
        <div className="bottom-actions"><button className="btn-primary" onClick={onNext}>Next page</button></div>
      </div>
    </AppShell>
  );
}

export function SignalExplorerPage({ userName, selectedRole, onNext }) {
  const [activeTab, setActiveTab] = useState('GST velocity');
  const signalData = [410, 430, 440, 455, 470, 490, 510, 525].map((value, index) => ({ label: `${index + 1}`, value }));

  return (
    <AppShell breadcrumb="Signal explorer" userName={userName} userRole={selectedRole}>
      <div className="page-stack">
        <h1 className="page-heading">Signal explorer</h1>
        <div className="selector-bar"><input className="input-field filter-input" defaultValue="22AAAAA0000A1Z5" /><input className="input-field filter-input" type="date" /><input className="input-field filter-input" type="date" /><button className="btn-primary">Load signals</button></div>
        <div className="tabs-row">{['GST velocity', 'UPI cadence', 'E-way bill volume', 'Composite signals'].map((tab) => <button key={tab} className={`tab-pill ${activeTab === tab ? 'is-active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div>
        <Card><SectionLabel>Signal chart</SectionLabel><div className="chart-legend"><span><StatusDot color="var(--color-indigo-600)" /> Raw signal</span><span><StatusDot color="var(--color-warning-amber)" /> 30-day avg</span></div><StepLineChart data={signalData} height={280} /></Card>
        <div className="three-col-grid"><KpiCard label="Mean" value="462" /><KpiCard label="Median" value="458" /><KpiCard label="Std deviation" value="18" /></div>
        <Card><SectionLabel>Raw data</SectionLabel><Table columns={[ 'Date', 'Raw value', 'Engineered value', 'Anomaly' ]} rows={signalData.map((point, index) => [ `2026-0${index + 1}-01`, point.value, point.value - 12, index % 4 === 0 ? <StatusDot color="var(--color-danger)" /> : '' ])} dense /></Card>
        <div className="bottom-actions"><button className="btn-primary" onClick={onNext}>Next page</button></div>
      </div>
    </AppShell>
  );
}

export function ModelPerformancePage({ userName, selectedRole, onNext }) {
  const kpis = [['Total scored', '12,480'], ['Avg score', '684'], ['High risk flagged', '1,040'], ['Fraud alerts', '82']];

  return (
    <AppShell breadcrumb="Model performance" userName={userName} userRole={selectedRole}>
      <div className="page-stack">
        <div><h1 className="page-heading">Model performance</h1><p className="page-subheading left">Monitoring gradient boosting model v2.1. Last retrained: 01 Apr 2026.</p></div>
        <div className="four-col-grid">{kpis.map(([label, value]) => <KpiCard key={label} label={label} value={value} tone={label.includes('risk') || label.includes('Fraud') ? 'danger' : 'default'} />)}</div>
        <div className="chart-grid">
          <Card><SectionLabel>Score distribution</SectionLabel><StepLineChart data={[{ label: '300-400', value: 310 }, { label: '400-500', value: 380 }, { label: '500-600', value: 460 }, { label: '600-700', value: 560 }, { label: '700-800', value: 620 }, { label: '800-900', value: 680 }]} height={240} /></Card>
          <Card><SectionLabel>Top features</SectionLabel><WaterfallBars data={[{ label: 'GST velocity', value: 80 }, { label: 'UPI cadence', value: 72 }, { label: 'E-way bills', value: 66 }, { label: 'Returns consistency', value: 60 }, { label: 'Payment aging', value: 52 }]} /></Card>
        </div>
        <div className="chart-grid">
          <Card><SectionLabel>Classification performance</SectionLabel><div className="confusion-grid"><div className="confusion-cell success-cell"><div>True Positive</div><strong>1,040</strong></div><div className="confusion-cell danger-cell"><div>False Positive</div><strong>88</strong></div><div className="confusion-cell danger-cell"><div>False Negative</div><strong>72</strong></div><div className="confusion-cell success-cell"><div>True Negative</div><strong>11,280</strong></div></div></Card>
          <Card><SectionLabel>Metrics by risk band</SectionLabel><Table columns={[ 'Risk Band', 'Precision', 'Recall', 'F1 Score', 'Support' ]} rows={[ ['Excellent', '0.94', '0.92', '0.93', '4,120'], ['Good', '0.90', '0.88', '0.89', '3,800'], ['Fair', '0.86', '0.84', '0.85', '2,980'], ['High Risk', '0.81', '0.79', '0.80', '1,580'] ]} dense /></Card>
        </div>
        <div className="bottom-actions"><button className="btn-primary" onClick={onNext}>Next page</button></div>
      </div>
    </AppShell>
  );
}
