import React, { useMemo, useState } from 'react';
import { onboardingSteps } from './lib/constants';
import { getDisplayName } from './lib/utils';
import { Toast } from './components/ui';
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

export default function App() {
  const [screen, setScreen] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('Loan Officer');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [transitionDirection, setTransitionDirection] = useState('forward');
  const [toastMessage] = useState('');

  const errors = useMemo(() => ({
    email: !email.trim() ? 'Email address is required.' : '',
    password: !password.trim() ? 'Password is required.' : '',
  }), [email, password]);

  function handleSubmit(event) {
    event.preventDefault();
    setTouched({ email: true, password: true });

    if (errors.email || errors.password) {
      return;
    }

    setScreen('role-selection');
  }

  function handleContinue() {
    setTransitionDirection('forward');
    setOnboardingStep(0);
    setScreen('gstin-submission');
  }

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

  if (screen === 'role-selection') {
    return <RoleSelectionPage userName={displayName} selectedRole={selectedRole} onSelectRole={setSelectedRole} onContinue={handleContinue} />;
  }

  if (screen === 'gstin-submission') {
    return <GstinSubmissionPage userName={displayName} selectedRole={selectedRole} onSuccess={() => setScreen('score-report')} />;
  }

  if (screen === 'score-report') {
    return <ScoreReportPage userName={displayName} selectedRole={selectedRole} onNext={() => setScreen('score-history')} />;
  }

  if (screen === 'score-history') {
    return <ScoreHistoryPage userName={displayName} selectedRole={selectedRole} onNext={() => setScreen('application-queue')} />;
  }

  if (screen === 'application-queue') {
    return <ApplicationQueuePage userName={displayName} selectedRole={selectedRole} onNext={() => setScreen('applicant-detail')} />;
  }

  if (screen === 'applicant-detail') {
    return <ApplicantDetailPage userName={displayName} selectedRole={selectedRole} onNext={() => setScreen('decision-form')} />;
  }

  if (screen === 'decision-form') {
    return <DecisionFormPage userName={displayName} selectedRole={selectedRole} onNext={() => setScreen('comparison')} />;
  }

  if (screen === 'comparison') {
    return <ComparisonPage userName={displayName} selectedRole={selectedRole} onNext={() => setScreen('shap-explainability')} />;
  }

  if (screen === 'shap-explainability') {
    return <ShapExplainabilityPage userName={displayName} selectedRole={selectedRole} onNext={() => setScreen('signal-explorer')} />;
  }

  if (screen === 'signal-explorer') {
    return <SignalExplorerPage userName={displayName} selectedRole={selectedRole} onNext={() => setScreen('model-performance')} />;
  }

  if (screen === 'model-performance') {
    return <ModelPerformancePage userName={displayName} selectedRole={selectedRole} onNext={() => setScreen('dashboard')} />;
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

  if (screen === 'dashboard') {
    return (
      <>
        {toastMessage ? <Toast>{toastMessage}</Toast> : null}
        <DashboardPlaceholder userName={displayName} selectedRole={selectedRole} />
      </>
    );
  }

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
