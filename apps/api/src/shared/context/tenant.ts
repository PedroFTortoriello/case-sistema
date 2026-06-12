import type { AppServices } from "../services/container";

export const roles = [
  "administrator",
  "financeiro",
  "operacional",
  "comercial",
  "diretor",
] as const;

export type AppRole = (typeof roles)[number];

export const permissionCatalog = [
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
] as const;

export type Permission = (typeof permissionCatalog)[number];

export type AuthContext = {
  organizationId: string;
  userId: string;
  role: AppRole;
  permissions: Permission[];
};

export type AppBindings = {
  Variables: {
    accessToken: string;
    auth: AuthContext;
    services: AppServices;
  };
};
