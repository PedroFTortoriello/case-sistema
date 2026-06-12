import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env";
import { ConfigurationError } from "../errors/app-error";

let serviceRoleClient: SupabaseClient | null = null;

export function getSupabaseServiceRoleClient(reason: string): SupabaseClient {
  if (!reason.trim()) {
    throw new ConfigurationError(
      "O client privilegiado do Supabase exige uma justificativa explicita de uso interno.",
    );
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new ConfigurationError(
      "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios para rotinas internas privilegiadas.",
    );
  }

  if (!serviceRoleClient) {
    serviceRoleClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
  }

  return serviceRoleClient;
}
