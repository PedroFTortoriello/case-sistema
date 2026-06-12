import { Router } from "../../shared/http/router";
import { zValidator } from "../../shared/http/validation";
import { createAwbSchema } from "./contracts";
import { requirePermission } from "../../shared/auth/rbac";
import { awbs, operationsOverview, processes } from "../../shared/fixtures/demo-data";
import type { AppBindings } from "../../shared/context/tenant";

export function createOperationsRoutes() {
  const operationsRoutes = new Router<AppBindings>();

  operationsRoutes.get("/overview", async (c) => {
    await requirePermission(c, "operations.view");

    return c.json({
      module: "operations",
      overview: operationsOverview,
    });
  });

  operationsRoutes.get("/processes", async (c) => {
    await requirePermission(c, "operations.view");

    return c.json({
      items: processes,
      total: processes.length,
    });
  });

  operationsRoutes.get("/awbs", async (c) => {
    await requirePermission(c, "operations.view");

    return c.json({
      items: awbs,
      total: awbs.length,
    });
  });

  operationsRoutes.post("/awbs", zValidator("json", createAwbSchema), async (c) => {
    await requirePermission(c, "operations.awb.manage");

    const payload = c.req.valid("json");

    return c.json(
      {
        id: "awb-simulated",
        status: "draft",
        ...payload,
      },
      201,
    );
  });

  return operationsRoutes;
}
