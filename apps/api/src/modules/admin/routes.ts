import { Router } from "../../shared/http/router";
import { zValidator } from "../../shared/http/validation";
import { updateMembershipRoleParamsSchema, updateMembershipRoleSchema } from "./contracts";
import { requirePermission, rolePermissionMap } from "../../shared/auth/rbac";
import { getRequestAccessToken } from "../../shared/auth/token";
import type { AppBindings } from "../../shared/context/tenant";

export function createAdminRoutes() {
  const adminRoutes = new Router<AppBindings>();

  adminRoutes.get("/rbac/matrix", async (c) => {
    await requirePermission(c, "admin.view");

    return c.json({
      roles: rolePermissionMap,
    });
  });

  adminRoutes.get("/audit", async (c) => {
    const auth = await requirePermission(c, "admin.audit.view");
    const services = c.get("services");
    const accessToken = getRequestAccessToken(c);

    const items = await services.auditService.list({
      accessToken,
      organizationId: auth.organizationId,
    });

    return c.json({
      items,
      total: items.length,
    });
  });

  adminRoutes.patch(
    "/memberships/:membershipId/role",
    zValidator("param", updateMembershipRoleParamsSchema),
    zValidator("json", updateMembershipRoleSchema),
    async (c) => {
      const auth = await requirePermission(c, "admin.users.manage");
      const { membershipId } = c.req.valid("param");
      const payload = c.req.valid("json");
      const accessToken = getRequestAccessToken(c);
      const services = c.get("services");

      const result = await services.adminMembershipService.updateRole({
        accessToken,
        membershipId,
        role: payload.role,
      });

      await services.auditService.log({
        accessToken,
        action: "admin.membership.role.updated",
        actorUserId: auth.userId,
        entityId: membershipId,
        entityType: "user_membership",
        ipAddress: c.req.header("x-forwarded-for") ?? null,
        metadata: {
          after: {
            role: result.after.role,
          },
          before: {
            role: result.before.role,
          },
          targetUserId: result.after.userId,
        },
        module: "admin",
        organizationId: auth.organizationId,
        userAgent: c.req.header("user-agent") ?? null,
      });

      return c.json({
        item: result.after,
      });
    },
  );

  return adminRoutes;
}
