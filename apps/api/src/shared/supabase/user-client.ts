import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env";
import { ConfigurationError } from "../errors/app-error";

export function getSupabaseUserClient(accessToken: string): SupabaseClient {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new ConfigurationError(
      "SUPABASE_URL e SUPABASE_ANON_KEY sao obrigatorios para autenticar e consultar dados do usuario.",
    );
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
