import { env } from "../config/env.js";
import { InMemoryProgramRepository } from "./in-memory-program-repository.js";
import { SupabaseProgramRepository } from "./supabase-program-repository.js";

export function createRepository() {
  if (env.databaseMode === "supabase") {
    if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
      throw new Error("Supabase mode requires SUPABASE_URL and SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");
    }
    return new SupabaseProgramRepository({
      supabaseUrl: env.supabaseUrl,
      serviceRoleKey: env.supabaseServiceRoleKey
    });
  }

  return new InMemoryProgramRepository();
}
