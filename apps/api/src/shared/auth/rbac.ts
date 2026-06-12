import { getRequestAccessToken } from "./token";
import { ForbiddenError } from "../errors/app-error";
import type { Context } from "../http/context";
import type { AppBindings, AppRole, Permission } from "../context/tenant";

export const rolePermissionMap: Record<AppRole, Permission[]> = {
  administrator: [
    "dashboard.view",
    "finance.view",
    "finance.charge.manage",
    "fiscal.settings.view",
    "fiscal.document.view",
    "fiscal.document.prepare",
    "fiscal.document.issue",
    "fiscal.document.reconcile",
    "fiscal.document.cancel",
    "fiscal.settings.manage",
    "operations.view",
    "operations.process.manage",
    "operations.awb.manage",
    "operations.documents.manage",
    "reference.view",
    "reference.manage",
    "reports.view",
    "admin.view",
    "admin.audit.view",
    "admin.users.manage",
  ],
  financeiro: [
    "dashboard.view",
    "finance.view",
    "finance.charge.manage",
    "fiscal.settings.view",
    "fiscal.document.view",
    "fiscal.document.prepare",
    "fiscal.document.issue",
    "fiscal.document.reconcile",
    "fiscal.document.cancel",
    "fiscal.settings.manage",
    "reference.view",
    "reports.view",
  ],
  operacional: [
    "dashboard.view",
    "operations.view",
    "operations.process.manage",
    "operations.awb.manage",
    "operations.documents.manage",
    "reference.view",
  ],
  comercial: ["dashboard.view", "reference.view", "reports.view"],
  diretor: [
    "dashboard.view",
    "finance.view",
    "finance.charge.manage",
    "fiscal.settings.view",
    "fiscal.document.view",
    "fiscal.document.prepare",
    "fiscal.document.issue",
    "fiscal.document.reconcile",
    "fiscal.document.cancel",
    "fiscal.settings.manage",
    "operations.view",
    "operations.process.manage",
    "operations.awb.manage",
    "operations.documents.manage",
    "reference.view",
    "reports.view",
    "admin.view",
    "admin.audit.view",
  ],
};

export function resolvePermissions(role: AppRole): Permission[] {
  return [...(rolePermissionMap[role] ?? [])];
}

async function auditAuthorizationFailure(c: Context<AppBindings>, permission: Permission) {
  const accessToken = getRequestAccessToken(c);

  if (!accessToken) {
    return;
  }

  const auth = c.get("auth");
  const services = c.get("services");

  try {
    await services.auditService.log({
      accessToken,
      action: "authorization.denied",
      actorUserId: auth.userId,
      entityId: permission,
      entityType: "permission",
      ipAddress: c.req.header("x-forwarded-for") ?? null,
      metadata: {
        method: c.req.method,
        path: c.req.path,
        requiredPermission: permission,
        role: auth.role,
      },
      module: "security",
      organizationId: auth.organizationId,
      userAgent: c.req.header("user-agent") ?? null,
    });
  } catch {
    // Falhas de auditoria nao podem liberar acesso indevido.
  }
}

export async function requirePermission(c: Context<AppBindings>, permission: Permission) {
  const auth = c.get("auth");

  if (!auth.permissions.includes(permission)) {
    await auditAuthorizationFailure(c, permission);

    throw new ForbiddenError(`Perfil ${auth.role} nao possui a permissao ${permission}.`);
  }

  return auth;
}
