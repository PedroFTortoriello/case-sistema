import type { AppRole, AuthContext } from "../context/tenant";
import type {
  ClientFiscalProfileInput,
  NfseDraftInput,
  NfseDraftUpdateInput,
  NfseDocumentFileRole,
  NfseDocumentStatus,
  NfseFiscalSettingsInput,
  NfseReconciliationStatus,
  NfseReadiness,
  NfseTransmissionState,
  ProviderFiscalProfileInput,
  TaxableServiceInput,
} from "@case-sistema/contracts";

export type MembershipRecord = {
  id: string;
  organizationId: string;
  userId: string;
  role: AppRole;
  isDefault: boolean;
};

export type AuditLogRecord = {
  id: string;
  organizationId: string;
  actorUserId: string | null;
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  traceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type AuditLogInput = {
  accessToken: string;
  organizationId: string;
  actorUserId: string;
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export interface AuthContextService {
  resolveAuthContext(params: {
    accessToken: string;
    requestedOrganizationId?: string | null;
  }): Promise<AuthContext>;
}

export interface AuditService {
  log(input: AuditLogInput): Promise<void>;
  list(params: {
    accessToken: string;
    organizationId: string;
    limit?: number;
  }): Promise<AuditLogRecord[]>;
}

export interface AdminMembershipService {
  updateRole(params: {
    accessToken: string;
    membershipId: string;
    role: AppRole;
  }): Promise<{
    before: MembershipRecord;
    after: MembershipRecord;
  }>;
}

export type NfseFiscalSettingsRecord = NfseFiscalSettingsInput & {
  id: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
};

export type ProviderFiscalProfileRecord = ProviderFiscalProfileInput & {
  id: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
};

export type ClientFiscalProfileRecord = ClientFiscalProfileInput & {
  id: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
};

export type TaxableServiceRecord = TaxableServiceInput & {
  id: string;
  organizationId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type NfseDocumentEventRecord = {
  id: string;
  organizationId: string;
  serviceInvoiceId: string;
  actorUserId: string | null;
  eventType: string;
  statusFrom: NfseDocumentStatus | null;
  statusTo: NfseDocumentStatus | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type NfseDocumentRejectionRecord = {
  id: string;
  organizationId: string;
  serviceInvoiceId: string;
  eventId: string | null;
  attempt: number;
  code: string;
  message: string;
  field: string | null;
  detail: Record<string, unknown>;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
  createdAt: string;
};

export type NfseDocumentFileRecord = {
  id: string;
  organizationId: string;
  serviceInvoiceId: string;
  eventId: string | null;
  fileRole: NfseDocumentFileRole;
  environment: NfseFiscalSettingsInput["environment"];
  mimeType: string;
  sha256Hash: string;
  byteSize: number;
  createdAt: string;
  isLocked: boolean;
  hasTextContent: boolean;
  hasBinaryContent: boolean;
};

export type NfseDocumentFileDownload = {
  fileName: string;
  mimeType: string;
  content: string;
  isBase64: boolean;
};

export type NfseDocumentRemoteEventRecord = {
  id: string;
  organizationId: string;
  serviceInvoiceId: string;
  source: string;
  accessKey: string;
  eventTypeCode: number | null;
  eventName: string | null;
  eventSequence: number;
  effect: "none" | "cancelled";
  occurredAt: string | null;
  detail: Record<string, unknown>;
  fileId: string | null;
  createdAt: string;
};

export type NfseDocumentReconciliationRecord = {
  id: string;
  organizationId: string;
  serviceInvoiceId: string;
  actorUserId: string | null;
  chargeId: string | null;
  processId: string | null;
  status: NfseReconciliationStatus;
  issues: Array<{
    code: string;
    message: string;
    severity: "attention" | "divergent";
  }>;
  snapshot: Record<string, unknown>;
  createdAt: string;
};

export type NfseEventMatrixRecord = {
  environment: "homologation_only" | "homologation_when_configured";
  implementedInPhase4: boolean;
  key: string;
  knownRules: string;
  localStatusEffects: string[];
  method: "GET" | "HEAD" | "POST";
  notes: string;
  officialEndpoint: string;
  requiredData: string[];
  supportStatus: "implemented" | "supported_not_configured" | "not_supported";
  title: string;
};

export type NfseDocumentRecord = {
  id: string;
  organizationId: string;
  processId: string | null;
  chargeId: string | null;
  clientId: string;
  clientFiscalProfileId: string | null;
  taxableServiceId: string | null;
  fiscalSettingsId: string | null;
  status: NfseDocumentStatus;
  transmissionState: NfseTransmissionState;
  validationStatus: "pending" | "valid" | "invalid";
  competenceDate: string;
  intendedIssueDate: string;
  serviceDate: string;
  description: string;
  notes: string | null;
  currencyCode: "BRL";
  amounts: NfseDraftInput["amounts"];
  taxes: NfseDraftInput["taxes"];
  readiness: NfseReadiness;
  providerSnapshot: ProviderFiscalProfileInput | null;
  takerSnapshot: ClientFiscalProfileInput | null;
  serviceSnapshot: TaxableServiceInput | null;
  layoutVersion: string;
  documentationReference: string;
  preparedBy: string | null;
  readyForIssueAt: string | null;
  issueRequestedAt: string | null;
  authorizedAt: string | null;
  lastSyncedAt: string | null;
  idempotencyKey: string | null;
  dpsNumber: string | null;
  dpsIdentifier: string | null;
  accessKey: string | null;
  verificationCode: string | null;
  latestRejection: NfseDocumentRejectionRecord | null;
  latestReconciliation: NfseDocumentReconciliationRecord | null;
  availableFiles: NfseDocumentFileRole[];
  pendingStatusCheck: boolean;
  cancelEventId: string | null;
  cancelledReasonCode: string | null;
  cancelledReasonText: string | null;
  lifecycleSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NfseDocumentDraftRecord = NfseDocumentRecord;

export type NfseIssueDocumentResult = {
  document: NfseDocumentRecord;
  events: NfseDocumentEventRecord[];
  files: NfseDocumentFileRecord[];
  rejections: NfseDocumentRejectionRecord[];
};

export interface FiscalService {
  getFiscalSettings(params: {
    accessToken: string;
    organizationId: string;
  }): Promise<NfseFiscalSettingsRecord | null>;
  saveFiscalSettings(params: {
    accessToken: string;
    organizationId: string;
    payload: NfseFiscalSettingsInput;
  }): Promise<NfseFiscalSettingsRecord>;
  getProviderProfile(params: {
    accessToken: string;
    organizationId: string;
  }): Promise<ProviderFiscalProfileRecord | null>;
  saveProviderProfile(params: {
    accessToken: string;
    organizationId: string;
    payload: ProviderFiscalProfileInput;
  }): Promise<ProviderFiscalProfileRecord>;
  getClientFiscalProfile(params: {
    accessToken: string;
    organizationId: string;
    clientId: string;
  }): Promise<ClientFiscalProfileRecord | null>;
  saveClientFiscalProfile(params: {
    accessToken: string;
    organizationId: string;
    clientId: string;
    payload: ClientFiscalProfileInput;
  }): Promise<ClientFiscalProfileRecord>;
  listTaxableServices(params: {
    accessToken: string;
    organizationId: string;
  }): Promise<TaxableServiceRecord[]>;
  saveTaxableService(params: {
    accessToken: string;
    organizationId: string;
    actorUserId: string;
    serviceId?: string;
    payload: TaxableServiceInput;
  }): Promise<TaxableServiceRecord>;
  listDocuments(params: {
    accessToken: string;
    organizationId: string;
  }): Promise<NfseDocumentRecord[]>;
  getDocument(params: {
    accessToken: string;
    organizationId: string;
    documentId: string;
  }): Promise<NfseDocumentRecord>;
  createDraftDocument(params: {
    accessToken: string;
    organizationId: string;
    actorUserId: string;
    payload: NfseDraftInput;
  }): Promise<NfseDocumentRecord>;
  updateDraftDocument(params: {
    accessToken: string;
    organizationId: string;
    actorUserId: string;
    documentId: string;
    payload: NfseDraftUpdateInput;
  }): Promise<NfseDocumentRecord>;
  issueDocument(params: {
    accessToken: string;
    organizationId: string;
    actorUserId: string;
    documentId: string;
  }): Promise<NfseIssueDocumentResult>;
  syncDocumentStatus(params: {
    accessToken: string;
    organizationId: string;
    actorUserId: string;
    documentId: string;
  }): Promise<NfseIssueDocumentResult>;
  syncDocumentLifecycle(params: {
    accessToken: string;
    organizationId: string;
    actorUserId: string;
    documentId: string;
  }): Promise<NfseIssueDocumentResult>;
  reconcileDocument(params: {
    accessToken: string;
    organizationId: string;
    actorUserId: string;
    documentId: string;
  }): Promise<NfseDocumentRecord>;
  listDocumentEvents(params: {
    accessToken: string;
    organizationId: string;
    documentId: string;
  }): Promise<NfseDocumentEventRecord[]>;
  listDocumentRemoteEvents(params: {
    accessToken: string;
    organizationId: string;
    documentId: string;
  }): Promise<NfseDocumentRemoteEventRecord[]>;
  listDocumentRejections(params: {
    accessToken: string;
    organizationId: string;
    documentId: string;
  }): Promise<NfseDocumentRejectionRecord[]>;
  listDocumentFiles(params: {
    accessToken: string;
    organizationId: string;
    documentId: string;
  }): Promise<NfseDocumentFileRecord[]>;
  downloadDocumentFile(params: {
    accessToken: string;
    organizationId: string;
    documentId: string;
    fileId: string;
  }): Promise<NfseDocumentFileDownload>;
  processPendingFiscalJobs(params: {
    accessToken: string;
    organizationId: string;
    actorUserId: string;
  }): Promise<number>;
  getEventMatrix(): Promise<NfseEventMatrixRecord[]>;
}

export type AppServices = {
  authContextService: AuthContextService;
  auditService: AuditService;
  adminMembershipService: AdminMembershipService;
  fiscalService: FiscalService;
};
