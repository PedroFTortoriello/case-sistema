import type { PostgrestSingleResponse, PostgrestResponse } from "@supabase/supabase-js";
import { AppError, NotFoundError } from "../errors/app-error";
import { getSupabaseUserClient } from "../supabase/user-client";
import type {
  AuditLogInput,
  AuditLogRecord,
  AuditService,
} from "../services/container";

const SENSITIVE_KEY_PATTERN =
  /(token|authorization|password|secret|certificate|certificado|private.?key|service.?role|anon.?key)/i;

function sanitizeMetadata(value: unknown, depth = 0): unknown {
  if (value == null) {
    return {};
  }

  if (depth > 4) {
    return "[truncated]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeMetadata(item, depth + 1));
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
      (accumulator, [key, nestedValue]) => {
        if (SENSITIVE_KEY_PATTERN.test(key)) {
          return accumulator;
        }

        accumulator[key] = sanitizeMetadata(nestedValue, depth + 1);
        return accumulator;
      },
      {},
    );
  }

  if (typeof value === "string" && value.length > 2048) {
    return `${value.slice(0, 2048)}...[truncated]`;
  }

  return value;
}

function normalizeWriteError(response: PostgrestSingleResponse<unknown> | PostgrestResponse<unknown>) {
  if (!response.error) {
    return;
  }

  if (response.error.code === "PGRST116") {
    throw new NotFoundError("Registro solicitado nao foi encontrado.");
  }

  throw new AppError(500, "Falha ao executar operacao no banco de dados.", "DATABASE_ERROR");
}

export class SupabaseAuditService implements AuditService {
  async log(input: AuditLogInput) {
    const supabase = getSupabaseUserClient(input.accessToken);

    const response = await supabase.from("audit_logs").insert({
      action: input.action,
      actor_user_id: input.actorUserId,
      entity_id: input.entityId,
      entity_type: input.entityType,
      ip_address: input.ipAddress ?? null,
      module: input.module,
      organization_id: input.organizationId,
      payload: sanitizeMetadata(input.metadata),
      user_agent: input.userAgent ?? null,
    });

    normalizeWriteError(response);
  }

  async list({
    accessToken,
    limit = 50,
    organizationId,
  }: {
    accessToken: string;
    organizationId: string;
    limit?: number;
  }): Promise<AuditLogRecord[]> {
    const supabase = getSupabaseUserClient(accessToken);

    const response = await supabase
      .from("audit_logs")
      .select(
        "id, organization_id, actor_user_id, module, action, entity_type, entity_id, trace_id, ip_address, user_agent, payload, created_at",
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    normalizeWriteError(response);

    return (response.data ?? []).map((record) => ({
      action: record.action,
      actorUserId: record.actor_user_id,
      createdAt: record.created_at,
      entityId: record.entity_id,
      entityType: record.entity_type,
      id: record.id,
      ipAddress: record.ip_address,
      module: record.module,
      organizationId: record.organization_id,
      payload: record.payload ?? {},
      traceId: record.trace_id,
      userAgent: record.user_agent,
    }));
  }
}
