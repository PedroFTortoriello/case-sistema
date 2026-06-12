import { Router } from "./shared/http/router";
import { cors } from "./shared/http/cors";
import { logger } from "./shared/http/logger";
import { createAdminRoutes } from "./modules/admin/routes";
import { createFinanceRoutes } from "./modules/finance/routes";
import { createOperationsRoutes } from "./modules/operations/routes";
import { createReferenceRoutes } from "./modules/reference/routes";
import { createReportsRoutes } from "./modules/reports/routes";
import { createAuthMiddleware } from "./shared/http/middleware";
import type { AppBindings } from "./shared/context/tenant";
import { env } from "./shared/config/env";
import { AppError } from "./shared/errors/app-error";
import { createDefaultServices } from "./shared/services/defaults";
import type { AppServices } from "./shared/services/container";

export function createApp(services: AppServices = createDefaultServices()) {
  const app = new Router<AppBindings>();

  app.use("*", logger());
  app.use("*", async (c, next) => {
    c.set("services", services);
    return next();
  });
  app.use(
    "*",
    cors({
      origin: (origin) => {
        if (!origin) {
          return env.allowedOrigins[0] ?? "*";
        }

        return env.allowedOrigins.includes(origin) ? origin : env.allowedOrigins[0] ?? "*";
      },
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "x-organization-id"],
    }),
  );

  app.onError((error, c) => {
    if (error instanceof AppError) {
      return c.json(
        {
          code: error.code,
          message: error.message,
        },
        error.statusCode,
      );
    }

    if (error instanceof Error) {
      return c.json(
        {
          code: "INTERNAL_ERROR",
          message: error.message,
        },
        500,
      );
    }

    return c.json(
      {
        code: "INTERNAL_ERROR",
        message: "Falha inesperada ao processar a requisicao.",
      },
      500,
    );
  });

  app.get("/health", (c) =>
    c.json({
      status: "ok",
      service: "case-sistema-api",
      time: new Date().toISOString(),
    }),
  );

  app.use("/v1/*", createAuthMiddleware(services.authContextService));
  app.route("/v1/finance", createFinanceRoutes());
  app.route("/v1/operations", createOperationsRoutes());
  app.route("/v1/reference", createReferenceRoutes());
  app.route("/v1/reports", createReportsRoutes());
  app.route("/v1/admin", createAdminRoutes());

  return app;
}

const app = createApp();

export default app;
