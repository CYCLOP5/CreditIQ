import React, { useMemo, useState } from 'react';
import { onboardingSteps } from './lib/constants';
import { getDisplayName } from './lib/utils';
import { Toast } from './components/ui';
import { AppShell } from './components/shell';
import { LoginPage, RoleSelectionPage } from './pages/authPages';
import { OnboardingPage, DashboardPlaceholder } from './pages/onboardingPages';
import {
  ApplicantDetailPage,
  ApplicationQueuePage,
  ComparisonPage,
  DecisionFormPage,
  GstinSubmissionPage,
  ModelPerformancePage,
  ScoreHistoryPage,
  ScoreReportPage,
  ShapExplainabilityPage,
  SignalExplorerPage,
} from './pages/workflowPages';

// New dashboard page content components (no AppShell — we render it here)
import ScoreLookupContent from './pages/ScoreLookup';
import FeatureContributionsContent from './pages/FeatureContributions';
import FraudTopologyContent from './pages/FraudTopology';
import SystemHealthContent from './pages/SystemHealth';

// ---------------------------------------------------------------------------
// Dashboard nav configuration
// ---------------------------------------------------------------------------

const DASHBOARD_NAV = [
  { id: 'score-lookup',           label: 'Score Lookup' },
  { id: 'feature-contributions',  label: 'Feature Contributions' },
  { id: 'fraud-topology',         label: 'Fraud Topology' },
  { id: 'system-health',          label: 'System Health' },
];

const DASHBOARD_BREADCRUMBS = {
  'score-lookup':          'Dashboard › Score Lookup',
  'feature-contributions': 'Dashboard › Feature Contributions',
  'fraud-topology':        'Dashboard › Fraud Topology',
  'system-health':         'Dashboard › System Health',
};

// ---------------------------------------------------------------------------
// App root
// ---------------------------------------------------------------------------

export default function App() {
  // ---------- Auth / workflow routing state ----------
  const [screen, setScreen] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('Loan Officer');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [transitionDirection, setTransitionDirection] = useState('forward');
  const [toastMessage] = useState('');

  // ---------- Dashboard state (lifted so all 4 tabs can share it) ----------
  const [dashboardTab, setDashboardTab] = useState('score-lookup');
  /**
   * scoreResult holds the full score result object returned by GET /score/{task_id}.
   * It is lifted here so ScoreLookup, FeatureContributions, and FraudTopology
   * all share the same result without prop-drilling through a router.
   * Shape: null | { task_id, gstin, credit_score, risk_band, top_reasons,
   *                 recommended_wc_amount, recommended_term_amount, msme_category,
   *                 cgtmse_eligible, mudra_eligible, fraud_flag, fraud_details,
   *                 score_freshness, data_maturity_months, shap_waterfall }
   */
  const [scoreResult, setScoreResult] = useState(null);

  // ---------- Form validation ----------
  const errors = useMemo(() => ({
    email: !email.trim() ? 'Email address is required.' : '',
    password: !password.trim() ? 'Password is required.' : '',
  }), [email, password]);

  // ---------- Auth handlers ----------
  function handleSubmit(event) {
    event.preventDefault();
    setTouched({ email: true, password: true });
    if (errors.email || errors.password) return;
    setScreen('role-selection');
  }

  function handleContinue() {
    setTransitionDirection('forward');
    setOnboardingStep(0);
    setScreen('gstin-submission');
  }

  // ---------- Onboarding handlers ----------
  function handleOnboardingNext() {
    setTransitionDirection('forward');
    setOnboardingStep((current) => Math.min(current + 1, onboardingSteps.length - 1));
  }

  function handleOnboardingBack() {
    setTransitionDirection('back');
    setOnboardingStep((current) => Math.max(current - 1, 0));
  }

  function handleOnboardingSkip() {
    setScreen('gstin-submission');
  }

  function handleOnboardingFinish() {
    setScreen('gstin-submission');
  }

  const displayName = getDisplayName(email);

  // ---------------------------------------------------------------------------
  // Render: auth pages
  // ---------------------------------------------------------------------------

  if (screen === 'role-selection') {
    return (
      <RoleSelectionPage
        userName={displayName}
        selectedRole={selectedRole}
        onSelectRole={setSelectedRole}
        onContinue={handleContinue}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Render: existing workflow pages (unchanged)
  // ---------------------------------------------------------------------------

  if (screen === 'gstin-submission') {
    return (
      <GstinSubmissionPage
        userName={displayName}
        selectedRole={selectedRole}
        onSuccess={() => setScreen('score-report')}
      />
    );
  }

  if (screen === 'score-report') {
    return (
      <ScoreReportPage
        userName={displayName}
        selectedRole={selectedRole}
        onNext={() => setScreen('score-history')}
      />
    );
  }

  if (screen === 'score-history') {
    return (
      <ScoreHistoryPage
        userName={displayName}
        selectedRole={selectedRole}
        onNext={() => setScreen('application-queue')}
      />
    );
  }

  if (screen === 'application-queue') {
    return (
      <ApplicationQueuePage
        userName={displayName}
        selectedRole={selectedRole}
        onNext={() => setScreen('applicant-detail')}
      />
    );
  }

  if (screen === 'applicant-detail') {
    return (
      <ApplicantDetailPage
        userName={displayName}
        selectedRole={selectedRole}
        onNext={() => setScreen('decision-form')}
      />
    );
  }

  if (screen === 'decision-form') {
    return (
      <DecisionFormPage
        userName={displayName}
        selectedRole={selectedRole}
        onNext={() => setScreen('comparison')}
      />
    );
  }

  if (screen === 'comparison') {
    return (
      <ComparisonPage
        userName={displayName}
        selectedRole={selectedRole}
        onNext={() => setScreen('shap-explainability')}
      />
    );
  }

  if (screen === 'shap-explainability') {
    return (
      <ShapExplainabilityPage
        userName={displayName}
        selectedRole={selectedRole}
        onNext={() => setScreen('signal-explorer')}
      />
    );
  }

  if (screen === 'signal-explorer') {
    return (
      <SignalExplorerPage
        userName={displayName}
        selectedRole={selectedRole}
        onNext={() => setScreen('model-performance')}
      />
    );
  }

  if (screen === 'model-performance') {
    return (
      <ModelPerformancePage
        userName={displayName}
        selectedRole={selectedRole}
        onNext={() => setScreen('dashboard')}
      />
    );
  }

  if (screen === 'onboarding') {
    return (
      <OnboardingPage
        userName={displayName}
        selectedRole={selectedRole}
        stepIndex={onboardingStep}
        direction={transitionDirection}
        onBack={handleOnboardingBack}
        onNext={handleOnboardingNext}
        onSkip={handleOnboardingSkip}
        onFinish={handleOnboardingFinish}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Render: new dashboard (Phase 7)
  //
  // The AppShell is rendered here (not inside individual page components) so
  // that a single sidebar sits around all four tabs and dashboardTab / scoreResult
  // state stays in one place.
  // ---------------------------------------------------------------------------

  if (screen === 'dashboard') {
    return (
      <>
        {toastMessage && <Toast>{toastMessage}</Toast>}
        <AppShell
          breadcrumb={DASHBOARD_BREADCRUMBS[dashboardTab]}
          userName={displayName}
          userRole={selectedRole}
          navItems={DASHBOARD_NAV}
          activeNav={dashboardTab}
          onNavChange={setDashboardTab}
        >
          {dashboardTab === 'score-lookup' && (
            <ScoreLookupContent
              result={scoreResult}
              onResult={setScoreResult}
            />
          )}

          {dashboardTab === 'feature-contributions' && (
            <FeatureContributionsContent result={scoreResult} />
          )}

          {dashboardTab === 'fraud-topology' && (
            <FraudTopologyContent result={scoreResult} />
          )}

          {dashboardTab === 'system-health' && (
            <SystemHealthContent />
          )}
        </AppShell>
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: login (default / fallback)
  // ---------------------------------------------------------------------------

  return (
    <LoginPage
      email={email}
      password={password}
      showPassword={showPassword}
      selectedRole={selectedRole}
      touched={touched}
      errors={errors}
      onEmailChange={setEmail}
      onEmailBlur={() => setTouched((current) => ({ ...current, email: true }))}
      onPasswordChange={setPassword}
      onPasswordBlur={() => setTouched((current) => ({ ...current, password: true }))}
      onTogglePassword={() => setShowPassword((current) => !current)}
      onRoleChange={setSelectedRole}
      onSubmit={handleSubmit}
    />
  );
}
