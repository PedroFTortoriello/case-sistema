import { Router } from "../../shared/http/router";
import { zValidator } from "../../shared/http/validation";
import type { Context } from "../../shared/http/context";
import {
  clientFiscalProfileSchema,
  createChargeSchema,
  createNfseDraftSchema,
  documentFileParamsSchema,
  documentParamsSchema,
  emptyPayloadSchema,
  fiscalClientParamsSchema,
  fiscalSettingsSchema,
  providerProfileSchema,
  taxableServiceParamsSchema,
  taxableServiceSchema,
  updateNfseDraftSchema,
} from "./contracts";
import { requirePermission } from "../../shared/auth/rbac";
import { getRequestAccessToken } from "../../shared/auth/token";
import { charges, financeOverview } from "../../shared/fixtures/demo-data";
import type { AppBindings } from "../../shared/context/tenant";

const fiscalValidatorHook = (
  result: { success: boolean; error?: { flatten: () => unknown } },
  c: { json: (body: unknown, status?: number) => unknown },
): Response | void => {
  if (result.success) {
    return;
  }

  return c.json(
    {
      details: result.error?.flatten() ?? null,
      message: "Payload fiscal invalido.",
    },
    400,
  ) as Response;
};

async function auditFiscalMutation(c: Context<AppBindings>, params: {
  action: string;
  entityId: string;
  entityType: string;
  metadata?: Record<string, unknown>;
}) {
  const auth = c.get("auth");
  const accessToken = getRequestAccessToken(c);
  const services = c.get("services");

  await services.auditService.log({
    accessToken,
    action: params.action,
    actorUserId: auth.userId,
    entityId: params.entityId,
    entityType: params.entityType,
    ipAddress: c.req.header("x-forwarded-for") ?? null,
    metadata: params.metadata,
    module: "fiscal",
    organizationId: auth.organizationId,
    userAgent: c.req.header("user-agent") ?? null,
  });
}

export function createFinanceRoutes() {
  const financeRoutes = new Router<AppBindings>();

  financeRoutes.get("/overview", async (c) => {
    await requirePermission(c, "finance.view");

    return c.json({
      module: "finance",
      overview: financeOverview,
    });
  });

  financeRoutes.get("/charges", async (c) => {
    await requirePermission(c, "finance.view");

    return c.json({
      items: charges,
      total: charges.length,
    });
  });

  financeRoutes.post("/charges", zValidator("json", createChargeSchema), async (c) => {
    await requirePermission(c, "finance.charge.manage");

    const payload = c.req.valid("json");

    return c.json(
      {
        id: "chg-simulated",
        status: "open",
        ...payload,
      },
      201,
    );
  });

  financeRoutes.get("/nfse/settings", async (c) => {
    const auth = await requirePermission(c, "fiscal.settings.view");
    const services = c.get("services");
    const accessToken = getRequestAccessToken(c);

    const item = await services.fiscalService.getFiscalSettings({
      accessToken,
      organizationId: auth.organizationId,
    });

    return c.json({
      item,
    });
  });

  financeRoutes.put("/nfse/settings", zValidator("json", fiscalSettingsSchema, fiscalValidatorHook), async (c) => {
    const auth = await requirePermission(c, "fiscal.settings.manage");
    const services = c.get("services");
    const accessToken = getRequestAccessToken(c);
    const payload = c.req.valid("json");

    const item = await services.fiscalService.saveFiscalSettings({
      accessToken,
      organizationId: auth.organizationId,
      payload,
    });

    await auditFiscalMutation(c, {
      action: "fiscal.settings.saved",
      entityId: item.id,
      entityType: "nfse_fiscal_settings",
      metadata: {
        environment: item.environment,
        municipalityCode: item.municipalityCode,
        providerType: item.providerType,
        validationStatus: item.validationStatus,
      },
    });

    return c.json({
      item,
    });
  });

  financeRoutes.get("/nfse/provider-profile", async (c) => {
    const auth = await requirePermission(c, "fiscal.settings.view");
    const services = c.get("services");
    const accessToken = getRequestAccessToken(c);

    const item = await services.fiscalService.getProviderProfile({
      accessToken,
      organizationId: auth.organizationId,
    });

    return c.json({
      item,
    });
  });

  financeRoutes.put("/nfse/provider-profile", zValidator("json", providerProfileSchema, fiscalValidatorHook), async (c) => {
    const auth = await requirePermission(c, "fiscal.settings.manage");
    const services = c.get("services");
    const accessToken = getRequestAccessToken(c);
    const payload = c.req.valid("json");

    const item = await services.fiscalService.saveProviderProfile({
      accessToken,
      organizationId: auth.organizationId,
      payload,
    });

    await auditFiscalMutation(c, {
      action: "fiscal.provider_profile.saved",
      entityId: item.id,
      entityType: "organization_fiscal_profile",
      metadata: {
        cnaeCode: item.cnaeCode,
        documentNumber: item.documentNumber,
        municipalityCode: item.municipalityCode,
      },
    });

    return c.json({
      item,
    });
  });

  financeRoutes.get(
    "/nfse/clients/:clientId/fiscal-profile",
    zValidator("param", fiscalClientParamsSchema),
    async (c) => {
      const auth = await requirePermission(c, "fiscal.settings.view");
      const services = c.get("services");
      const accessToken = getRequestAccessToken(c);
      const { clientId } = c.req.valid("param");

      const item = await services.fiscalService.getClientFiscalProfile({
        accessToken,
        clientId,
        organizationId: auth.organizationId,
      });

      return c.json({
        item,
      });
    },
  );

  financeRoutes.put(
    "/nfse/clients/:clientId/fiscal-profile",
    zValidator("param", fiscalClientParamsSchema, fiscalValidatorHook),
    zValidator("json", clientFiscalProfileSchema, fiscalValidatorHook),
    async (c) => {
      const auth = await requirePermission(c, "fiscal.settings.manage");
      const services = c.get("services");
      const accessToken = getRequestAccessToken(c);
      const { clientId } = c.req.valid("param");
      const payload = c.req.valid("json");

      const item = await services.fiscalService.saveClientFiscalProfile({
        accessToken,
        clientId,
        organizationId: auth.organizationId,
        payload,
      });

      await auditFiscalMutation(c, {
        action: "fiscal.client_profile.saved",
        entityId: item.id,
        entityType: "client_fiscal_profile",
        metadata: {
          clientId,
          documentNumber: item.documentNumber,
          personType: item.personType,
        },
      });

      return c.json({
        item,
      });
    },
  );

  financeRoutes.get("/nfse/services", async (c) => {
    const auth = await requirePermission(c, "fiscal.settings.view");
    const services = c.get("services");
    const accessToken = getRequestAccessToken(c);

    const items = await services.fiscalService.listTaxableServices({
      accessToken,
      organizationId: auth.organizationId,
    });

    return c.json({
      items,
      total: items.length,
    });
  });

  financeRoutes.post("/nfse/services", zValidator("json", taxableServiceSchema, fiscalValidatorHook), async (c) => {
    const auth = await requirePermission(c, "fiscal.settings.manage");
    const services = c.get("services");
    const accessToken = getRequestAccessToken(c);
    const payload = c.req.valid("json");

    const item = await services.fiscalService.saveTaxableService({
      accessToken,
      actorUserId: auth.userId,
      organizationId: auth.organizationId,
      payload,
    });

    await auditFiscalMutation(c, {
      action: "fiscal.taxable_service.saved",
      entityId: item.id,
      entityType: "taxable_service",
      metadata: {
        code: item.code,
        municipalServiceCode: item.municipalServiceCode,
        version: item.version,
      },
    });

    return c.json(
      {
        item,
      },
      201,
    );
  });

  financeRoutes.patch(
    "/nfse/services/:serviceId",
    zValidator("param", taxableServiceParamsSchema, fiscalValidatorHook),
    zValidator("json", taxableServiceSchema, fiscalValidatorHook),
    async (c) => {
      const auth = await requirePermission(c, "fiscal.settings.manage");
      const services = c.get("services");
      const accessToken = getRequestAccessToken(c);
      const { serviceId } = c.req.valid("param");
      const payload = c.req.valid("json");

      const item = await services.fiscalService.saveTaxableService({
        accessToken,
        actorUserId: auth.userId,
        organizationId: auth.organizationId,
        payload,
        serviceId,
      });

      await auditFiscalMutation(c, {
        action: "fiscal.taxable_service.saved",
        entityId: item.id,
        entityType: "taxable_service",
        metadata: {
          code: item.code,
          municipalServiceCode: item.municipalServiceCode,
          version: item.version,
        },
      });

      return c.json({
        item,
      });
    },
  );

  financeRoutes.get("/nfse/documents", async (c) => {
    const auth = await requirePermission(c, "fiscal.document.view");
    const services = c.get("services");
    const accessToken = getRequestAccessToken(c);
    const items = await services.fiscalService.listDocuments({
      accessToken,
      organizationId: auth.organizationId,
    });

    return c.json({
      items,
      total: items.length,
    });
  });

  financeRoutes.get(
    "/nfse/documents/:documentId",
    zValidator("param", documentParamsSchema, fiscalValidatorHook),
    async (c) => {
      const auth = await requirePermission(c, "fiscal.document.view");
      const services = c.get("services");
      const accessToken = getRequestAccessToken(c);
      const { documentId } = c.req.valid("param");

      const item = await services.fiscalService.getDocument({
        accessToken,
        documentId,
        organizationId: auth.organizationId,
      });

      return c.json({
        item,
      });
    },
  );

  financeRoutes.post("/nfse/documents", zValidator("json", createNfseDraftSchema, fiscalValidatorHook), async (c) => {
    const auth = await requirePermission(c, "fiscal.document.prepare");
    const services = c.get("services");
    const accessToken = getRequestAccessToken(c);
    const payload = c.req.valid("json");

    const item = await services.fiscalService.createDraftDocument({
      accessToken,
      actorUserId: auth.userId,
      organizationId: auth.organizationId,
      payload,
    });

    await auditFiscalMutation(c, {
      action: "fiscal.document_draft.created",
      entityId: item.id,
      entityType: "service_invoice",
      metadata: {
        clientId: item.clientId,
        status: item.status,
        taxableServiceId: item.taxableServiceId,
        validationStatus: item.validationStatus,
      },
    });

    return c.json(
      {
        item,
      },
      201,
    );
  });

  financeRoutes.patch(
    "/nfse/documents/:documentId",
    zValidator("param", documentParamsSchema, fiscalValidatorHook),
    zValidator("json", updateNfseDraftSchema, fiscalValidatorHook),
    async (c) => {
      const auth = await requirePermission(c, "fiscal.document.prepare");
      const services = c.get("services");
      const accessToken = getRequestAccessToken(c);
      const { documentId } = c.req.valid("param");
      const payload = c.req.valid("json");

      const item = await services.fiscalService.updateDraftDocument({
        accessToken,
        actorUserId: auth.userId,
        documentId,
        organizationId: auth.organizationId,
        payload,
      });

      await auditFiscalMutation(c, {
        action: "fiscal.document_draft.updated",
        entityId: item.id,
        entityType: "service_invoice",
        metadata: {
          status: item.status,
          transmissionState: item.transmissionState,
          validationStatus: item.validationStatus,
        },
      });

      return c.json({
        item,
      });
    },
  );

  financeRoutes.post(
    "/nfse/documents/:documentId/issue",
    zValidator("param", documentParamsSchema, fiscalValidatorHook),
    zValidator("json", emptyPayloadSchema, fiscalValidatorHook),
    async (c) => {
      const auth = await requirePermission(c, "fiscal.document.issue");
      const services = c.get("services");
      const accessToken = getRequestAccessToken(c);
      const { documentId } = c.req.valid("param");

      const result = await services.fiscalService.issueDocument({
        accessToken,
        actorUserId: auth.userId,
        documentId,
        organizationId: auth.organizationId,
      });

      await auditFiscalMutation(c, {
        action: "fiscal.document.issue.requested",
        entityId: documentId,
        entityType: "service_invoice",
        metadata: {
          accessKey: result.document.accessKey,
          pendingStatusCheck: result.document.pendingStatusCheck,
          status: result.document.status,
          transmissionState: result.document.transmissionState,
        },
      });

      const statusCode =
        result.document.status === "authorized" || result.document.status === "cancelled"
          ? 200
          : result.document.status === "failed"
            ? 422
            : 202;

      return c.json(result, statusCode);
    },
  );

  financeRoutes.post(
    "/nfse/documents/:documentId/sync",
    zValidator("param", documentParamsSchema, fiscalValidatorHook),
    zValidator("json", emptyPayloadSchema, fiscalValidatorHook),
    async (c) => {
      const auth = await requirePermission(c, "fiscal.document.issue");
      const services = c.get("services");
      const accessToken = getRequestAccessToken(c);
      const { documentId } = c.req.valid("param");

      const result = await services.fiscalService.syncDocumentLifecycle({
        accessToken,
        actorUserId: auth.userId,
        documentId,
        organizationId: auth.organizationId,
      });

      await auditFiscalMutation(c, {
        action: "fiscal.document.status_synced",
        entityId: documentId,
        entityType: "service_invoice",
        metadata: {
          accessKey: result.document.accessKey,
          pendingStatusCheck: result.document.pendingStatusCheck,
          status: result.document.status,
          transmissionState: result.document.transmissionState,
        },
      });

      const statusCode =
        result.document.status === "authorized" || result.document.status === "cancelled"
          ? 200
          : result.document.status === "failed"
            ? 422
            : 202;

      return c.json(result, statusCode);
    },
  );

  financeRoutes.post(
    "/nfse/documents/:documentId/reconcile",
    zValidator("param", documentParamsSchema, fiscalValidatorHook),
    zValidator("json", emptyPayloadSchema, fiscalValidatorHook),
    async (c) => {
      const auth = await requirePermission(c, "fiscal.document.reconcile");
      const services = c.get("services");
      const accessToken = getRequestAccessToken(c);
      const { documentId } = c.req.valid("param");

      const item = await services.fiscalService.reconcileDocument({
        accessToken,
        actorUserId: auth.userId,
        documentId,
        organizationId: auth.organizationId,
      });

      await auditFiscalMutation(c, {
        action: "fiscal.document.reconciled",
        entityId: documentId,
        entityType: "service_invoice",
        metadata: {
          reconciliationStatus: item.latestReconciliation?.status ?? "pending",
          status: item.status,
        },
      });

      return c.json({
        item,
      });
    },
  );

  financeRoutes.get(
    "/nfse/documents/:documentId/remote-events",
    zValidator("param", documentParamsSchema, fiscalValidatorHook),
    async (c) => {
      const auth = await requirePermission(c, "fiscal.document.view");
      const services = c.get("services");
      const accessToken = getRequestAccessToken(c);
      const { documentId } = c.req.valid("param");
      const items = await services.fiscalService.listDocumentRemoteEvents({
        accessToken,
        documentId,
        organizationId: auth.organizationId,
      });

      return c.json({
        items,
        total: items.length,
      });
    },
  );

  financeRoutes.get(
    "/nfse/documents/:documentId/events",
    zValidator("param", documentParamsSchema, fiscalValidatorHook),
    async (c) => {
      const auth = await requirePermission(c, "fiscal.document.view");
      const services = c.get("services");
      const accessToken = getRequestAccessToken(c);
      const { documentId } = c.req.valid("param");
      const items = await services.fiscalService.listDocumentEvents({
        accessToken,
        documentId,
        organizationId: auth.organizationId,
      });

      return c.json({
        items,
        total: items.length,
      });
    },
  );

  financeRoutes.get(
    "/nfse/documents/:documentId/rejections",
    zValidator("param", documentParamsSchema, fiscalValidatorHook),
    async (c) => {
      const auth = await requirePermission(c, "fiscal.document.view");
      const services = c.get("services");
      const accessToken = getRequestAccessToken(c);
      const { documentId } = c.req.valid("param");
      const items = await services.fiscalService.listDocumentRejections({
        accessToken,
        documentId,
        organizationId: auth.organizationId,
      });

      return c.json({
        items,
        total: items.length,
      });
    },
  );

  financeRoutes.get(
    "/nfse/documents/:documentId/files",
    zValidator("param", documentParamsSchema, fiscalValidatorHook),
    async (c) => {
      const auth = await requirePermission(c, "fiscal.document.view");
      const services = c.get("services");
      const accessToken = getRequestAccessToken(c);
      const { documentId } = c.req.valid("param");
      const items = await services.fiscalService.listDocumentFiles({
        accessToken,
        documentId,
        organizationId: auth.organizationId,
      });

      return c.json({
        items,
        total: items.length,
      });
    },
  );

  financeRoutes.get(
    "/nfse/documents/:documentId/files/:fileId/download",
    zValidator("param", documentFileParamsSchema, fiscalValidatorHook),
    async (c) => {
      const auth = await requirePermission(c, "fiscal.document.view");
      const services = c.get("services");
      const accessToken = getRequestAccessToken(c);
      const { documentId, fileId } = c.req.valid("param");
      const file = await services.fiscalService.downloadDocumentFile({
        accessToken,
        documentId,
        fileId,
        organizationId: auth.organizationId,
      });

      c.header("Content-Type", file.mimeType);
      c.header("Content-Disposition", `attachment; filename="${file.fileName}"`);

      if (file.isBase64) {
        return new Response(Buffer.from(file.content, "base64"), {
          headers: c.res.headers,
          status: 200,
        });
      }

      return new Response(file.content, {
        headers: c.res.headers,
        status: 200,
      });
    },
  );

  financeRoutes.post("/nfse/jobs/process", zValidator("json", emptyPayloadSchema, fiscalValidatorHook), async (c) => {
    const auth = await requirePermission(c, "fiscal.document.issue");
    const services = c.get("services");
    const accessToken = getRequestAccessToken(c);
    const processed = await services.fiscalService.processPendingFiscalJobs({
      accessToken,
      actorUserId: auth.userId,
      organizationId: auth.organizationId,
    });

    return c.json({
      processed,
    });
  });

  financeRoutes.get("/nfse/history", async (c) => {
    const auth = await requirePermission(c, "fiscal.document.view");
    const services = c.get("services");
    const accessToken = getRequestAccessToken(c);
    const items = await services.fiscalService.listDocuments({
      accessToken,
      organizationId: auth.organizationId,
    });

    return c.json({
      items,
      total: items.length,
    });
  });

  financeRoutes.get("/nfse/event-matrix", async (c) => {
    await requirePermission(c, "fiscal.document.view");
    const services = c.get("services");
    const items = await services.fiscalService.getEventMatrix();

    return c.json({
      items,
      total: items.length,
    });
  });

  return financeRoutes;
}
