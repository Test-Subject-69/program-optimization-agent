import { env } from "../config/env.js";

const localOrigins = new Set(["http://localhost:3000", "http://127.0.0.1:3000"]);

function configuredOrigins() {
  return String(env.frontendOrigin ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

export function isAllowedOrigin(origin) {
  if (!origin) return true;
  const normalizedOrigin = String(origin).trim().replace(/\/+$/, "");
  if (localOrigins.has(normalizedOrigin)) return true;
  if (configuredOrigins().includes(normalizedOrigin)) return true;
  return /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(normalizedOrigin);
}

export function corsOrigin(origin, callback) {
  if (isAllowedOrigin(origin)) {
    callback(null, origin || true);
    return;
  }
  callback(new Error(`Origin is not allowed: ${origin}`));
}
