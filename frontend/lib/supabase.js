import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

let browserClient = null;

function normalizeRole(role) {
  if (role === "viewer") return "read-only";
  return ["read-only", "operator", "admin"].includes(String(role)) ? String(role) : "read-only";
}

export function isSupabaseAuthConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

export function getSupabaseClient() {
  if (!isSupabaseAuthConfigured()) return null;
  if (!browserClient) {
    browserClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
  }
  return browserClient;
}

export function toAppSession(supabaseSession) {
  if (!supabaseSession?.access_token || !supabaseSession?.user) return null;

  const user = supabaseSession.user;
  const role = normalizeRole(user.app_metadata?.role ?? user.user_metadata?.role);
  const name =
    user.user_metadata?.name ??
    user.user_metadata?.full_name ??
    user.email ??
    "Supabase user";

  return {
    provider: "supabase",
    token: supabaseSession.access_token,
    csrfToken: "",
    expiresAt: supabaseSession.expires_at ?? null,
    user: {
      id: user.id,
      name,
      email: user.email ?? "",
      role
    }
  };
}
