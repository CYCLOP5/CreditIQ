import React from 'react';
import { getInitials } from '../lib/utils';

function BellIcon() {
  return (
    <svg className="topbar-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4.5a4.75 4.75 0 0 0-4.75 4.75v2.17c0 .66-.15 1.3-.42 1.88l-.78 1.62h12.9l-.78-1.62c-.27-.58-.42-1.22-.42-1.88V9.25A4.75 4.75 0 0 0 12 4.5Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M9.5 18.5a2.5 2.5 0 0 0 5 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function SidebarNavIcon() {
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 6.5h15M4.5 12h15M4.5 17.5h15" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

export function AppShell({ breadcrumb, userName, userRole, children }) {
  const initials = getInitials(userName);

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div>
          <div className="sidebar-brand">CreditIQ</div>
          <nav className="sidebar-nav" aria-label="Sections">
            <button type="button" className="sidebar-nav-item is-active">
              <SidebarNavIcon />
              <span>Onboarding</span>
            </button>
            <button type="button" className="sidebar-nav-item">
              <SidebarNavIcon />
              <span>Dashboard</span>
            </button>
            <button type="button" className="sidebar-nav-item">
              <SidebarNavIcon />
              <span>Applications</span>
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-role-label">Current role</div>
          <div className="sidebar-role-value">{userRole}</div>
          <div className="sidebar-user-row">
            <div className="sidebar-avatar">{initials}</div>
            <div>
              <div className="sidebar-user-name">{userName}</div>
              <div className="sidebar-user-meta">Signed in</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="breadcrumb">{breadcrumb}</div>
          <div className="topbar-actions">
            <button type="button" className="icon-button" aria-label="Notifications">
              <BellIcon />
            </button>
            <div className="topbar-avatar" aria-hidden="true">
              {initials}
            </div>
          </div>
        </header>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
