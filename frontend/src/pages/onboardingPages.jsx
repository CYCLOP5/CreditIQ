import React from 'react';
import { onboardingSteps } from '../lib/constants';
import { AppShell } from '../components/shell';
import { CheckCircleIcon, SignalIcon } from '../components/ui';

function OnboardingProgress({ stepIndex }) {
  return (
    <ol className="onboarding-progress" aria-label="Onboarding progress">
      {onboardingSteps.map((step, index) => {
        const isComplete = index < stepIndex;
        const isActive = index === stepIndex;

        return (
          <li key={step} className={`progress-step ${isComplete ? 'is-complete' : ''} ${isActive ? 'is-active' : ''}`}>
            <div className="progress-track">
              <span className={`progress-dot ${isComplete || isActive ? 'is-filled' : ''}`} />
              {index < onboardingSteps.length - 1 ? <span className={`progress-line ${isComplete ? 'is-filled' : ''}`} /> : null}
            </div>
            <div className="progress-label">{step}</div>
          </li>
        );
      })}
    </ol>
  );
}

function StepSignalRow() {
  return (
    <div className="signal-row" aria-label="Scoring signals">
      <div className="signal-chip"><SignalIcon type="gst" /></div>
      <div className="signal-chip"><SignalIcon type="upi" /></div>
      <div className="signal-chip"><SignalIcon type="eway" /></div>
    </div>
  );
}

function OnboardingStepCard({ stepIndex, direction }) {
  const stepContent = [
    {
      title: 'How credit scoring works',
      body: 'We combine GST filing velocity, UPI cadence, and e-way bill activity to understand how a business is moving in real time. More consistent activity generally points to stronger credit behaviour.',
      extra: <StepSignalRow />,
    },
    {
      title: 'Reading your dashboard',
      body: 'Your dashboard highlights the score, the reasons behind it, and the underlying signals that changed most recently. Each panel is designed to help you spot what is driving risk or strength at a glance.',
      extra: (
        <div className="dashboard-mockup" aria-label="Dashboard mockup">
          <div className="mockup-callout mockup-callout-top">Score summary</div>
          <div className="mockup-callout mockup-callout-right">Trends and signals</div>
          <div className="mockup-grid">
            <div className="mockup-kpi" />
            <div className="mockup-kpi" />
            <div className="mockup-kpi" />
            <div className="mockup-chart" />
          </div>
        </div>
      ),
    },
    {
      title: "You're all set",
      body: 'You’re ready to explore your dashboard and act on what the score is telling you. We will keep updating the view as new data arrives.',
      extra: <div className="ready-state"><CheckCircleIcon /></div>,
    },
  ];

  const activeStep = stepContent[stepIndex];

  return (
    <section key={`${stepIndex}-${direction}`} className={`onboarding-step-card ${direction}`} aria-labelledby="onboarding-step-title">
      <h2 id="onboarding-step-title" className="onboarding-step-title">{activeStep.title}</h2>
      <p className="onboarding-step-body">{activeStep.body}</p>
      {activeStep.extra}
    </section>
  );
}

export function OnboardingPage({ userName, selectedRole, stepIndex, direction, onBack, onNext, onSkip, onFinish }) {
  const breadcrumb = onboardingSteps[stepIndex];

  return (
    <AppShell breadcrumb={breadcrumb} userName={userName} userRole={selectedRole}>
      <div className="onboarding-column">
        <OnboardingProgress stepIndex={stepIndex} />
        <OnboardingStepCard stepIndex={stepIndex} direction={direction} />
        <div className="onboarding-nav-row">
          {stepIndex === 0 ? (
            <button type="button" className="ghost-link" onClick={onSkip}>Skip onboarding</button>
          ) : (
            <button type="button" className="ghost-link" onClick={onBack}>Back</button>
          )}

          {stepIndex < onboardingSteps.length - 1 ? (
            <button type="button" className="btn-primary" onClick={onNext}>Next →</button>
          ) : (
            <button type="button" className="btn-primary" onClick={onFinish}>Go to dashboard</button>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export function DashboardPlaceholder({ userName, selectedRole }) {
  return (
    <AppShell breadcrumb="Dashboard" userName={userName} userRole={selectedRole}>
      <div className="onboarding-column">
        <section className="login-card dashboard-placeholder-card" aria-label="Dashboard placeholder">
          <h2 className="onboarding-step-title">Dashboard</h2>
          <p className="onboarding-step-body">This is a placeholder landing view after onboarding.</p>
        </section>
      </div>
    </AppShell>
  );
}
