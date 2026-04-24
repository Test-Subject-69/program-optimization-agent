export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
const API_TARGET = API_URL || "the same-origin /api proxy";
const SESSION_STORAGE_KEY = "wm-program-optimization-session";

let cachedSession = null;

function apiPath(path) {
  return `${API_URL}${path}`;
}

function objectKeys(value) {
  return value && typeof value === "object" ? Object.keys(value).slice(0, 5).join(", ") : typeof value;
}

function contractError(resource, data) {
  const keys = objectKeys(data) || "no top-level keys";
  return new Error(
    `${resource} returned unexpected data from ${API_TARGET}. ` +
      `Received: ${keys}. Run npm.cmd run doctor:local, then start the app with npm.cmd run dev.`
  );
}

function readStoredSession() {
  if (cachedSession) return cachedSession;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.user) return null;
    if (parsed.provider !== "supabase" && !parsed?.csrfToken) return null;
    cachedSession = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function setAuthSession(session) {
  cachedSession = session;
  if (typeof window !== "undefined") {
    if (session) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }
  return session;
}

export function getAuthSession() {
  return readStoredSession();
}

export async function createDemoSession(role = "admin") {
  const response = await fetch(apiPath("/api/auth/demo-session"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.token || !data?.csrfToken || !data?.user) {
    throw new Error(data.error ?? "Unable to create demo session");
  }
  return setAuthSession({ ...data, provider: "demo" });
}

function assertArrayResource(data, key, resource) {
  if (!data || typeof data !== "object" || !Array.isArray(data[key])) {
    throw contractError(resource, data);
  }
  return data;
}

function assertDashboard(data) {
  if (
    !data ||
    typeof data !== "object" ||
    !data.summary ||
    typeof data.summary !== "object" ||
    !Array.isArray(data.programs) ||
    !Array.isArray(data.anomalies) ||
    !Array.isArray(data.actions) ||
    !Array.isArray(data.trackedActions) ||
    !Array.isArray(data.recommendedActions) ||
    !Array.isArray(data.alerts) ||
    !Array.isArray(data.degradedSources) ||
    !Array.isArray(data.syncRuns) ||
    !data.thresholds
  ) {
    throw contractError("Dashboard endpoint", data);
  }
  return data;
}

function assertProgramDetail(data) {
  if (
    !data ||
    typeof data !== "object" ||
    !data.program ||
    typeof data.program !== "object" ||
    !Array.isArray(data.dataSources) ||
    !Array.isArray(data.anomalies) ||
    !Array.isArray(data.actions) ||
    !Array.isArray(data.trackedActions) ||
    !Array.isArray(data.recommendedActions) ||
    !Array.isArray(data.alerts) ||
    !Array.isArray(data.syncHistory) ||
    !Array.isArray(data.snapshots) ||
    !Array.isArray(data.auditTrail) ||
    !data.thresholds
  ) {
    throw contractError("Program detail endpoint", data);
  }
  return data;
}

function assertAnomalies(data) {
  if (!data || typeof data !== "object" || !data.summary || !Array.isArray(data.anomalies) || !data.thresholds) {
    throw contractError("Anomalies endpoint", data);
  }
  return data;
}

function assertActionResource(data) {
  if (!data || typeof data !== "object" || !data.action || typeof data.action !== "object") {
    throw contractError("Actions endpoint", data);
  }
  return data;
}

function assertAlertResource(data) {
  if (!data || typeof data !== "object" || !data.alert || typeof data.alert !== "object") {
    throw contractError("Alerts endpoint", data);
  }
  return data;
}

function assertProgramResource(data) {
  if (!data || typeof data !== "object" || !data.program || typeof data.program !== "object") {
    throw contractError("Programs endpoint", data);
  }
  return data;
}

function assertThresholds(data) {
  if (!data || typeof data !== "object" || !data.thresholds || typeof data.thresholds !== "object") {
    throw contractError("Thresholds endpoint", data);
  }
  return data;
}

function withQuery(path, query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path;
}

function buildHeaders(options = {}) {
  const headers = new Headers(options.headers ?? {});
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof Blob)) {
    headers.set("Content-Type", "application/json");
  }

  const session = getAuthSession();
  if (session?.token) {
    headers.set("Authorization", `Bearer ${session.token}`);
  }
  if (session?.csrfToken && ["POST", "PATCH", "PUT", "DELETE"].includes(String(options.method ?? "GET").toUpperCase())) {
    headers.set("X-CSRF-Token", session.csrfToken);
  }

  return headers;
}

async function request(path, options = {}) {
  return fetch(apiPath(path), {
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
    ...options,
    headers: buildHeaders(options)
  });
}

export async function api(path, options = {}) {
  const response = await request(path, options);

  let data;
  try {
    data = await response.json();
  } catch {
    if (!response.ok) throw new Error(`Request failed with status ${response.status} (non-JSON response)`);
    data = {};
  }

  if (!response.ok) {
    const error = new Error(data.error ?? "Request failed");
    if (Array.isArray(data.validationErrors)) error.validationErrors = data.validationErrors;
    if (data.syncRun) error.syncRun = data.syncRun;
    throw error;
  }

  return data;
}

async function downloadFile(path, fileName, fallbackType) {
  const response = await request(path, {});
  if (!response.ok) {
    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }
    throw new Error(data.error ?? "Download failed");
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(new Blob([blob], { type: blob.type || fallbackType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function loadDashboard() {
  return api("/api/dashboard").then(assertDashboard);
}

export function loadHealth() {
  return api("/health");
}

export function loadPrograms(filters = {}) {
  return api(withQuery("/api/programs", filters)).then((data) => assertArrayResource(data, "programs", "Programs endpoint"));
}

export function loadProgram(id) {
  return api(`/api/programs/${id}`).then(assertProgramDetail);
}

export function updateProgram(id, input) {
  return api(`/api/programs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  }).then(assertProgramResource);
}

export function deleteProgram(id) {
  return api(`/api/programs/${id}`, { method: "DELETE" });
}

export function loadAnomalies() {
  return api("/api/anomalies").then(assertAnomalies);
}

export function loadReports() {
  return api("/api/reports").then((data) => assertArrayResource(data, "reports", "Reports endpoint"));
}

export function loadDataSources() {
  return api("/api/data-sources").then((data) => {
    if (!data || typeof data !== "object" || !Array.isArray(data.dataSources) || !Array.isArray(data.syncRuns)) {
      throw contractError("Data sources endpoint", data);
    }
    return data;
  });
}

export function loadActions(filters = {}) {
  return api(withQuery("/api/actions", filters)).then((data) => assertArrayResource(data, "actions", "Actions endpoint"));
}

export function createAction(input) {
  return api("/api/actions", {
    method: "POST",
    body: JSON.stringify(input)
  }).then(assertActionResource);
}

export function updateAction(id, input) {
  return api(`/api/actions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  }).then(assertActionResource);
}

export function loadAlerts(filters = {}) {
  return api(withQuery("/api/alerts", filters)).then((data) => assertArrayResource(data, "alerts", "Alerts endpoint"));
}

export function updateAlert(id, input) {
  return api(`/api/alerts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  }).then(assertAlertResource);
}

export function deleteAlert(id) {
  return api(`/api/alerts/${id}`, { method: "DELETE" });
}

export function generateReport(input) {
  return api("/api/reports/generate", {
    method: "POST",
    body: JSON.stringify(input)
  }).then((data) => {
    if (!data || typeof data !== "object" || !data.report || typeof data.report !== "object") {
      throw contractError("Report generation endpoint", data);
    }
    return data;
  });
}

export function loadThresholds() {
  return api("/api/settings/thresholds").then(assertThresholds);
}

export function updateThresholds(input) {
  return api("/api/settings/thresholds", {
    method: "PATCH",
    body: JSON.stringify(input)
  }).then(assertThresholds);
}

export function resetSamples() {
  return api("/api/setup/seed", { method: "POST" });
}

export function downloadProgramsCsv() {
  return downloadFile("/api/programs/export/csv", "program-portfolio.csv", "text/csv");
}

export function downloadReportPdf(id) {
  return downloadFile(`/api/reports/${id}/export/pdf`, `${id}.pdf`, "application/pdf");
}
