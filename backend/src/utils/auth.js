import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

import { env } from "../config/env.js";
import { forbidden, unauthorized } from "./http.js";
import { isAllowedOrigin } from "./origins.js";

const roleRank = {
  "read-only": 0,
  operator: 1,
  admin: 2
};

let supabaseAuthClient = null;

function getSupabaseAuthClient() {
  if (!env.supabaseUrl || !env.supabaseAuthKey) return null;
  if (!supabaseAuthClient) {
    supabaseAuthClient = createClient(env.supabaseUrl, env.supabaseAuthKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });
  }
  return supabaseAuthClient;
}

const demoUsersByRole = {
  "read-only": {
    id: "demo-viewer",
    name: "Demo Viewer",
    role: "read-only"
  },
  operator: {
    id: "demo-operator",
    name: "Demo Operator",
    role: "operator"
  },
  admin: {
    id: "demo-admin",
    name: "Demo Admin",
    role: "admin"
  }
};

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function base64UrlToBuffer(value) {
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64");
}

function signMessage(message) {
  return createHmac("sha256", env.authJwtSecret).update(message).digest();
}

function issueToken(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = base64UrlEncode(signMessage(`${encodedHeader}.${encodedPayload}`));
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function parsePayload(token) {
  const [encodedHeader, encodedPayload, signature] = String(token ?? "").split(".");
  if (!encodedHeader || !encodedPayload || !signature) {
    throw unauthorized("Invalid token");
  }

  const expected = signMessage(`${encodedHeader}.${encodedPayload}`);
  const actual = base64UrlToBuffer(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw unauthorized("Invalid token signature");
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp && nowSeconds >= Number(payload.exp)) {
    throw unauthorized("Token expired");
  }
  if (payload.aud && payload.aud !== env.authJwtAudience) {
    throw unauthorized("Token audience mismatch");
  }
  if (payload.iss && payload.iss !== env.authJwtIssuer) {
    throw unauthorized("Token issuer mismatch");
  }

  return payload;
}

function normalizeRole(role) {
  if (role === "viewer") return "read-only";
  return roleRank[String(role)] !== undefined ? String(role) : "read-only";
}

async function resolveSupabaseActor(token) {
  const client = getSupabaseAuthClient();
  if (!client) return null;

  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) {
    throw unauthorized("Invalid Supabase session");
  }

  const user = data.user;
  const role = normalizeRole(user.app_metadata?.role ?? user.user_metadata?.role ?? env.defaultSupabaseRole);
  return {
    provider: "supabase",
    isAuthenticated: true,
    role,
    csrfToken: "",
    actor: {
      id: user.id,
      name: user.user_metadata?.name ?? user.user_metadata?.full_name ?? user.email ?? "Supabase user",
      email: user.email ?? "",
      role
    }
  };
}

export function createDemoSession(role = env.defaultDemoRole) {
  const normalizedRole = normalizeRole(role);
  const actor = demoUsersByRole[normalizedRole] ?? demoUsersByRole["read-only"];
  const csrfToken = randomBytes(24).toString("hex");
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    sub: actor.id,
    name: actor.name,
    role: actor.role,
    csrf: csrfToken,
    iss: env.authJwtIssuer,
    aud: env.authJwtAudience,
    iat: issuedAt,
    exp: issuedAt + env.authJwtTtlSeconds
  };

  return {
    token: issueToken(payload),
    csrfToken,
    user: actor
  };
}

export function authContextMiddleware(request, _response, next) {
  request.auth = {
    provider: "anonymous",
    isAuthenticated: false,
    role: "read-only",
    csrfToken: "",
    actor: {
      id: "anonymous-viewer",
      name: "Anonymous Viewer",
      role: "read-only"
    }
  };

  const authorization = request.headers.authorization;
  if (!authorization) return next();
  const [scheme, token] = String(authorization).split(" ");
  if (scheme !== "Bearer" || !token) {
      return next(unauthorized("Authorization header must use Bearer token"));
  }

  try {
    const payload = parsePayload(token);
    const role = normalizeRole(payload.role);
    request.auth = {
      provider: "demo",
      isAuthenticated: true,
      role,
      csrfToken: String(payload.csrf ?? ""),
      actor: {
        id: String(payload.sub ?? "unknown-user"),
        name: String(payload.name ?? "Unknown User"),
        role
      }
    };
    next();
  } catch (error) {
    resolveSupabaseActor(token)
      .then((auth) => {
        if (!auth) return next(error);
        request.auth = auth;
        next();
      })
      .catch(next);
  }
}

export function requireRole(minimumRole = "read-only") {
  return (request, _response, next) => {
    const requiredRank = roleRank[normalizeRole(minimumRole)] ?? roleRank["read-only"];
    const currentRank = roleRank[normalizeRole(request.auth?.role)] ?? -1;

    if (currentRank < 0 || !request.auth?.isAuthenticated) {
      return next(unauthorized());
    }

    if (currentRank < requiredRank) {
      return next(forbidden(`Requires ${minimumRole} access`));
    }

    next();
  };
}

export function requireCsrf(request, _response, next) {
  const method = String(request.method ?? "GET").toUpperCase();
  if (!["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
    return next();
  }

  if (!request.auth?.isAuthenticated) {
    return next(unauthorized());
  }

  const origin = request.headers.origin;
  if (origin && !isAllowedOrigin(origin)) {
    return next(forbidden("Origin mismatch"));
  }

  if (request.auth.provider === "supabase") {
    return next();
  }

  const token = request.headers["x-csrf-token"];
  if (!token || String(token) !== String(request.auth.csrfToken ?? "")) {
    return next(forbidden("Invalid CSRF token"));
  }

  next();
}
