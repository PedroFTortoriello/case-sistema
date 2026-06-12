import { Router } from "../../shared/http/router";
import { requirePermission } from "../../shared/auth/rbac";
import { clients, fxRates } from "../../shared/fixtures/demo-data";
import type { AppBindings } from "../../shared/context/tenant";

export function createReferenceRoutes() {
  const referenceRoutes = new Router<AppBindings>();

  referenceRoutes.get("/clients", async (c) => {
    await requirePermission(c, "reference.view");

    return c.json({
      items: clients,
      total: clients.length,
    });
  });

  referenceRoutes.get("/fx-rates", async (c) => {
    await requirePermission(c, "reference.view");

    return c.json({
      items: fxRates,
      total: fxRates.length,
    });
  });

  return referenceRoutes;
}
