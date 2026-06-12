import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3001),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  NFSE_CERTIFICATE_STORE_JSON: z.string().optional(),
  NFSE_CREDENTIAL_STORE_JSON: z.string().optional(),
  NFSE_NATIONAL_HTTP_TIMEOUT_MS: z.coerce.number().default(15000),
  NFSE_NATIONAL_HOMOLOGATION_SEFIN_BASE_URL: z.string().url().optional(),
  NFSE_NATIONAL_HOMOLOGATION_PARAMS_BASE_URL: z.string().url().optional(),
  NFSE_NATIONAL_HOMOLOGATION_ADN_BASE_URL: z.string().url().optional(),
  NFSE_NATIONAL_HOMOLOGATION_DANFSE_BASE_URL: z.string().url().optional(),
  NFSE_NATIONAL_HOMOLOGATION_DANFSE_PATH_TEMPLATE: z.string().optional(),
});

const parsed = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NFSE_CERTIFICATE_STORE_JSON: process.env.NFSE_CERTIFICATE_STORE_JSON,
  NFSE_CREDENTIAL_STORE_JSON: process.env.NFSE_CREDENTIAL_STORE_JSON,
  NFSE_NATIONAL_HTTP_TIMEOUT_MS: process.env.NFSE_NATIONAL_HTTP_TIMEOUT_MS,
  NFSE_NATIONAL_HOMOLOGATION_SEFIN_BASE_URL: process.env.NFSE_NATIONAL_HOMOLOGATION_SEFIN_BASE_URL,
  NFSE_NATIONAL_HOMOLOGATION_PARAMS_BASE_URL: process.env.NFSE_NATIONAL_HOMOLOGATION_PARAMS_BASE_URL,
  NFSE_NATIONAL_HOMOLOGATION_ADN_BASE_URL: process.env.NFSE_NATIONAL_HOMOLOGATION_ADN_BASE_URL,
  NFSE_NATIONAL_HOMOLOGATION_DANFSE_BASE_URL: process.env.NFSE_NATIONAL_HOMOLOGATION_DANFSE_BASE_URL,
  NFSE_NATIONAL_HOMOLOGATION_DANFSE_PATH_TEMPLATE: process.env.NFSE_NATIONAL_HOMOLOGATION_DANFSE_PATH_TEMPLATE,
});

export const env = {
  ...parsed,
  allowedOrigins: parsed.ALLOWED_ORIGINS.split(",").map((item) => item.trim()),
};
