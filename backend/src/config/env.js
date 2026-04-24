import "dotenv/config";

const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseSecretKey;
const supabasePublishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  "";

export const env = {
  port: Number(process.env.PORT ?? 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
  databaseMode: process.env.DATABASE_MODE ?? "memory",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey,
  supabasePublishableKey,
  supabaseAuthKey: supabasePublishableKey || supabaseServiceRoleKey,
  defaultSupabaseRole: process.env.DEFAULT_SUPABASE_ROLE ?? "admin",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  authJwtSecret: process.env.AUTH_JWT_SECRET ?? "walker-miller-demo-secret",
  authJwtIssuer: process.env.AUTH_JWT_ISSUER ?? "walker-miller-program-optimization-agent",
  authJwtAudience: process.env.AUTH_JWT_AUDIENCE ?? "program-optimization-ui",
  authJwtTtlSeconds: Number(process.env.AUTH_JWT_TTL_SECONDS ?? 43200),
  defaultDemoRole: process.env.DEFAULT_DEMO_ROLE ?? "admin"
};

if (env.databaseMode === "supabase") {
  if (!env.supabaseUrl) throw new Error("SUPABASE_URL is required when DATABASE_MODE=supabase");
  if (!env.supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required when DATABASE_MODE=supabase");
  }
}
