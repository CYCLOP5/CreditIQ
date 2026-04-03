import React from 'react';
import { roles, roleOptions } from '../lib/constants';
import { getInitials } from '../lib/utils';
import { EyeIcon, RoleIcon } from '../components/ui';

export function LoginPage({
  email,
  password,
  showPassword,
  selectedRole,
  touched,
  errors,
  onEmailChange,
  onEmailBlur,
  onPasswordChange,
  onPasswordBlur,
  onTogglePassword,
  onRoleChange,
  onSubmit,
}) {
  return (
    <main className="page-shell">
      <section className="login-card" aria-labelledby="login-title">
        <div className="brand-mark">CreditIQ</div>
        <h1 id="login-title" className="page-title">Sign in to your account</h1>

        <form className="login-form" noValidate onSubmit={onSubmit}>
          <div className="field-group">
            <label className="input-label" htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              className={`input-field ${touched.email && errors.email ? 'has-error' : ''}`}
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              onBlur={onEmailBlur}
            />
            <p className="field-error" aria-live="polite">{touched.email ? errors.email : ''}</p>
          </div>

          <div className="field-group password-group">
            <div className="password-header">
              <label className="input-label" htmlFor="password">Password</label>
              <button className="forgot-link" type="button">Forgot password?</button>
            </div>

            <div className="password-field-wrap">
              <input
                id="password"
                name="password"
                className={`input-field password-input ${touched.password && errors.password ? 'has-error' : ''}`}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                onBlur={onPasswordBlur}
              />
              <button
                className={`password-toggle ${showPassword ? 'is-visible' : ''}`}
                type="button"
                onClick={onTogglePassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                <EyeIcon hidden={showPassword} />
              </button>
            </div>
            <p className="field-error" aria-live="polite">{touched.password ? errors.password : ''}</p>
          </div>

          <button type="submit" className="btn-primary btn-submit">Sign in</button>

          <div className="divider" aria-hidden="true">
            <span />
            <span>or</span>
            <span />
          </div>

          <div className="field-group">
            <div className="role-selector" role="radiogroup" aria-label="Select role context">
              {roles.map((role) => (
                <button
                  key={role}
                  type="button"
                  className={`role-pill ${selectedRole === role ? 'is-selected' : ''}`}
                  onClick={() => onRoleChange(role)}
                  aria-pressed={selectedRole === role}
                >
                  {role}
                </button>
              ))}
            </div>
            <p className="role-caption">Selected role: <span>{selectedRole}</span></p>
          </div>
        </form>
      </section>
    </main>
  );
}

export function RoleSelectionPage({ userName, selectedRole, onSelectRole, onContinue }) {
  const initials = getInitials(userName);

  return (
    <main className="page-shell role-shell">
      <section className="role-page" aria-labelledby="role-title">
        <div className="role-header-block">
          <div className="role-avatar" aria-hidden="true">{initials}</div>
          <div>
            <h2 id="role-title" className="role-greeting">Welcome back, {userName}</h2>
            <p className="role-subtext">Select the role you want to work in today.</p>
          </div>
        </div>

        <div className="role-grid" aria-label="Available roles">
          {roleOptions.map((role, index) => {
            const isSelected = selectedRole === role.name;
            return (
              <button
                key={role.id}
                type="button"
                className={`role-card ${isSelected ? 'is-selected' : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => onSelectRole(role.name)}
                aria-pressed={isSelected}
              >
                <div className="role-card-icon-wrap"><RoleIcon name={role.name} /></div>
                <div className="role-card-content">
                  <div className="role-card-name">{role.name}</div>
                  <div className="role-card-description">{role.description}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="role-continue-row">
          <button type="button" className="btn-primary role-continue-btn" disabled={!selectedRole} onClick={onContinue}>
            Continue
          </button>
        </div>
      </section>
    </main>
  );
}
