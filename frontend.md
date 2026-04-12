# frontend architecture deep dive

full operational documentation of the next.js frontend layer for creditiq. this file explains every route, demo login accounts, role-based access, chatbot and voice assistant flows, notification mechanics, ui system patterns, and frontend-backend contracts.

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

## 2. demo login accounts

the login page ships with pre-configured demo identities. these are visible directly in the quick-login list on `/login`.

### core 6 workflow users

| user id | name | role | email | default redirect |
|---|---|---|---|---|
| `usr_001` | priya sharma | msme | `priya@bakerycraft.in` | `/msme/dashboard` |
| `usr_002` | rahul desai | msme | `rahul@boltautomotive.in` | `/msme/dashboard` |
| `usr_003` | imran shaikh | msme | `imran@textilezone.in` | `/msme/dashboard` |
| `usr_004` | anjali mehta | loan_officer | `anjali@sbiloans.co.in` | `/bank/loan-queue` |
| `usr_005` | vikram nair | credit_analyst | `vikram@analyst.platform.in` | `/analyst/shap-explorer` |
| `usr_006` | deepa krishnan | risk_manager | `deepa@risk.platform.in` | `/risk/fraud-queue` |

### platform admin user

| user id | name | role | email | default redirect |
|---|---|---|---|---|
| `usr_007` | arjun kapoor | admin | `arjun@admin.platform.in` | `/admin/overview` |

all demo users use the shared demo password configured in backend mock auth.

---

## 3. technology stack

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

## 4. app router structure

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
| `/bank/*` | `loan-queue`, `decisions`, `msme/[loan_request_id]` |
| `/analyst/*` | `shap-explorer`, `data-explorer`, `signal-trends`, `dispute-queue` |
| `/risk/*` | `fraud-queue`, `fraud-topology`, `thresholds` |
| `/admin/*` | `overview`, `api-keys`, `users`, `banks`, `audit-log` |

### api route

| route | purpose |
|---|---|
| `/api/chat` | frontend-side proxy endpoint used by report chat ui |

---

## 5. layout and provider pipeline

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

## 6. authentication model

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

## 7. api client architecture

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

## 8. notifications and shell interactions

notifications are managed globally through auth context + app shell.

### notification lifecycle

1. after login, `notifApi.list(false)` fetches notification state.
2. unread count is derived in context and displayed in shell.
3. individual read: `notifApi.markRead(id)`.
4. mark all read: `notifApi.markAllRead()`.

### shell ui behavior

- floating glassmorphism header with responsive collapse.
- role-mapped sidebar/menu entries.
- gsap-based notification panel open/close transitions.
- route transition fade/slide animation.
- mobile sheet navigation for small viewports.

---

## 9. async score flow (msme report)

`frontend/hooks/useScore.ts` implements the scoring saga polling from the ui side.

### lifecycle

1. submit gstin using `scoreApi.submit`.
2. persist `task_id` in `sessionStorage` as `msme_task_<gstin>`.
3. poll `scoreApi.get(task_id)` every 2 seconds.
4. stop on `complete` or `failed`.
5. expose `{ score, status, refresh }` to pages.

this gives resilient refresh behavior: if the page reloads, polling resumes from stored task id.

---

## 10. chat, voice assistant, and video features

### a. score report contextual chat (`/msme/score-report`)

- chat panel sends user message + current score payload context to `/api/chat`.
- response is streamed token-by-token into the ui.
- this acts as a contextual "explain my report" assistant tied to live score data.

### b. guide page multilingual chatbot (`/msme/guide`)

- built-in assistant panel with selectable language:
  - english, hindi, marathi, tamil, telugu, kannada
- user prompts stream through `/api/chat`.
- optional topic context (`selectedTopic`) is included in prompt payload.
- fallback message shows when backend/chat is unavailable.

### c. voice ai assistant embed (`/msme/guide`)

- page includes an interactive live avatar iframe:
  - `https://embed.liveavatar.com/v1/c82bf1c5-4229-4588-831c-746488888418`
- iframe requests microphone permission (`allow="microphone"`).
- this provides a speak-and-listen assistant experience in addition to text chat.

### d. video learning library (`/msme/guide`)

- curated module list with durations and youtube video ids.
- default modules include:
  - understanding your score
  - how to improve your score
  - applying for a loan
  - what is cgtmse
  - what is mudra
  - how to raise a dispute
- selected lesson loads youtube embed player with autoplay.
- guide topics can also be fetched dynamically using `msmeApi.getGuideTopics()`.

---

## 11. detailed page breakdown

### a. public and auth pages

| route | role | what the page contains |
|---|---|---|
| `/` | public | entry landing route |
| `/login` | public | demo quick-login cards, email/password auth form, role-based redirect |
| `/unauthorized` | any | guard fallback screen for blocked role access |

### b. msme pages

| route | primary data calls | key ui/features |
|---|---|---|
| `/msme/dashboard` | `loanApi.list` | personal overview cards, recent loan context |
| `/msme/score-report` | `useScore` via `scoreApi.submit/get` | score gauge, risk band, eligibility blocks, shap reasons, contextual streaming chat |
| `/msme/loans` | `loanApi.list/create`, `permApi.list/update`, `bankApi.list` | loan request creation, approval permission workflow, bank selection |
| `/msme/disputes` | `disputeApi.list/create` | raise and track fraud disputes |
| `/msme/reminders` | `reminderApi.list/complete` | compliance/repayment reminder timeline and completion toggles |
| `/msme/guide` | `msmeApi.getGuideTopics` + `/api/chat` | multilingual chatbot, youtube learning modules, interactive voice avatar |

### c. bank pages

| route | primary data calls | key ui/features |
|---|---|---|
| `/bank/loan-queue` | `loanApi.list`, `permApi.list/create` | active request triage and permission workflow |
| `/bank/decisions` | `loanApi.list` | approved/denied history and decision audit visibility |
| `/bank/msme/[loan_request_id]` | `loanApi.get`, `loanApi.getScore`, `loanApi.decide`, `permApi.list` | deep borrower profile, scoring context, final approve/deny action panel |

### d. credit analyst pages

| route | primary data calls | key ui/features |
|---|---|---|
| `/analyst/shap-explorer` | `scoreApi.submit/get`, `analyticsApi.getCohortMedian`, `adminApi.getEwbDistribution/getReceivablesGap` | full shap explorer, smurfing histogram, gst-vs-upi receivables gap chart |
| `/analyst/data-explorer` | `adminApi.getExplorerGstins/getExplorerDetails` | raw entity 360 data explorer for generated records |
| `/analyst/signal-trends` | `adminApi.getScoreHistory/getRiskThresholds` | historical trend lines with threshold and amnesty overlays |
| `/analyst/dispute-queue` | `disputeApi.list/assign/resolve`, `adminApi.getGstinGraph` | dispute operations, evidence graph lookup, resolution actions |

### e. risk manager pages

| route | primary data calls | key ui/features |
|---|---|---|
| `/risk/fraud-queue` | `adminApi.getFraudAlerts/getFraudAlert` | prioritized fraud alert review and detail drill-down |
| `/risk/fraud-topology` | `adminApi.getGlobalGraph/getFraudAlerts` | interactive 3d transaction graph, confidence filtering, node selection, pagerank ranking chart |
| `/risk/thresholds` | `adminApi.getRiskThresholds/updateRiskThresholds` | risk band controls and amnesty settings management |

### f. admin pages

| route | primary data calls | key ui/features |
|---|---|---|
| `/admin/overview` | `scoreApi.health`, `adminApi.getUsers/getAuditLog`, `bankApi.list` | system health and governance summary dashboard |
| `/admin/api-keys` | `adminApi.getApiKeys/createApiKey/revokeApiKey/rotateApiKey/getApiKeyUsage`, `bankApi.list` | api key lifecycle and usage visibility |
| `/admin/users` | `adminApi.getUsers/updateUser/resetUserPassword`, `bankApi.list` | user state changes, role-level account governance |
| `/admin/banks` | `bankApi.list/create/update` | bank registry and institution status control |
| `/admin/audit-log` | `adminApi.getAuditLog/getUsers/replayAudit` | immutable activity view and audit replay actions |

---

## 12. visualisation components

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

## 13. ui system notes

- component primitives come from `components/ui` (radix + shadcn pattern).
- shared semantic widgets (`PageHeader`, `RiskBadge`, `StatusBadge`, `ScoreGauge`) keep cross-role pages visually consistent.
- charts combine explanatory badges, legends, and conditional callouts for analyst readability.
- motion is intentional rather than decorative:
  - shell transitions
  - notification panel reveal/hide
  - graph camera fly-to interaction

---

## 14. frontend-backend contract notes

- frontend expects async score contract: `pending/processing/complete/failed`.
- most role pages call backend directly through typed wrappers in `dib/api.ts`.
- chat interaction goes through `/api/chat` to avoid exposing provider details directly in page components.
- if backend is down, pages surface graceful errors and retry buttons rather than crashing.

---

## 15. run and verification

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
3. open notifications panel and verify unread/read behavior.
4. open msme guide and verify text chatbot response streaming.
5. verify voice assistant iframe loads and microphone permission prompt appears.
6. play at least one youtube lesson from guide modules.
7. open risk topology and verify 3d graph loads.
8. open analyst shap explorer and verify chart panels render.
9. open admin pages and ensure crud operations call backend without auth header issues.

---

## 16. frontend folder map

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
