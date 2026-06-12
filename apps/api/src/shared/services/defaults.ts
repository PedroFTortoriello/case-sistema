import { SupabaseAdminMembershipService } from "../admin/membership-service";
import { SupabaseAuditService } from "../audit/service";
import { SupabaseFiscalService } from "../../modules/finance/fiscal-service";
import { SupabaseAuthContextService } from "../auth/context-service";
import type { AppServices } from "./container";

export function createDefaultServices(): AppServices {
  return {
    adminMembershipService: new SupabaseAdminMembershipService(),
    auditService: new SupabaseAuditService(),
    authContextService: new SupabaseAuthContextService(),
    fiscalService: new SupabaseFiscalService(),
  };
}
