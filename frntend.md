# frontend architecture deep dive

full operational documentation of the next.js frontend layer for creditiq. this file explains routing, auth, data flow, visualisation components, role-based experiences, and how ui calls map to backend endpoints.

---

## 1. frontend mission

the frontend is built to serve **five different personas** from a single codebase:

| persona | main objective | landing route |
|---|---|---|
| msme owner | understand score and improve eligibility | `/msme/dashboard` |
| loan officer | review applications and make lending decisions | `/bank/loan-queue` |
| credit analyst | inspect feature vectors and shap drivers | `/analyst/shap-explorer` |
| risk manager | monitor fraud rings and set thresholds | `/risk/fraud-queue` |
| admin | manage users, api keys, and governance | `/admin/overview` |

instead of separate apps per role, creditiq uses a **single app-router shell** with role-aware navigation and page guards.

---

## 2. technology stack

| layer | technology | where used |
|---|---|---|
| framework | next.js app router | `frontend/app/` |
| language | typescript + react 19 | all pages/components |
| styling | tailwindcss + shadcn/radix ui | `frontend/components/ui/` |
| charts | recharts | analyst + risk dashboards |
| graph visualisation | three.js via `3d-force-graph` | fraud topology |
| animation | gsap + lenis | shell transitions + smooth scrolling |
| theming | next-themes | global provider |
| llm chat sdk | `@openrouter/sdk` (plus backend proxy route) | chat flow |

---

## 3. app router structure

### top-level routes

| route | purpose |
|---|---|
| `/` | entry/home page |
| `/login` | role login with demo users |
| `/unauthorized` | guard fallback page |

### role route groups

| group | routes |
|---|---|
| `/msme/*` | `dashboard`, `score-report`, `loans`, `disputes`, `reminders`, `guide` |
| `/bank/*` | `loan-queue`, `decisions` |
| `/analyst/*` | `shap-explorer`, `data-explorer`, `signal-trends`, `dispute-queue` |
| `/risk/*` | `fraud-queue`, `fraud-topology`, `thresholds` |
| `/admin/*` | `overview`, `api-keys`, `users`, `banks`, `audit-log` |

### api route

| route | purpose |
|---|---|
| `/api/chat` | frontend-side proxy endpoint used by report chat ui |

---

## 4. layout and provider pipeline

root composition in `frontend/app/layout.tsx` + `frontend/components/Providers.tsx`:

```text
RootLayout
  -> ReactLenis (smooth scrolling)
    -> AuthProvider (session + login state)
      -> AppShell (top nav, role menus, notifications)
        -> route page content
```

this means all authenticated pages get a consistent shell, while login and unauth pages can still render safely.

---

## 5. authentication model

auth lives in `frontend/dib/authContext.tsx` and is intentionally simple for demo speed:

1. `login(email, password)` calls `authApi.login`.
2. jwt-like token is stored in `sessionStorage` as `msme_token`.
3. user profile is stored in `sessionStorage` as `msme_user`.
4. app boot restores session from storage on route changes.
5. notifications are fetched after login and exposed through context.
6. logout clears storage and redirects to `/login`.

### role guard pattern

each role page checks `user.role` in `useEffect` and redirects unauthorized users to `/unauthorized`.

example behavior:
- visiting `/risk/fraud-topology` as non-`risk_manager` immediately redirects.
- visiting `/analyst/shap-explorer` as non-`credit_analyst` immediately redirects.

---

## 6. api client architecture

all backend calls go through `frontend/dib/api.ts`.

### core pattern

- `API_BASE = NEXT_PUBLIC_API_URL ?? "/api"`
- every request uses `cache: "no-store"`
- `Authorization: Bearer <token>` is auto-injected when present
- non-2xx responses are normalized into thrown errors

### grouped api clients

| client object | primary endpoints |
|---|---|
| `authApi` | login/logout/me |
| `scoreApi` | submit score, poll status, chat, health |
| `loanApi` | loan request lifecycle |
| `permApi` | permission approvals |
| `disputeApi` | dispute queue actions |
| `reminderApi` | reminders list/complete |
| `bankApi` | bank config CRUD |
| `adminApi` | users, api keys, audit replay, fraud + graph data |
| `notifApi` | notifications read state |
| `msmeApi` | chat + guide topics |
| `analyticsApi` | cohort medians and analytics |

this keeps page components focused on ui logic while transport/auth concerns stay centralized.

---

## 7. async score flow (msme report)

`frontend/hooks/useScore.ts` implements the scoring saga polling from the ui side.

### lifecycle

1. submit gstin using `scoreApi.submit`.
2. persist `task_id` in `sessionStorage` as `msme_task_<gstin>`.
3. poll `scoreApi.get(task_id)` every 2 seconds.
4. stop on `complete` or `failed`.
5. expose `{ score, status, refresh }` to pages.

this gives resilient refresh behavior: if the page reloads, polling resumes from stored task id.

---

## 8. page-level ux behavior

### login experience (`/login`)

- includes predefined quick-login personas matching backend demo users.
- redirects by role using map:
  - `msme` -> `/msme/dashboard`
  - `loan_officer` -> `/bank/loan-queue`
  - `credit_analyst` -> `/analyst/shap-explorer`
  - `risk_manager` -> `/risk/fraud-queue`
  - `admin` -> `/admin/overview`

### msme score report (`/msme/score-report`)

- renders score gauge, risk band, eligibility cards, shap driver bars.
- supports refresh/retry states for pending/failed jobs.
- includes a streaming chat panel via `/api/chat` with score context payload.

### shap explorer (`/analyst/shap-explorer`)

- accepts arbitrary gstin lookup.
- submits score job then polls to completion.
- renders:
  - shap waterfall contribution bars
  - e-way bill smurfing histogram
  - gst vs upi receivables gap chart
  - cohort medians summary card

### fraud topology (`/risk/fraud-topology`)

- uses dynamic import of `ForceGraph3DComponent` with `ssr: false`.
- loads global graph + fraud alerts from admin endpoints.
- applies confidence filter + flagged-only toggle.
- renders ranked pagerank bar chart to identify potential shell hubs.

---

## 9. shell, navigation, and interaction design

`frontend/components/AppShell.tsx` provides the global interaction contract:

- role-based menu map (`NAV_ITEMS`) controls visible links.
- floating, animated glass header with mobile sheet nav.
- notifications tray with gsap open/close transitions.
- route-change entrance animations for page content.

because shell logic is centralized, all persona areas inherit the same navigation and notification model.

---

## 10. visualisation components

### 2d analytics

recharts powers bar/line/comparison charts on analyst and risk pages for quick quantitative interpretation.

### 3d fraud network

`frontend/components/ForceGraph3DComponent.tsx`:

- lazily imports `3d-force-graph` in client runtime.
- maps fraud flags to node color (`red` flagged, `teal` clean).
- animates directional particles on edges to show flow.
- supports click-to-focus camera transitions per node.
- uses `ResizeObserver` for responsive canvas width updates.

this gives risk teams a live topology view rather than static fraud tables.

---

## 11. frontend-backend contract notes

- frontend expects async score contract: `pending/processing/complete/failed`.
- most role pages call backend directly through typed wrappers in `dib/api.ts`.
- chat interaction goes through `/api/chat` to avoid exposing provider details directly in page components.
- if backend is down, pages surface graceful errors and retry buttons rather than crashing.

---

## 12. run and verification

from repository root:

```bash
cd frontend
pnpm install
pnpm dev
```

app default dev url: `http://localhost:3000`

recommended smoke checks:

1. login as each demo persona and confirm route redirection.
2. trigger score lookup and observe pending -> complete transition.
3. open risk topology and verify 3d graph loads.
4. open analyst shap explorer and verify chart panels render.
5. open admin pages and ensure crud operations call backend without auth header issues.

---

## 13. frontend folder map

```text
frontend/
├── app/                 # next app-router pages + route handlers
├── components/          # shell, graphs, shared blocks, ui primitives
├── dib/                 # api client, auth context, utils, mock labels
├── hooks/               # reusable async hooks (useScore, etc.)
├── styles/              # global styles
├── public/              # static assets
└── package.json         # scripts and dependencies
```

this architecture keeps auth/state transport isolated from visual layers, enabling role-specific ui growth without rewriting the base shell.
