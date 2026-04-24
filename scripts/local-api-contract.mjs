import { execFileSync } from "node:child_process";

export const APP_NAME = "program-optimization-agent";
export const DEFAULT_BACKEND_PORT = "4000";

export function localApiUrl(env = process.env) {
  const url = env.API_ORIGIN ?? env.NEXT_PUBLIC_API_URL ?? `http://localhost:${env.PORT ?? DEFAULT_BACKEND_PORT}`;
  return String(url).replace(/\/+$/, "");
}

export function isDashboardPayload(data) {
  return (
    data &&
    typeof data === "object" &&
    data.summary &&
    typeof data.summary === "object" &&
    Array.isArray(data.programs) &&
    Array.isArray(data.dataSources) &&
    Array.isArray(data.anomalies) &&
    Array.isArray(data.actions)
  );
}

export function topLevelKeys(data) {
  if (!data || typeof data !== "object") return typeof data;
  return Object.keys(data).slice(0, 6).join(", ") || "no top-level keys";
}

export function portFromUrl(apiUrl) {
  try {
    const parsed = new URL(apiUrl);
    return parsed.port || (parsed.protocol === "https:" ? "443" : "80");
  } catch {
    return "";
  }
}

export function isLocalUrl(apiUrl) {
  try {
    const { hostname } = new URL(apiUrl);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

export function listeningPids(apiUrl) {
  const port = portFromUrl(apiUrl);
  if (!port || process.platform !== "win32") return [];

  try {
    const output = execFileSync("netstat", ["-ano"], { encoding: "utf8" });
    const pids = output
      .split(/\r?\n/)
      .filter((line) => line.includes(`:${port}`) && line.includes("LISTENING"))
      .map((line) => line.trim().split(/\s+/).at(-1))
      .filter(Boolean);
    return [...new Set(pids)];
  } catch {
    return [];
  }
}

async function fetchJson(url, timeoutMs = 2500) {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs)
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return data;
}

export async function checkLocalApi(apiUrl = localApiUrl()) {
  try {
    const [health, dashboard] = await Promise.all([
      fetchJson(`${apiUrl}/health`),
      fetchJson(`${apiUrl}/api/dashboard`)
    ]);

    if (!isDashboardPayload(dashboard)) {
      return {
        ok: false,
        reason: "wrong-contract",
        health,
        received: topLevelKeys(dashboard)
      };
    }

    if (health.app && health.app !== APP_NAME) {
      return {
        ok: false,
        reason: "wrong-app",
        health,
        received: `health app ${health.app}`
      };
    }

    return { ok: true, health, dashboard };
  } catch (error) {
    return {
      ok: false,
      reason: "unreachable",
      error
    };
  }
}

export function formatApiFailure(apiUrl, result) {
  const lines = [
    "Local API check failed.",
    `Expected the Program Optimization Agent backend at ${apiUrl}.`
  ];

  if (result.reason === "wrong-contract" || result.reason === "wrong-app") {
    lines.push(`Received: ${result.received}.`);
  } else {
    lines.push(`Unable to reach ${apiUrl}/health and ${apiUrl}/api/dashboard.`);
    if (result.error?.message) lines.push(`Reason: ${result.error.message}`);
  }

  const pids = listeningPids(apiUrl);
  if (pids.length) {
    lines.push(`Port ${portFromUrl(apiUrl)} is currently owned by PID(s): ${pids.join(", ")}.`);
  }

  lines.push("Start both local services with: npm.cmd run dev");
  lines.push("If another app owns the port, stop it or set API_ORIGIN to the correct backend URL.");

  return lines.join("\n");
}
