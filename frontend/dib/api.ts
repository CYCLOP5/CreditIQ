/**
 * Typed API client — all backend calls go through here.
 * Token is read from sessionStorage on every request (set by authContext).
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("msme_token");
}

async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((err as Record<string, string>).detail ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: Record<string, unknown> }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => apiFetch("/auth/logout", { method: "POST" }),
  me: () => apiFetch<Record<string, unknown>>("/auth/me"),
};

// ── Scores ────────────────────────────────────────────────────────────────────
export const scoreApi = {
  submit: (gstin: string) =>
    apiFetch<{ task_id: string; status: string }>("/score", {
      method: "POST",
      body: JSON.stringify({ gstin }),
    }),
  get: (taskId: string) =>
    apiFetch<Record<string, unknown>>(`/score/${taskId}`),
  chat: (taskId: string, body: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>(`/score/${taskId}/chat`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  health: () => apiFetch<Record<string, unknown>>("/health"),
};

// ── Loan Requests ─────────────────────────────────────────────────────────────
type Params = Record<string, string | undefined>;

function buildQs(params?: Params): string {
  if (!params) return "";
  const p = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
    ) as Record<string, string>,
  );
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const loanApi = {
  list: (params?: Params) =>
    apiFetch<unknown[]>(`/loan-requests${buildQs(params)}`),
  get: (lid: string) =>
    apiFetch<Record<string, unknown>>(`/loan-requests/${lid}`),
  create: (body: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>("/loan-requests", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getScore: (lid: string) =>
    apiFetch<Record<string, unknown>>(`/loan-requests/${lid}/score`),
  decide: (lid: string, body: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>(`/loan-requests/${lid}/decision`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
};

// ── Permissions ───────────────────────────────────────────────────────────────
export const permApi = {
  list: (params?: Params) =>
    apiFetch<unknown[]>(`/permissions${buildQs(params)}`),
  create: (body: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>("/permissions", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (pid: string, action: "approve" | "deny") =>
    apiFetch<Record<string, unknown>>(`/permissions/${pid}`, {
      method: "PUT",
      body: JSON.stringify({ action }),
    }),
};

// ── Disputes ──────────────────────────────────────────────────────────────────
export const disputeApi = {
  list: (params?: Params) => apiFetch<unknown[]>(`/disputes${buildQs(params)}`),
  create: (body: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>("/disputes", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  assign: (did: string) =>
    apiFetch<Record<string, unknown>>(`/disputes/${did}/assign`, {
      method: "PUT",
    }),
  resolve: (did: string, body: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>(`/disputes/${did}/resolve`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
};

// ── Reminders ─────────────────────────────────────────────────────────────────
export const reminderApi = {
  list: (gstin?: string) =>
    apiFetch<unknown[]>(`/reminders${gstin ? `?gstin=${gstin}` : ""}`),
  complete: (rid: string) =>
    apiFetch<Record<string, unknown>>(`/reminders/${rid}/complete`, {
      method: "PUT",
    }),
};

// ── Banks ─────────────────────────────────────────────────────────────────────
export const bankApi = {
  list: () => apiFetch<unknown[]>("/banks"),
  create: (body: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>("/banks", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (bid: string, body: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>(`/banks/${bid}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminApi = {
  getExplorerGstins: () => apiFetch<any[]>("/explorer/gstins"),
  getExplorerDetails: (gstin: string) => apiFetch<any>(`/explorer/${gstin}/details`),
  getUsers: () => apiFetch<unknown[]>("/users"),
  createUser: (body: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>("/users", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateUser: (uid: string, body: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>(`/users/${uid}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  resetUserPassword: (uid: string) =>
    apiFetch<Record<string, unknown>>(`/users/${uid}/reset-password`, {
      method: "POST",
    }),
  getApiKeys: () => apiFetch<unknown[]>("/api-keys"),
  createApiKey: (body: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>("/api-keys", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  revokeApiKey: (kid: string) =>
    apiFetch<Record<string, unknown>>(`/api-keys/${kid}/revoke`, {
      method: "PUT",
    }),
  rotateApiKey: (kid: string) =>
    apiFetch<Record<string, unknown>>(`/api-keys/${kid}/rotate`, {
      method: "PUT",
    }),
  getApiKeyUsage: (kid: string) =>
    apiFetch<Record<string, unknown>>(`/api-keys/${kid}/usage`),
  getAuditLog: () => apiFetch<unknown[]>("/audit-log"),
  replayAudit: (body: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>("/audit/replay", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getFraudAlerts: () => apiFetch<unknown[]>("/fraud-alerts"),
  getFraudAlert: (gstin: string) =>
    apiFetch<Record<string, unknown>>(`/fraud-alerts/${gstin}`),
  getRiskThresholds: () =>
    apiFetch<Record<string, unknown>>("/risk-thresholds"),
  updateRiskThresholds: (body: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>("/risk-thresholds", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  getScoreHistory: (gstin: string) =>
    apiFetch<unknown[]>(`/score-history?gstin=${gstin}`),
  getGlobalGraph: () =>
    apiFetch<Record<string, unknown>>("/transactions/graph"),
  getGstinGraph: (gstin: string) =>
    apiFetch<Record<string, unknown>>(`/transactions/${gstin}/graph`),
  getEwbDistribution: (gstin: string) =>
    apiFetch<Record<string, unknown>>(`/transactions/${gstin}/ewb-distribution`),
  getReceivablesGap: (gstin: string) =>
    apiFetch<Record<string, unknown>>(`/transactions/${gstin}/receivables-gap`),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notifApi = {
  list: (unread?: boolean) =>
    apiFetch<unknown[]>(`/notifications${unread ? "?unread=true" : ""}`),
  markRead: (nid: string) =>
    apiFetch<Record<string, unknown>>(`/notifications/${nid}/read`, {
      method: "PUT",
    }),
  markAllRead: () =>
    apiFetch<Record<string, unknown>>("/notifications/read-all", {
      method: "PUT",
    }),
};

// ── MSME ──────────────────────────────────────────────────────────────────────
export const msmeApi = {
  chat: (body: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>("/chat", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getGuideTopics: () => apiFetch<unknown[]>("/guide-topics"),
};

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsApi = {
  getCohortMedian: (category: string = "all") =>
    apiFetch<Record<string, unknown>>(
      `/analytics/cohort-median?msme_category=${category}`,
    ),
};
