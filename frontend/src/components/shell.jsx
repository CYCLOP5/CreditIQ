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

/** Generic "menu / bars" icon used as sidebar nav item icon. */
function SidebarNavIcon() {
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 6.5h15M4.5 12h15M4.5 17.5h15" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Dashboard-specific nav icons
// ---------------------------------------------------------------------------

function SearchIcon() {
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M15 15l4.5 4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function ChartBarIcon() {
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 19.5h15" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M7.5 15v-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M12 15V9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M16.5 15v-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function NetworkIcon() {
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="5" r="2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <circle cx="5" cy="19" r="2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <circle cx="19" cy="19" r="2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M12 7v4M10.27 16.5 6.7 17.27M13.73 16.5l3.57.77" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M10 11l-3.5 6M14 11l3.5 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function PulseIcon() {
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12h3l3-7 4 14 3-9 2 2h3" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

/** Returns the correct icon SVG for a dashboard nav item id. */
function DashNavIcon({ id }) {
  if (id === 'score-lookup') return <SearchIcon />;
  if (id === 'feature-contributions') return <ChartBarIcon />;
  if (id === 'fraud-topology') return <NetworkIcon />;
  if (id === 'system-health') return <PulseIcon />;
  return <SidebarNavIcon />;
}

// ---------------------------------------------------------------------------
// AppShell
//
// Props:
//   breadcrumb  - string shown in the topbar
//   userName    - used for avatar initials and footer
//   userRole    - shown in the sidebar footer
//   children    - page content
//
// Optional (for dynamic nav mode):
//   navItems    - array of { id: string, label: string }
//   activeNav   - id of the currently active nav item
//   onNavChange - (id: string) => void callback
//
// When navItems is omitted the sidebar renders the original static nav.
// ---------------------------------------------------------------------------

export function AppShell({
  breadcrumb,
  userName,
  userRole,
  children,
  navItems,
  activeNav,
  onNavChange,
}) {
  const initials = getInitials(userName);

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div>
          <div className="sidebar-brand">CreditIQ</div>

          <nav className="sidebar-nav" aria-label="Sections">
            {navItems ? (
              // Dynamic nav — used by the dashboard shell
              navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`sidebar-nav-item${activeNav === item.id ? ' is-active' : ''}`}
                  onClick={() => onNavChange?.(item.id)}
                  aria-current={activeNav === item.id ? 'page' : undefined}
                >
                  <DashNavIcon id={item.id} />
                  <span>{item.label}</span>
                </button>
              ))
            ) : (
              // Static nav — preserved for existing workflow pages
              <>
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
              </>
            )}
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
