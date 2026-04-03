# Frontend Architecture & API Integration

This document outlines the architecture, routing layout, and data-fetching strategy of the system's Next.js frontend, demonstrating how our interactive full-stack features are bound to the FastAPI backend.

## Overview

The web application is built using **Next.js 14+ (App Router)** and styled with **Tailwind CSS**, paired with **Shadcn UI** for modern, resilient components. The entire platform runs over live API endpoints mapping to exactly match our backend capabilities—no critical data is hard-coded or strictly mocked on the client side.

## Directory Structure

The frontend code resides in the `frontend/` folder with the following key directories:

- `/app`: The core route directory leveraging the App Router.
  - `/msme`: Workflows oriented to standard business users (Dashboard, Loan Requests, Disputes, Score Reports, Notifications).
  - `/analyst`: Interfaces for Credit Analysts (Cohort Medians via SHAP Explorer, Dispute Queue Assign/Resolve).
  - `/admin`: Super-user capabilities (User creation, Password resets, Bank configurations, full API Key rotation/usage metrics, Audit Log replays).
  - `/risk`: Interfaces for Risk Managers (Fraud queues, Threshold management, and Fraud Topology graph visualization).
- `/components`: Reusable UI pieces.
  - `/ui`: Fundamental shadcn components.
  - `/shared`: Cross-portal widgets (e.g., `PageHeader`, `ScoreGauge`, `RiskBadge`).
  - `AppShell.tsx`: Global authenticated layout wrapping dashboard navigation and the notification bell.
- `/dib`: Frontend-side infrastructure.
  - `api.ts`: Highly modular HTTP fetch wrapper routing payloads safely to the Python backend.
  - `authContext.tsx`: React Context managing local session state, tokens, and notification polling.
- `/hooks`: Custom React hooks connecting component intent to background processes (e.g., `useScore.ts` for polling long-running background tasks).

## API Connectors & Data Fetching

We centralize all server-side interactions in `frontend/dib/api.ts`. An overarching function called `apiFetch` dynamically binds JWTs and catches unauthorized cascades globally.

### Selected Service Sub-modules
* **`scoreApi`**: Asynchronously calls `POST /score` and invokes `useScore.ts` to cleanly poll `GET /score/{task_id}` for status updates before rendering SHAP graphics. Now supports `POST /score/{task_id}/chat` for interactive metric queries.
* **`adminApi`**: Triggers full suite of user administration tasks like `resetUserPassword()` and audit log re-execution via `replayAudit()`.
* **`msmeApi`**: Wraps educational video fetching and conversational AI chats.
* **`analyticsApi`**: Queries population medians and aggregated cohorts to set mathematical context for analyst explorations. 

## State Management

State within standard flows leverages localized React `<useState>` combined with custom hooks for async pipelines.

* **Authentication & Layout state**: Managed by `<AuthContext.Provider>`, caching the active `Session` and `JWT` across browser navigation.
* **Notifications**: `<AuthContext.Provider>` routinely fetches `GET /notifications` mapping the data directly to the active users `<AppShell>` bell component.
* **Credit Analysis**: To ensure the user has uninterrupted navigation while waiting for backend pipelines, the frontend defers heavy SHAP graphs by registering task IDs in `sessionStorage` and utilizing `useScore` polling mechanisms.
