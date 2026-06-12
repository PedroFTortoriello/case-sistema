import { Router } from "../../shared/http/router";
import { requirePermission } from "../../shared/auth/rbac";
import { reportSummary } from "../../shared/fixtures/demo-data";
import type { AppBindings } from "../../shared/context/tenant";

export function createReportsRoutes() {
  const reportsRoutes = new Router<AppBindings>();

  reportsRoutes.get("/summary", async (c) => {
    await requirePermission(c, "reports.view");

    return c.json({
      report: reportSummary,
    });
  });

  return reportsRoutes;
}
