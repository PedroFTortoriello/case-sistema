import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildNfseDraftReadiness,
  normalizeNfseDraftPayload,
  type ClientFiscalProfileInput,
  type NfseDraftInput,
  type NfseDraftUpdateInput,
  type NfseFiscalSettingsInput,
  type ProviderFiscalProfileInput,
  type TaxableServiceInput,
} from "@case-sistema/contracts";
import { createApp } from "../app";
import { resolvePermissions } from "../shared/auth/rbac";
import type { AppRole, AuthContext } from "../shared/context/tenant";
import {
  BadRequestError,
  ConfigurationError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../shared/errors/app-error";
import { createNfseDraftSchema } from "../modules/finance/contracts";
import { type NfseIssueAdapterInput, NfseNationalAdapter } from "../modules/finance/nfse-national-adapter";
import type {
  AdminMembershipService,
  AppServices,
  AuditLogInput,
  AuditLogRecord,
  AuditService,
  AuthContextService,
  ClientFiscalProfileRecord,
  FiscalService,
  MembershipRecord,
  NfseDocumentDraftRecord,
  NfseDocumentEventRecord,
  NfseDocumentFileDownload,
  NfseDocumentFileRecord,
  NfseDocumentRejectionRecord,
  NfseDocumentRemoteEventRecord,
  NfseDocumentReconciliationRecord,
  NfseDocumentRecord,
  NfseEventMatrixRecord,
  NfseFiscalSettingsRecord,
  NfseIssueDocumentResult,
  ProviderFiscalProfileRecord,
  TaxableServiceRecord,
} from "../shared/services/container";
import { nfseNationalEventMatrix } from "../modules/finance/nfse-event-matrix";

const nowIso = () => "2026-05-25T12:00:00.000Z";

const fiscalSettingsDefault = {
  adapterType: "nfse_national_api",
  certificateReference: "vault://certificates/case-logistica-a1",
  credentialReference: "vault://credentials/nfse-nacional/case-logistica",
  documentationReference: "Portal Nacional NFS-e / Manual do Emissor Publico API",
  documentSeries: "A1",
  environment: "homologation",
  isActive: true,
  layoutVersion: "manual-api-v1.2-out2025",
  municipalityCode: "3520506",
  municipalityName: "Indaiatuba",
  nextNumberPreview: "000000000000001",
  providerType: "national",
  stateCode: "SP",
  validationStatus: "valid",
} as const;

const providerProfileDefault = {
  cnaeCode: "5250801",
  complement: null,
  countryCode: "BR",
  documentNumber: "17166707000175",
  email: "fiscal@caselogistica.com.br",
  legalName: "Case Logistica de Cargas Ltda",
  municipalRegistration: "99887",
  municipalityCode: "3520506",
  municipalityName: "Indaiatuba",
  neighborhood: "Cidade Nova",
  number: "240",
  phone: "19998882211",
  postalCode: "13339210",
  simpleNationalOptIn: true,
  stateCode: "SP",
  street: "Alameda dos Bandeirantes",
  taxIncentiveCode: null,
  taxRegime: "Simples Nacional",
  tradeName: "Case Logistica de Cargas",
} as const;

const clientProfileDefault = {
  clientId: "client-demo-orion",
  complement: "Bloco B",
  countryCode: "BR",
  documentNumber: "17166707000175",
  email: "fiscal@orioncomponents.com",
  legalName: "Orion Components Brasil Ltda",
  municipalRegistration: null,
  municipalityCode: "3520506",
  municipalityName: "Indaiatuba",
  neighborhood: "Centro",
  number: "240",
  personType: "legal_entity",
  phone: "19998882211",
  postalCode: "13339210",
  stateCode: "SP",
  stateRegistration: null,
  street: "Alameda dos Bandeirantes",
  tradeName: "Orion Components",
} as const;

const taxableServiceDefault = {
  allowsDeductions: false,
  cnaeCode: "5250801",
  code: "despacho-aduaneiro",
  defaultDescription: "Despacho aduaneiro e coordenacao operacional do embarque.",
  description: "Servico fiscal vinculado a despacho aduaneiro.",
  incidenceMunicipalityCode: "3520506",
  incidenceMunicipalityName: "Indaiatuba",
  incidenceStateCode: "SP",
  isActive: true,
  isIssWithheldByDefault: false,
  issExigibility: "exigivel",
  issRate: "0.0200",
  issRateOrigin: "catalog",
  listServiceItem: "18.01",
  municipalServiceCode: "18.01",
  name: "Despacho aduaneiro",
  nationalTaxationCode: "1701",
  taxationNature: "tributavel_municipio",
} as const;

const draftDefault: NfseDraftInput = {
  amounts: {
    conditionalDiscountAmount: "0.00",
    deductionAmount: "0.00",
    discountAmount: "0.00",
    serviceAmount: "18450.00",
  },
  chargeId: null,
  clientId: clientProfileDefault.clientId,
  competenceDate: "2026-05-01",
  currencyCode: "BRL",
  description: "Despacho aduaneiro e coordenacao operacional do embarque IMP-2026-0048.",
  intendedIssueDate: "2026-05-25",
  notes: "Documento preparado para producao restrita da NFS-e nacional.",
  processId: "IMP-2026-0048",
  serviceDate: "2026-05-25",
  taxableServiceId: "service-demo-despacho",
  taxes: {
    calculationOrigin: "manual",
    cofinsAmount: "0.00",
    cppAmount: "0.00",
    csllAmount: "0.00",
    inssAmount: "0.00",
    irrfAmount: "0.00",
    issAmount: "369.00",
    issRate: "0.0200",
    issRetained: false,
    pisAmount: "0.00",
  },
};

type MembershipFixture = {
  organizationId: string;
  role: AppRole;
  isDefault?: boolean;
};

type TokenFixture = {
  memberships: MembershipFixture[];
  userId: string;
};

type FiscalSeed = {
  clientProfiles?: ClientFiscalProfileRecord[];
  documents?: NfseDocumentRecord[];
  lifecycleBehaviors?: Record<string, "cancelled" | "none">;
  providerProfiles?: ProviderFiscalProfileRecord[];
  reconciliations?: Record<string, NfseDocumentReconciliationRecord[]>;
  remoteEvents?: Record<string, NfseDocumentRemoteEventRecord[]>;
  settings?: NfseFiscalSettingsRecord[];
  taxableServices?: TaxableServiceRecord[];
  issueBehaviors?: Record<string, "authorized" | "rejected" | "timeout" | "processing">;
  syncBehaviors?: Record<string, "authorized" | "rejected" | "processing">;
};

function makeSettings(overrides?: Partial<NfseFiscalSettingsRecord>): NfseFiscalSettingsRecord {
  return {
    ...fiscalSettingsDefault,
    createdAt: nowIso(),
    id: "settings-org-a",
    organizationId: "org-a",
    updatedAt: nowIso(),
    ...overrides,
  };
}

function makeProvider(overrides?: Partial<ProviderFiscalProfileRecord>): ProviderFiscalProfileRecord {
  return {
    ...providerProfileDefault,
    createdAt: nowIso(),
    id: "provider-org-a",
    organizationId: "org-a",
    updatedAt: nowIso(),
    ...overrides,
  };
}

function makeClient(overrides?: Partial<ClientFiscalProfileRecord>): ClientFiscalProfileRecord {
  return {
    ...clientProfileDefault,
    createdAt: nowIso(),
    id: "client-fiscal-orion",
    organizationId: "org-a",
    updatedAt: nowIso(),
    ...overrides,
  };
}

function makeService(overrides?: Partial<TaxableServiceRecord>): TaxableServiceRecord {
  return {
    ...taxableServiceDefault,
    createdAt: nowIso(),
    id: "service-demo-despacho",
    organizationId: "org-a",
    updatedAt: nowIso(),
    version: 1,
    ...overrides,
  };
}

class FakeAuthContextService implements AuthContextService {
  constructor(
    private readonly fixtures: Record<string, TokenFixture>,
    private readonly options: {
      configurationError?: boolean;
    } = {},
  ) {}

  async resolveAuthContext({
    accessToken,
    requestedOrganizationId,
  }: {
    accessToken: string;
    requestedOrganizationId?: string | null;
  }): Promise<AuthContext> {
    if (this.options.configurationError) {
      throw new ConfigurationError("Configuracao de auth ausente.");
    }

    const fixture = this.fixtures[accessToken];

    if (!fixture) {
      throw new UnauthorizedError("Token invalido ou expirado.");
    }

    if (fixture.memberships.length === 0) {
      throw new ForbiddenError("Usuario sem membership.");
    }

    const selectedMembership = requestedOrganizationId
      ? fixture.memberships.find((membership) => membership.organizationId === requestedOrganizationId)
      : fixture.memberships.find((membership) => membership.isDefault) ?? fixture.memberships[0];

    if (!selectedMembership) {
      throw new ForbiddenError("Usuario sem membership na organizacao solicitada.");
    }

    return {
      organizationId: selectedMembership.organizationId,
      permissions: resolvePermissions(selectedMembership.role),
      role: selectedMembership.role,
      userId: fixture.userId,
    };
  }
}

class FakeAuditService implements AuditService {
  readonly entries: AuditLogRecord[] = [];

  async log(input: AuditLogInput) {
    this.entries.unshift({
      action: input.action,
      actorUserId: input.actorUserId,
      createdAt: nowIso(),
      entityId: input.entityId,
      entityType: input.entityType,
      id: `audit-${this.entries.length + 1}`,
      ipAddress: input.ipAddress ?? null,
      module: input.module,
      organizationId: input.organizationId,
      payload: (input.metadata as Record<string, unknown>) ?? {},
      traceId: null,
      userAgent: input.userAgent ?? null,
    });
  }

  async list({
    organizationId,
    limit = 50,
  }: {
    accessToken: string;
    organizationId: string;
    limit?: number;
  }) {
    return this.entries.filter((entry) => entry.organizationId === organizationId).slice(0, limit);
  }
}

class FakeAdminMembershipService implements AdminMembershipService {
  constructor(private readonly memberships: Map<string, MembershipRecord>) {}

  async updateRole({
    membershipId,
    role,
  }: {
    accessToken: string;
    membershipId: string;
    role: AppRole;
  }) {
    const currentMembership = this.memberships.get(membershipId);

    if (!currentMembership) {
      throw new ForbiddenError("Membership nao acessivel.");
    }

    const before = { ...currentMembership };
    const after = { ...currentMembership, role };

    this.memberships.set(membershipId, after);

    return {
      after,
      before,
    };
  }
}

class FakeFiscalService implements FiscalService {
  private readonly settings = new Map<string, NfseFiscalSettingsRecord>();
  private readonly providers = new Map<string, ProviderFiscalProfileRecord>();
  private readonly clientProfiles = new Map<string, ClientFiscalProfileRecord>();
  private readonly services = new Map<string, TaxableServiceRecord>();
  private readonly documents = new Map<string, NfseDocumentRecord>();
  private readonly events = new Map<string, NfseDocumentEventRecord[]>();
  private readonly rejections = new Map<string, NfseDocumentRejectionRecord[]>();
  private readonly files = new Map<string, NfseDocumentFileRecord[]>();
  private readonly remoteEvents = new Map<string, NfseDocumentRemoteEventRecord[]>();
  private readonly reconciliations = new Map<string, NfseDocumentReconciliationRecord[]>();
  private readonly issueBehaviors = new Map<string, "authorized" | "rejected" | "timeout" | "processing">();
  private readonly syncBehaviors = new Map<string, "authorized" | "rejected" | "processing">();
  private readonly lifecycleBehaviors = new Map<string, "cancelled" | "none">();
  private nextDraftId = 1;
  private nextEventId = 1;
  private nextRejectionId = 1;
  private nextFileId = 1;
  private nextRemoteEventId = 1;
  private nextReconciliationId = 1;

  constructor(seed?: FiscalSeed) {
    for (const item of seed?.settings ?? [makeSettings()]) {
      this.settings.set(item.organizationId, item);
    }

    for (const item of seed?.providerProfiles ?? [makeProvider()]) {
      this.providers.set(item.organizationId, item);
    }

    for (const item of seed?.clientProfiles ?? [makeClient()]) {
      this.clientProfiles.set(`${item.organizationId}:${item.clientId}`, item);
    }

    for (const item of seed?.taxableServices ?? [makeService()]) {
      this.services.set(`${item.organizationId}:${item.id}`, item);
    }

    for (const item of seed?.documents ?? []) {
      this.documents.set(item.id, item);
    }

    for (const [documentId, items] of Object.entries(seed?.remoteEvents ?? {})) {
      this.remoteEvents.set(documentId, items);
    }

    for (const [documentId, items] of Object.entries(seed?.reconciliations ?? {})) {
      this.reconciliations.set(documentId, items);
    }

    for (const [documentId, behavior] of Object.entries(seed?.issueBehaviors ?? {})) {
      this.issueBehaviors.set(documentId, behavior);
    }

    for (const [documentId, behavior] of Object.entries(seed?.syncBehaviors ?? {})) {
      this.syncBehaviors.set(documentId, behavior);
    }

    for (const [documentId, behavior] of Object.entries(seed?.lifecycleBehaviors ?? {})) {
      this.lifecycleBehaviors.set(documentId, behavior);
    }
  }

  setIssueBehavior(documentId: string, behavior: "authorized" | "rejected" | "timeout" | "processing") {
    this.issueBehaviors.set(documentId, behavior);
  }

  setSyncBehavior(documentId: string, behavior: "authorized" | "rejected" | "processing") {
    this.syncBehaviors.set(documentId, behavior);
  }

  setLifecycleBehavior(documentId: string, behavior: "cancelled" | "none") {
    this.lifecycleBehaviors.set(documentId, behavior);
  }

  private getClientProfile(organizationId: string, clientId: string) {
    return this.clientProfiles.get(`${organizationId}:${clientId}`) ?? null;
  }

  private getService(organizationId: string, serviceId: string) {
    return this.services.get(`${organizationId}:${serviceId}`) ?? null;
  }

  private nextIds() {
    return {
      eventId: `evt-${this.nextEventId++}`,
      fileId: `file-${this.nextFileId++}`,
      rejectionId: `rej-${this.nextRejectionId++}`,
    };
  }

  private appendEvent(
    organizationId: string,
    documentId: string,
    actorUserId: string | null,
    eventType: string,
    statusFrom: NfseDocumentEventRecord["statusFrom"],
    statusTo: NfseDocumentEventRecord["statusTo"],
    payload: Record<string, unknown> = {},
  ) {
    const event: NfseDocumentEventRecord = {
      actorUserId,
      createdAt: nowIso(),
      eventType,
      id: `evt-${this.nextEventId++}`,
      organizationId,
      payload,
      serviceInvoiceId: documentId,
      statusFrom,
      statusTo,
    };
    const current = this.events.get(documentId) ?? [];
    this.events.set(documentId, [event, ...current]);
    return event;
  }

  private appendRejection(
    organizationId: string,
    documentId: string,
    eventId: string | null,
    attempt: number,
    code: string,
    message: string,
    field: string | null,
    detail: Record<string, unknown> = {},
  ) {
    const rejection: NfseDocumentRejectionRecord = {
      attempt,
      code,
      createdAt: nowIso(),
      detail,
      eventId,
      field,
      id: `rej-${this.nextRejectionId++}`,
      message,
      organizationId,
      resolutionNote: null,
      resolvedAt: null,
      resolvedBy: null,
      serviceInvoiceId: documentId,
    };
    const current = this.rejections.get(documentId) ?? [];
    this.rejections.set(documentId, [rejection, ...current]);
    return rejection;
  }

  private appendFile(
    organizationId: string,
    documentId: string,
    eventId: string | null,
    fileRole: NfseDocumentFileRecord["fileRole"],
    mimeType: string,
    content: string,
    isBase64 = false,
    isLocked = false,
  ) {
    const file: NfseDocumentFileRecord = {
      byteSize: isBase64 ? Buffer.from(content, "base64").byteLength : Buffer.byteLength(content, "utf8"),
      createdAt: nowIso(),
      environment: "homologation",
      eventId,
      fileRole,
      hasBinaryContent: isBase64,
      hasTextContent: !isBase64,
      id: `file-${this.nextFileId++}`,
      isLocked,
      mimeType,
      organizationId,
      serviceInvoiceId: documentId,
      sha256Hash: `sha256-${documentId}-${fileRole}`,
    };
    const current = this.files.get(documentId) ?? [];
    this.files.set(documentId, [file, ...current]);
    return file;
  }

  private appendRemoteEvent(
    organizationId: string,
    documentId: string,
    eventName: string,
    effect: NfseDocumentRemoteEventRecord["effect"],
    options?: {
      accessKey?: string | null;
      detail?: Record<string, unknown>;
      eventSequence?: number;
      eventTypeCode?: number | null;
      fileId?: string | null;
      occurredAt?: string | null;
      source?: string;
    },
  ) {
    const remoteEvent: NfseDocumentRemoteEventRecord = {
      accessKey: options?.accessKey ?? this.ensureDocument(organizationId, documentId).accessKey ?? "",
      createdAt: nowIso(),
      detail: options?.detail ?? {},
      effect,
      eventName,
      eventSequence: options?.eventSequence ?? 1,
      eventTypeCode: options?.eventTypeCode ?? null,
      fileId: options?.fileId ?? null,
      id: `remote-${this.nextRemoteEventId++}`,
      occurredAt: options?.occurredAt ?? nowIso(),
      organizationId,
      serviceInvoiceId: documentId,
      source: options?.source ?? "adn",
    };
    const current = this.remoteEvents.get(documentId) ?? [];
    this.remoteEvents.set(documentId, [remoteEvent, ...current]);
    return remoteEvent;
  }

  private appendReconciliation(
    organizationId: string,
    documentId: string,
    actorUserId: string | null,
    chargeId: string | null,
    processId: string | null,
    status: NfseDocumentReconciliationRecord["status"],
    issues: NfseDocumentReconciliationRecord["issues"],
    snapshot: Record<string, unknown>,
  ) {
    const reconciliation: NfseDocumentReconciliationRecord = {
      actorUserId,
      chargeId,
      createdAt: nowIso(),
      id: `rec-${this.nextReconciliationId++}`,
      issues,
      organizationId,
      processId,
      serviceInvoiceId: documentId,
      snapshot,
      status,
    };
    const current = this.reconciliations.get(documentId) ?? [];
    this.reconciliations.set(documentId, [reconciliation, ...current]);
    return reconciliation;
  }

  private toDocumentRecord(
    organizationId: string,
    actorUserId: string,
    payload: NfseDraftInput,
    options?: {
      clientProfile?: ClientFiscalProfileRecord | null;
      providerProfile?: ProviderFiscalProfileRecord | null;
      settings?: NfseFiscalSettingsRecord | null;
      taxableService?: TaxableServiceRecord | null;
    },
  ): NfseDocumentRecord {
    const settings = options?.settings ?? this.settings.get(organizationId) ?? null;
    const providerProfile = options?.providerProfile ?? this.providers.get(organizationId) ?? null;
    const clientProfile = options?.clientProfile ?? this.getClientProfile(organizationId, payload.clientId);
    const taxableService = options?.taxableService ?? this.getService(organizationId, payload.taxableServiceId);
    const readiness = buildNfseDraftReadiness({
      clientProfile,
      draft: payload,
      providerProfile,
      settings,
      taxableService,
    });

    return {
      accessKey: null,
      amounts: payload.amounts,
      authorizedAt: null,
      availableFiles: [],
      chargeId: payload.chargeId ?? null,
      clientFiscalProfileId: clientProfile?.id ?? null,
      clientId: payload.clientId,
      competenceDate: payload.competenceDate,
      createdAt: nowIso(),
      currencyCode: "BRL",
      description: payload.description,
      documentationReference: settings?.documentationReference ?? "pending-documentation-reference",
      dpsIdentifier: null,
      dpsNumber: null,
      fiscalSettingsId: settings?.id ?? null,
      id: `draft-${this.nextDraftId++}`,
      idempotencyKey: null,
      intendedIssueDate: payload.intendedIssueDate,
      issueRequestedAt: null,
      lastSyncedAt: null,
      latestRejection: null,
      latestReconciliation: null,
      layoutVersion: settings?.layoutVersion ?? "pending-layout-version",
      notes: payload.notes ?? null,
      organizationId,
      pendingStatusCheck: false,
      preparedBy: actorUserId,
      processId: payload.processId ?? null,
      providerSnapshot: providerProfile ? { ...providerProfile } : null,
      readyForIssueAt: readiness.isReady ? nowIso() : null,
      readiness,
      serviceDate: payload.serviceDate,
      serviceSnapshot: taxableService ? { ...taxableService } : null,
      status: readiness.status,
      takerSnapshot: clientProfile ? { ...clientProfile } : null,
      taxes: payload.taxes,
      taxableServiceId: taxableService?.id ?? null,
      transmissionState: "idle",
      updatedAt: nowIso(),
      validationStatus: readiness.isReady ? "valid" : "invalid",
      verificationCode: null,
      cancelEventId: null,
      cancelledReasonCode: null,
      cancelledReasonText: null,
      lifecycleSyncedAt: null,
    };
  }

  private ensureDocument(organizationId: string, documentId: string) {
    const document = this.documents.get(documentId);

    if (!document || document.organizationId !== organizationId) {
      throw new NotFoundError("Documento fiscal nao encontrado.");
    }

    return document;
  }

  private issuePrerequisites(document: NfseDocumentRecord, settings: NfseFiscalSettingsRecord | null) {
    if (!settings?.isActive || settings.validationStatus !== "valid") {
      throw new BadRequestError("Configuracao fiscal da NFS-e ainda nao esta apta para emissao.");
    }

    if (settings.environment === "production") {
      throw new BadRequestError("O ambiente de producao permanece bloqueado nesta fase.");
    }

    if (!settings.certificateReference) {
      throw new ConfigurationError("A referencia segura do certificado fiscal ainda nao foi configurada.");
    }

    if (!document.providerSnapshot || !document.takerSnapshot || !document.serviceSnapshot) {
      throw new BadRequestError("O documento fiscal nao possui snapshots suficientes para transmissao.");
    }

    if (document.status === "authorized" || document.accessKey) {
      throw new BadRequestError("Este documento ja possui retorno oficial de autorizacao.");
    }

    if (
      document.pendingStatusCheck ||
      document.transmissionState === "processing" ||
      document.transmissionState === "timeout_pending_query"
    ) {
      throw new BadRequestError("Existe transmissao anterior pendente de consulta; sincronize o status antes de reenviar.");
    }

    if (document.status !== "ready_for_issue" && document.status !== "failed") {
      throw new BadRequestError("Somente documentos prontos ou corrigidos podem ser transmitidos.");
    }
  }

  private updateDocument(documentId: string, next: Partial<NfseDocumentRecord>) {
    const current = this.documents.get(documentId);

    if (!current) {
      throw new NotFoundError("Documento fiscal nao encontrado.");
    }

    const updated: NfseDocumentRecord = {
      ...current,
      ...next,
      availableFiles: next.availableFiles ?? current.availableFiles,
      latestRejection: next.latestRejection ?? current.latestRejection,
      latestReconciliation: next.latestReconciliation ?? current.latestReconciliation,
      cancelEventId: next.cancelEventId ?? current.cancelEventId,
      cancelledReasonCode: next.cancelledReasonCode ?? current.cancelledReasonCode,
      cancelledReasonText: next.cancelledReasonText ?? current.cancelledReasonText,
      lifecycleSyncedAt: next.lifecycleSyncedAt ?? current.lifecycleSyncedAt,
      updatedAt: nowIso(),
    };
    this.documents.set(documentId, updated);
    return updated;
  }

  async getFiscalSettings({
    organizationId,
  }: {
    accessToken: string;
    organizationId: string;
  }) {
    return this.settings.get(organizationId) ?? null;
  }

  async saveFiscalSettings({
    organizationId,
    payload,
  }: {
    accessToken: string;
    organizationId: string;
    payload: NfseFiscalSettingsInput;
  }) {
    const current = this.settings.get(organizationId);
    const record: NfseFiscalSettingsRecord = {
      ...payload,
      createdAt: current?.createdAt ?? nowIso(),
      id: current?.id ?? `settings-${organizationId}`,
      organizationId,
      updatedAt: nowIso(),
    };
    this.settings.set(organizationId, record);
    return record;
  }

  async getProviderProfile({
    organizationId,
  }: {
    accessToken: string;
    organizationId: string;
  }) {
    return this.providers.get(organizationId) ?? null;
  }

  async saveProviderProfile({
    organizationId,
    payload,
  }: {
    accessToken: string;
    organizationId: string;
    payload: ProviderFiscalProfileInput;
  }) {
    const current = this.providers.get(organizationId);
    const record: ProviderFiscalProfileRecord = {
      ...payload,
      createdAt: current?.createdAt ?? nowIso(),
      id: current?.id ?? `provider-${organizationId}`,
      organizationId,
      updatedAt: nowIso(),
    };
    this.providers.set(organizationId, record);
    return record;
  }

  async getClientFiscalProfile({
    organizationId,
    clientId,
  }: {
    accessToken: string;
    organizationId: string;
    clientId: string;
  }) {
    return this.getClientProfile(organizationId, clientId);
  }

  async saveClientFiscalProfile({
    organizationId,
    clientId,
    payload,
  }: {
    accessToken: string;
    organizationId: string;
    clientId: string;
    payload: ClientFiscalProfileInput;
  }) {
    const key = `${organizationId}:${clientId}`;
    const current = this.clientProfiles.get(key);
    const record: ClientFiscalProfileRecord = {
      ...payload,
      clientId,
      createdAt: current?.createdAt ?? nowIso(),
      id: current?.id ?? `client-fiscal-${clientId}`,
      organizationId,
      updatedAt: nowIso(),
    };
    this.clientProfiles.set(key, record);
    return record;
  }

  async listTaxableServices({
    organizationId,
  }: {
    accessToken: string;
    organizationId: string;
  }) {
    return [...this.services.values()].filter((item) => item.organizationId === organizationId);
  }

  async saveTaxableService({
    organizationId,
    payload,
    serviceId,
  }: {
    accessToken: string;
    organizationId: string;
    actorUserId: string;
    serviceId?: string;
    payload: TaxableServiceInput;
  }) {
    const id = serviceId ?? `service-${this.services.size + 1}`;
    const key = `${organizationId}:${id}`;
    const current = this.services.get(key);
    const record: TaxableServiceRecord = {
      ...payload,
      createdAt: current?.createdAt ?? nowIso(),
      id,
      organizationId,
      updatedAt: nowIso(),
      version: current ? current.version + 1 : 1,
    };
    this.services.set(key, record);
    return record;
  }

  async listDocuments({
    organizationId,
  }: {
    accessToken: string;
    organizationId: string;
  }) {
    return [...this.documents.values()].filter((item) => item.organizationId === organizationId);
  }

  async getDocument({
    organizationId,
    documentId,
  }: {
    accessToken: string;
    organizationId: string;
    documentId: string;
  }) {
    return this.ensureDocument(organizationId, documentId);
  }

  async createDraftDocument({
    organizationId,
    actorUserId,
    payload,
  }: {
    accessToken: string;
    organizationId: string;
    actorUserId: string;
    payload: NfseDraftInput;
  }) {
    const record = this.toDocumentRecord(organizationId, actorUserId, payload);
    this.documents.set(record.id, record);
    this.events.set(record.id, []);
    this.rejections.set(record.id, []);
    this.files.set(record.id, []);
    this.remoteEvents.set(record.id, []);
    this.reconciliations.set(record.id, []);
    return record;
  }

  async updateDraftDocument({
    organizationId,
    documentId,
    payload,
  }: {
    accessToken: string;
    organizationId: string;
    actorUserId: string;
    documentId: string;
    payload: NfseDraftUpdateInput;
  }) {
    const current = this.ensureDocument(organizationId, documentId);

    if (current.status === "authorized" || current.status === "cancelled") {
      throw new BadRequestError("Documentos com retorno fiscal oficial sao imutaveis nesta fase.");
    }

    if (
      current.pendingStatusCheck ||
      current.transmissionState === "processing" ||
      current.transmissionState === "timeout_pending_query" ||
      current.transmissionState === "cancel_requested"
    ) {
      throw new BadRequestError("O documento possui processamento fiscal em curso e nao pode ser editado.");
    }

    const nextPayload: NfseDraftInput = {
      amounts: payload.amounts ?? current.amounts,
      chargeId: payload.chargeId ?? current.chargeId,
      clientId: current.clientId,
      competenceDate: payload.competenceDate ?? current.competenceDate,
      currencyCode: "BRL",
      description: payload.description ?? current.description,
      intendedIssueDate: payload.intendedIssueDate ?? current.intendedIssueDate,
      notes: payload.notes ?? current.notes,
      processId: payload.processId ?? current.processId,
      serviceDate: payload.serviceDate ?? current.serviceDate,
      taxableServiceId: current.taxableServiceId ?? draftDefault.taxableServiceId,
      taxes: payload.taxes ?? current.taxes,
    };
    const settings = this.settings.get(organizationId) ?? null;
    const readiness = buildNfseDraftReadiness({
      clientProfile: current.takerSnapshot,
      draft: nextPayload,
      providerProfile: current.providerSnapshot,
      settings,
      taxableService: current.serviceSnapshot,
    });

    return this.updateDocument(documentId, {
      amounts: nextPayload.amounts,
      competenceDate: nextPayload.competenceDate,
      description: nextPayload.description,
      intendedIssueDate: nextPayload.intendedIssueDate,
      notes: nextPayload.notes ?? null,
      readyForIssueAt: readiness.isReady ? nowIso() : null,
      readiness,
      serviceDate: nextPayload.serviceDate,
      status: readiness.status,
      taxes: nextPayload.taxes,
      validationStatus: readiness.isReady ? "valid" : "invalid",
    });
  }

  async issueDocument({
    organizationId,
    actorUserId,
    documentId,
  }: {
    accessToken: string;
    organizationId: string;
    actorUserId: string;
    documentId: string;
  }): Promise<NfseIssueDocumentResult> {
    const current = this.ensureDocument(organizationId, documentId);
    const settings = this.settings.get(organizationId) ?? null;
    this.issuePrerequisites(current, settings);

    const dpsNumber = current.dpsNumber ?? "000000000000001";
    const dpsIdentifier = current.dpsIdentifier ?? `3520506200000000000000000000A1000000000000001`;
    const idempotencyKey = current.idempotencyKey ?? `idem-${documentId}`;

    this.appendEvent(organizationId, documentId, actorUserId, "validation.started", current.status, current.status, {
      dpsIdentifier,
      idempotencyKey,
    });

    const requestEvent = this.appendEvent(
      organizationId,
      documentId,
      actorUserId,
      "transmission.requested",
      current.status,
      "queued",
      {
        dpsIdentifier,
        dpsNumber,
        idempotencyKey,
      },
    );

    const files: NfseDocumentFileRecord[] = [
      this.appendFile(
        organizationId,
        documentId,
        requestEvent.id,
        "request_xml",
        "application/xml",
        `<DPS id="${dpsIdentifier}"></DPS>`,
      ),
    ];
    const rejections: NfseDocumentRejectionRecord[] = [];
    const events = [requestEvent];

    const baseUpdate = {
      dpsIdentifier,
      dpsNumber,
      idempotencyKey,
      issueRequestedAt: nowIso(),
    } satisfies Partial<NfseDocumentRecord>;

    const behavior = this.issueBehaviors.get(documentId) ?? "authorized";

    if (behavior === "authorized") {
      const authorizedEvent = this.appendEvent(
        organizationId,
        documentId,
        actorUserId,
        "document.authorized",
        "queued",
        "authorized",
        {
          accessKey: "35205061716670700017500000000000000000000001",
          nfseNumber: "100001",
        },
      );
      events.push(authorizedEvent);

      files.push(
        this.appendFile(
          organizationId,
          documentId,
          authorizedEvent.id,
          "authorized_xml",
          "application/xml",
          "<Nfse>autorizada</Nfse>",
          false,
          true,
        ),
      );
      files.push(
        this.appendFile(
          organizationId,
          documentId,
          authorizedEvent.id,
          "danfse_pdf",
          "application/pdf",
          Buffer.from("%PDF-1.4 fake danfse").toString("base64"),
          true,
          true,
        ),
      );

      const updated = this.updateDocument(documentId, {
        ...baseUpdate,
        accessKey: "35205061716670700017500000000000000000000001",
        authorizedAt: nowIso(),
        availableFiles: files.map((file) => file.fileRole),
        lastSyncedAt: nowIso(),
        pendingStatusCheck: false,
        status: "authorized",
        transmissionState: "authorized",
        verificationCode: "ABC12345",
      });

      return {
        document: updated,
        events,
        files,
        rejections,
      };
    }

    if (behavior === "rejected") {
      files.push(
        this.appendFile(
          organizationId,
          documentId,
          requestEvent.id,
          "response_xml",
          "application/xml",
          "<retorno><codigo>E185</codigo><mensagem>Codigo municipal invalido</mensagem></retorno>",
        ),
      );

      const rejectedEvent = this.appendEvent(
        organizationId,
        documentId,
        actorUserId,
        "transmission.rejected",
        "queued",
        "failed",
        {
          code: "E185",
          field: "municipalServiceCode",
          message: "Codigo municipal invalido",
        },
      );
      events.push(rejectedEvent);

      const rejection = this.appendRejection(
        organizationId,
        documentId,
        rejectedEvent.id,
        1,
        "E185",
        "Codigo municipal invalido",
        "municipalServiceCode",
      );
      rejections.push(rejection);

      const updated = this.updateDocument(documentId, {
        ...baseUpdate,
        availableFiles: files.map((file) => file.fileRole),
        lastSyncedAt: nowIso(),
        latestRejection: rejection,
        pendingStatusCheck: false,
        status: "failed",
        transmissionState: "rejected",
      });

      return {
        document: updated,
        events,
        files,
        rejections,
      };
    }

    if (behavior === "processing") {
      files.push(
        this.appendFile(
          organizationId,
          documentId,
          requestEvent.id,
          "response_xml",
          "application/xml",
          "<retorno><status>processando</status></retorno>",
        ),
      );
      const acceptedEvent = this.appendEvent(
        organizationId,
        documentId,
        actorUserId,
        "transmission.accepted",
        "queued",
        "queued",
        {
          needsStatusQuery: true,
        },
      );
      events.push(acceptedEvent);

      const updated = this.updateDocument(documentId, {
        ...baseUpdate,
        availableFiles: files.map((file) => file.fileRole),
        lastSyncedAt: nowIso(),
        pendingStatusCheck: true,
        status: "queued",
        transmissionState: "processing",
      });

      return {
        document: updated,
        events,
        files,
        rejections,
      };
    }

    const timeoutEvent = this.appendEvent(
      organizationId,
      documentId,
      actorUserId,
      "network.timeout",
      "queued",
      "queued",
      {
        message: "A transmissao excedeu o tempo limite; consulte o status antes de retransmitir.",
      },
    );
    events.push(timeoutEvent);

    const updated = this.updateDocument(documentId, {
      ...baseUpdate,
      availableFiles: files.map((file) => file.fileRole),
      lastSyncedAt: nowIso(),
      pendingStatusCheck: true,
      status: "queued",
      transmissionState: "timeout_pending_query",
    });

    return {
      document: updated,
      events,
      files,
      rejections,
    };
  }

  async syncDocumentStatus({
    organizationId,
    actorUserId,
    documentId,
  }: {
    accessToken: string;
    organizationId: string;
    actorUserId: string;
    documentId: string;
  }): Promise<NfseIssueDocumentResult> {
    const current = this.ensureDocument(organizationId, documentId);

    if (!current.pendingStatusCheck || !current.dpsIdentifier) {
      throw new BadRequestError("O documento nao possui processamento pendente para consulta.");
    }

    const queryEvent = this.appendEvent(
      organizationId,
      documentId,
      actorUserId,
      "processing.query.requested",
      current.status,
      current.status,
      {
        dpsIdentifier: current.dpsIdentifier,
      },
    );
    const files: NfseDocumentFileRecord[] = [];
    const rejections: NfseDocumentRejectionRecord[] = [];
    const events = [queryEvent];
    const behavior = this.syncBehaviors.get(documentId) ?? "authorized";

    if (behavior === "authorized") {
      const authorizedEvent = this.appendEvent(
        organizationId,
        documentId,
        actorUserId,
        "document.authorized",
        current.status,
        "authorized",
        {
          accessKey: "35205061716670700017500000000000000000000001",
          nfseNumber: "100001",
        },
      );
      events.push(authorizedEvent);

      files.push(
        this.appendFile(
          organizationId,
          documentId,
          authorizedEvent.id,
          "authorized_xml",
          "application/xml",
          "<Nfse>autorizada-apos-consulta</Nfse>",
          false,
          true,
        ),
      );

      const updated = this.updateDocument(documentId, {
        accessKey: "35205061716670700017500000000000000000000001",
        authorizedAt: nowIso(),
        availableFiles: [...new Set([...current.availableFiles, ...files.map((item) => item.fileRole)])],
        lastSyncedAt: nowIso(),
        pendingStatusCheck: false,
        status: "authorized",
        transmissionState: "authorized",
        verificationCode: "ABC12345",
      });

      return {
        document: updated,
        events,
        files,
        rejections,
      };
    }

    if (behavior === "rejected") {
      const rejectedEvent = this.appendEvent(
        organizationId,
        documentId,
        actorUserId,
        "document.error_definitive",
        current.status,
        "failed",
        {
          code: "E400",
          field: "documentNumber",
          message: "Documento do tomador rejeitado",
        },
      );
      events.push(rejectedEvent);
      const rejection = this.appendRejection(
        organizationId,
        documentId,
        rejectedEvent.id,
        1,
        "E400",
        "Documento do tomador rejeitado",
        "documentNumber",
      );
      rejections.push(rejection);

      const updated = this.updateDocument(documentId, {
        lastSyncedAt: nowIso(),
        latestRejection: rejection,
        pendingStatusCheck: false,
        status: "failed",
        transmissionState: "rejected",
      });

      return {
        document: updated,
        events,
        files,
        rejections,
      };
    }

    const pendingEvent = this.appendEvent(
      organizationId,
      documentId,
      actorUserId,
      "processing.query.pending",
      current.status,
      "queued",
      {
        status: "processing",
      },
    );
    events.push(pendingEvent);

    const updated = this.updateDocument(documentId, {
      lastSyncedAt: nowIso(),
      pendingStatusCheck: true,
      status: "queued",
      transmissionState: "processing",
    });

    return {
      document: updated,
      events,
      files,
      rejections,
    };
  }

  async syncDocumentLifecycle({
    accessToken,
    organizationId,
    actorUserId,
    documentId,
  }: {
    accessToken: string;
    organizationId: string;
    actorUserId: string;
    documentId: string;
  }): Promise<NfseIssueDocumentResult> {
    let baseDocument = this.ensureDocument(organizationId, documentId);

    if (baseDocument.pendingStatusCheck && baseDocument.dpsIdentifier) {
      await this.syncDocumentStatus({
        accessToken,
        actorUserId,
        documentId,
        organizationId,
      });
      baseDocument = this.ensureDocument(organizationId, documentId);
    }

    const lifecycleBehavior = this.lifecycleBehaviors.get(documentId) ?? "none";

    if (lifecycleBehavior === "cancelled" && baseDocument.status === "authorized") {
      const file = this.appendFile(
        organizationId,
        documentId,
        null,
        "event_xml",
        "application/xml",
        "<evento><tipo>cancelamento</tipo><motivo>Cancelamento sincronizado</motivo></evento>",
        false,
        true,
      );
      const remoteEvent = this.appendRemoteEvent(organizationId, documentId, "Cancelamento", "cancelled", {
        accessKey: baseDocument.accessKey,
        detail: {
          reason: "Cancelamento sincronizado em homologacao",
        },
        fileId: file.id,
      });
      const localEvent = this.appendEvent(
        organizationId,
        documentId,
        actorUserId,
        "document.cancelled",
        "authorized",
        "cancelled",
        {
          remoteEventId: remoteEvent.id,
          source: remoteEvent.source,
        },
      );

      this.updateDocument(documentId, {
        availableFiles: [...new Set([...baseDocument.availableFiles, file.fileRole])],
        cancelEventId: remoteEvent.id,
        cancelledReasonCode: "REMOTE_CANCELLED",
        cancelledReasonText: "Cancelamento sincronizado a partir do ambiente oficial.",
        lifecycleSyncedAt: nowIso(),
        lastSyncedAt: nowIso(),
        pendingStatusCheck: false,
        status: "cancelled",
        transmissionState: "cancelled",
      });

      const reconciliation = await this.reconcileDocument({
        accessToken,
        actorUserId,
        documentId,
        organizationId,
      });

      return {
        document: reconciliation,
        events: [localEvent, ...(this.events.get(documentId) ?? [])],
        files: this.files.get(documentId) ?? [],
        rejections: this.rejections.get(documentId) ?? [],
      };
    }

    const syncEvent = this.appendEvent(
      organizationId,
      documentId,
      actorUserId,
      "lifecycle.remote_events_synced",
      baseDocument.status,
      baseDocument.status,
      {
        remoteEvents: (this.remoteEvents.get(documentId) ?? []).length,
      },
    );

    const updated = this.updateDocument(documentId, {
      lastSyncedAt: nowIso(),
      lifecycleSyncedAt: nowIso(),
    });

    return {
      document: updated,
      events: [syncEvent, ...(this.events.get(documentId) ?? [])],
      files: this.files.get(documentId) ?? [],
      rejections: this.rejections.get(documentId) ?? [],
    };
  }

  async reconcileDocument({
    organizationId,
    actorUserId,
    documentId,
  }: {
    accessToken: string;
    organizationId: string;
    actorUserId: string;
    documentId: string;
  }) {
    const current = this.ensureDocument(organizationId, documentId);
    const issues: NfseDocumentReconciliationRecord["issues"] = [];

    if (!current.chargeId) {
      issues.push({
        code: "missing_charge",
        message: "Documento fiscal sem cobranca vinculada.",
        severity: current.status === "authorized" ? "divergent" : "attention",
      });
    }

    if (!current.processId) {
      issues.push({
        code: "missing_process",
        message: "Documento fiscal sem processo operacional vinculado.",
        severity: "attention",
      });
    }

    if (current.status === "cancelled" && current.chargeId) {
      issues.push({
        code: "cancelled_charge_review",
        message: "Documento cancelado exige revisao da cobranca associada.",
        severity: "divergent",
      });
    }

    const status: NfseDocumentReconciliationRecord["status"] =
      issues.length === 0
        ? "aligned"
        : issues.some((issue) => issue.severity === "divergent")
          ? "divergent"
          : "attention";

    const reconciliation = this.appendReconciliation(
      organizationId,
      documentId,
      actorUserId,
      current.chargeId,
      current.processId,
      status,
      issues,
      {
        accessKey: current.accessKey,
        documentStatus: current.status,
        transmissionState: current.transmissionState,
      },
    );

    this.appendEvent(
      organizationId,
      documentId,
      actorUserId,
      "reconciliation.checked",
      current.status,
      current.status,
      {
        reconciliationId: reconciliation.id,
        reconciliationStatus: reconciliation.status,
      },
    );

    return this.updateDocument(documentId, {
      latestReconciliation: reconciliation,
    });
  }

  async listDocumentEvents({
    organizationId,
    documentId,
  }: {
    accessToken: string;
    organizationId: string;
    documentId: string;
  }) {
    this.ensureDocument(organizationId, documentId);
    return this.events.get(documentId) ?? [];
  }

  async listDocumentRemoteEvents({
    organizationId,
    documentId,
  }: {
    accessToken: string;
    organizationId: string;
    documentId: string;
  }) {
    this.ensureDocument(organizationId, documentId);
    return this.remoteEvents.get(documentId) ?? [];
  }

  async listDocumentRejections({
    organizationId,
    documentId,
  }: {
    accessToken: string;
    organizationId: string;
    documentId: string;
  }) {
    this.ensureDocument(organizationId, documentId);
    return this.rejections.get(documentId) ?? [];
  }

  async listDocumentFiles({
    organizationId,
    documentId,
  }: {
    accessToken: string;
    organizationId: string;
    documentId: string;
  }) {
    this.ensureDocument(organizationId, documentId);
    return this.files.get(documentId) ?? [];
  }

  async downloadDocumentFile({
    organizationId,
    documentId,
    fileId,
  }: {
    accessToken: string;
    organizationId: string;
    documentId: string;
    fileId: string;
  }): Promise<NfseDocumentFileDownload> {
    this.ensureDocument(organizationId, documentId);
    const file = (this.files.get(documentId) ?? []).find((item) => item.id === fileId);

    if (!file) {
      throw new NotFoundError("Arquivo fiscal nao encontrado.");
    }

    const isBase64 = file.fileRole === "danfse_pdf";
    const content = isBase64
      ? Buffer.from("%PDF-1.4 fake danfse").toString("base64")
      : file.fileRole === "authorized_xml"
        ? "<Nfse>autorizada</Nfse>"
        : "<xml>retorno</xml>";

    return {
      content,
      fileName: `nfse-${documentId}-${file.fileRole}.${isBase64 ? "pdf" : "xml"}`,
      isBase64,
      mimeType: file.mimeType,
    };
  }

  async processPendingFiscalJobs({
    accessToken,
    organizationId,
    actorUserId,
  }: {
    accessToken: string;
    organizationId: string;
    actorUserId: string;
  }) {
    const pending = [...this.documents.values()].filter(
      (item) => item.organizationId === organizationId && item.pendingStatusCheck,
    );
    let processed = 0;

    for (const document of pending) {
      await this.syncDocumentStatus({
        accessToken,
        actorUserId,
        documentId: document.id,
        organizationId,
      });
      processed += 1;
    }

    return processed;
  }

  async getEventMatrix(): Promise<NfseEventMatrixRecord[]> {
    return nfseNationalEventMatrix.map((item) => ({ ...item }));
  }
}

function createServices(options?: {
  configurationError?: boolean;
  fiscalSeed?: FiscalSeed;
  fixtures?: Record<string, TokenFixture>;
  memberships?: Map<string, MembershipRecord>;
}) {
  const fixtures = options?.fixtures ?? {
    "token-admin-org-a": {
      memberships: [{ isDefault: true, organizationId: "org-a", role: "administrator" }],
      userId: "user-admin",
    },
    "token-finance-org-a": {
      memberships: [{ isDefault: true, organizationId: "org-a", role: "financeiro" }],
      userId: "user-finance-a",
    },
    "token-finance-org-b": {
      memberships: [{ isDefault: true, organizationId: "org-b", role: "financeiro" }],
      userId: "user-finance-b",
    },
    "token-comercial-org-a": {
      memberships: [{ isDefault: true, organizationId: "org-a", role: "comercial" }],
      userId: "user-comercial",
    },
    "token-no-membership": {
      memberships: [],
      userId: "user-empty",
    },
    "token-org-a-only": {
      memberships: [{ isDefault: true, organizationId: "org-a", role: "financeiro" }],
      userId: "user-a",
    },
  };

  const memberships =
    options?.memberships ??
    new Map<string, MembershipRecord>([
      [
        "11111111-1111-1111-1111-111111111111",
        {
          id: "11111111-1111-1111-1111-111111111111",
          isDefault: false,
          organizationId: "org-a",
          role: "financeiro",
          userId: "user-target",
        },
      ],
    ]);

  const auditService = new FakeAuditService();
  const fiscalService = new FakeFiscalService(options?.fiscalSeed);

  const services: AppServices = {
    adminMembershipService: new FakeAdminMembershipService(memberships),
    auditService,
    authContextService: new FakeAuthContextService(fixtures, {
      configurationError: options?.configurationError,
    }),
    fiscalService,
  };

  return {
    auditService,
    fiscalService,
    memberships,
    services,
  };
}

async function request(services: AppServices, path: string, init?: RequestInit) {
  const app = createApp(services);
  return app.request(`http://localhost${path}`, init);
}

function authHeaders(token: string, extra?: Record<string, string>) {
  return {
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}

async function createReadyDocument(services: AppServices, token = "token-finance-org-a") {
  const response = await request(services, "/v1/finance/nfse/documents", {
    body: JSON.stringify(normalizeNfseDraftPayload(draftDefault)),
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  assert.equal(response.status, 201);
  const body = (await response.json()) as { item: NfseDocumentRecord };
  assert.equal(body.item.status, "ready_for_issue");
  return body.item;
}

test("1. endpoint privado sem token retorna 401", async () => {
  const { services } = createServices();
  const response = await request(services, "/v1/finance/overview");
  assert.equal(response.status, 401);
});

test("2. token invalido ou expirado retorna 401", async () => {
  const { services } = createServices();
  const response = await request(services, "/v1/finance/overview", {
    headers: authHeaders("token-invalido"),
  });
  assert.equal(response.status, 401);
});

test("3. usuario valido sem membership na organizacao retorna 403", async () => {
  const { services } = createServices();
  const response = await request(services, "/v1/finance/overview", {
    headers: authHeaders("token-no-membership"),
  });
  assert.equal(response.status, 403);
});

test("4. organizacao A nao consulta dados fiscais da organizacao B", async () => {
  const { services } = createServices();
  const response = await request(services, "/v1/finance/nfse/settings", {
    headers: authHeaders("token-org-a-only", {
      "x-organization-id": "org-b",
    }),
  });
  assert.equal(response.status, 403);
});

test("5. usuario sem permissao administrativa nao executa rota administrativa", async () => {
  const { services, auditService } = createServices();
  const response = await request(services, "/v1/admin/rbac/matrix", {
    headers: authHeaders("token-finance-org-a"),
  });
  assert.equal(response.status, 403);
  assert.equal(auditService.entries[0]?.action, "authorization.denied");
});

test("6. nenhum fallback admin e ativado quando a configuracao de auth esta ausente", async () => {
  const { services } = createServices({
    configurationError: true,
  });
  const response = await request(services, "/v1/finance/overview", {
    headers: authHeaders("token-admin-org-a"),
  });
  assert.equal(response.status, 503);
});

test("7. prestador incompleto nao habilita documento como pronto para emissao", async () => {
  const { services } = createServices({
    fiscalSeed: {
      providerProfiles: [makeProvider({ municipalRegistration: "" as never })],
      settings: [makeSettings()],
      taxableServices: [makeService()],
    },
  });
  const response = await request(services, "/v1/finance/nfse/documents", {
    body: JSON.stringify(normalizeNfseDraftPayload(draftDefault)),
    headers: {
      ...authHeaders("token-finance-org-a"),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const body = (await response.json()) as { item: NfseDocumentRecord };
  assert.equal(response.status, 201);
  assert.equal(body.item.status, "draft");
  assert.equal(body.item.validationStatus, "invalid");
  assert.equal(
    body.item.readiness.issues.some((issue) => issue.code === "provider_missing_municipal_registration"),
    true,
  );
});

test("8. tomador com documento ou endereco fiscal invalido gera erro claro", async () => {
  const { services } = createServices();
  const response = await request(services, "/v1/finance/nfse/clients/client-demo-orion/fiscal-profile", {
    body: JSON.stringify({
      ...clientProfileDefault,
      documentNumber: "123",
      municipalityCode: "",
      neighborhood: "",
      number: "",
      postalCode: "",
      street: "",
    }),
    headers: {
      ...authHeaders("token-finance-org-a"),
      "Content-Type": "application/json",
    },
    method: "PUT",
  });
  const body = (await response.json()) as any;
  assert.equal(response.status, 400);
  assert.equal(body.message, "Payload fiscal invalido.");
  assert.equal(Boolean(body.details?.fieldErrors?.documentNumber), true);
  assert.equal(Boolean(body.details?.fieldErrors?.street || body.details?.fieldErrors?.postalCode), true);
});

test("9. servico sem codigo ou configuracao exigida nao fica apto a emissao", async () => {
  const { services } = createServices({
    fiscalSeed: {
      settings: [makeSettings()],
      taxableServices: [
        makeService({
          issRateOrigin: "pending",
          listServiceItem: "" as never,
          municipalServiceCode: "" as never,
          nationalTaxationCode: "" as never,
        }),
      ],
    },
  });
  const response = await request(services, "/v1/finance/nfse/documents", {
    body: JSON.stringify(normalizeNfseDraftPayload(draftDefault)),
    headers: {
      ...authHeaders("token-finance-org-a"),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const body = (await response.json()) as { item: NfseDocumentRecord };
  assert.equal(response.status, 201);
  assert.equal(body.item.status, "draft");
  assert.equal(body.item.readiness.issues.some((issue) => issue.code === "service_missing_municipal_code"), true);
});

test("10. documento preparado guarda snapshot e nao muda quando o cadastro e editado depois", async () => {
  const { services } = createServices();
  const created = await createReadyDocument(services);
  assert.equal(created.takerSnapshot?.legalName, "Orion Components Brasil Ltda");

  const updateClientResponse = await request(services, "/v1/finance/nfse/clients/client-demo-orion/fiscal-profile", {
    body: JSON.stringify({
      ...makeClient(),
      clientId: "client-demo-orion",
      legalName: "Orion Components Alterada Ltda",
    }),
    headers: {
      ...authHeaders("token-finance-org-a"),
      "Content-Type": "application/json",
    },
    method: "PUT",
  });
  assert.equal(updateClientResponse.status, 200);

  const listResponse = await request(services, "/v1/finance/nfse/documents", {
    headers: authHeaders("token-finance-org-a"),
  });
  const listed = (await listResponse.json()) as { items: NfseDocumentRecord[] };
  assert.equal(listed.items[0]?.takerSnapshot?.legalName, "Orion Components Brasil Ltda");
});

test("11. valores monetarios preservam precisao", async () => {
  const { services } = createServices();
  const response = await request(services, "/v1/finance/nfse/documents", {
    body: JSON.stringify(
      normalizeNfseDraftPayload({
        ...draftDefault,
        amounts: {
          ...draftDefault.amounts,
          discountAmount: "0.01",
          serviceAmount: "18450.10",
        },
      }),
    ),
    headers: {
      ...authHeaders("token-finance-org-a"),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const body = (await response.json()) as { item: NfseDocumentRecord };
  assert.equal(response.status, 201);
  assert.equal(body.item.amounts.serviceAmount, "18450.10");
  assert.equal(body.item.amounts.discountAmount, "0.01");
  assert.equal(body.item.taxes.issAmount, "369.00");
});

test("12. UI e API usam contratos compativeis para criacao do documento", async () => {
  const payload = normalizeNfseDraftPayload(draftDefault);
  assert.doesNotThrow(() => createNfseDraftSchema.parse(payload));
});

test("13. alteracoes fiscais sensiveis geram auditoria", async () => {
  const { auditService, services } = createServices();
  const response = await request(services, "/v1/finance/nfse/settings", {
    body: JSON.stringify({
      ...makeSettings(),
      validationStatus: "valid",
    }),
    headers: {
      ...authHeaders("token-finance-org-a"),
      "Content-Type": "application/json",
    },
    method: "PUT",
  });
  assert.equal(response.status, 200);
  assert.equal(auditService.entries[0]?.action, "fiscal.settings.saved");
  assert.equal(auditService.entries[0]?.entityType, "nfse_fiscal_settings");
});

test("14. usuario sem permissao fiscal nao emite nem baixa documento", async () => {
  const { services } = createServices();
  const document = await createReadyDocument(services);

  const issueResponse = await request(services, `/v1/finance/nfse/documents/${document.id}/issue`, {
    body: JSON.stringify({}),
    headers: {
      ...authHeaders("token-comercial-org-a"),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  assert.equal(issueResponse.status, 403);

  const fileDownloadResponse = await request(
    services,
    `/v1/finance/nfse/documents/${document.id}/files/file-nao-existe/download`,
    {
      headers: authHeaders("token-comercial-org-a"),
    },
  );
  assert.equal(fileDownloadResponse.status, 403);
});

test("15. documento incompleto ou configuracao incompleta bloqueia transmissao", async () => {
  const { services } = createServices();
  const document = await createReadyDocument(services);
  const settingsResponse = await request(services, "/v1/finance/nfse/settings", {
    body: JSON.stringify({
      ...makeSettings(),
      validationStatus: "pending",
    }),
    headers: {
      ...authHeaders("token-finance-org-a"),
      "Content-Type": "application/json",
    },
    method: "PUT",
  });
  assert.equal(settingsResponse.status, 200);
  const response = await request(services, `/v1/finance/nfse/documents/${document.id}/issue`, {
    body: JSON.stringify({}),
    headers: {
      ...authHeaders("token-finance-org-a"),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const body = (await response.json()) as { message: string };
  assert.equal(response.status, 400);
  assert.match(body.message, /Configuracao fiscal/);
});

test("16. ambiente de producao permanece bloqueado na fase 3", async () => {
  const { services } = createServices();
  const document = await createReadyDocument(services);
  const settingsResponse = await request(services, "/v1/finance/nfse/settings", {
    body: JSON.stringify({
      ...makeSettings(),
      environment: "production",
    }),
    headers: {
      ...authHeaders("token-finance-org-a"),
      "Content-Type": "application/json",
    },
    method: "PUT",
  });
  assert.equal(settingsResponse.status, 200);
  const response = await request(services, `/v1/finance/nfse/documents/${document.id}/issue`, {
    body: JSON.stringify({}),
    headers: {
      ...authHeaders("token-finance-org-a"),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const body = (await response.json()) as { message: string };
  assert.equal(response.status, 400);
  assert.match(body.message, /producao permanece bloqueado/);
});

test("17. chave idempotente impede dupla emissao do mesmo documento", async () => {
  const { services } = createServices();
  const document = await createReadyDocument(services);

  const firstResponse = await request(services, `/v1/finance/nfse/documents/${document.id}/issue`, {
    body: JSON.stringify({}),
    headers: {
      ...authHeaders("token-finance-org-a"),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const firstBody = (await firstResponse.json()) as NfseIssueDocumentResult;
  assert.equal(firstResponse.status, 200);
  assert.equal(firstBody.document.idempotencyKey, `idem-${document.id}`);

  const secondResponse = await request(services, `/v1/finance/nfse/documents/${document.id}/issue`, {
    body: JSON.stringify({}),
    headers: {
      ...authHeaders("token-finance-org-a"),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const secondBody = (await secondResponse.json()) as { message: string };
  assert.equal(secondResponse.status, 400);
  assert.match(secondBody.message, /retorno oficial de autorizacao/);
});

test("18. transmissao aceita salva status, evento, retorno e arquivos", async () => {
  const { services } = createServices();
  const document = await createReadyDocument(services);

  const response = await request(services, `/v1/finance/nfse/documents/${document.id}/issue`, {
    body: JSON.stringify({}),
    headers: {
      ...authHeaders("token-finance-org-a"),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const body = (await response.json()) as NfseIssueDocumentResult;
  assert.equal(response.status, 200);
  assert.equal(body.document.status, "authorized");
  assert.equal(body.document.transmissionState, "authorized");
  assert.equal(body.document.accessKey, "35205061716670700017500000000000000000000001");
  assert.equal(body.events.some((event) => event.eventType === "document.authorized"), true);
  assert.equal(body.files.some((file) => file.fileRole === "authorized_xml"), true);
  assert.equal(body.files.some((file) => file.fileRole === "danfse_pdf"), true);
});

test("19. rejeicao salva codigo, mensagem e nao marca documento como autorizado", async () => {
  const { services } = createServices();
  const document = await createReadyDocument(services);
  (services.fiscalService as FakeFiscalService).setIssueBehavior(document.id, "rejected");

  const response = await request(services, `/v1/finance/nfse/documents/${document.id}/issue`, {
    body: JSON.stringify({}),
    headers: {
      ...authHeaders("token-finance-org-a"),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const body = (await response.json()) as NfseIssueDocumentResult;
  assert.equal(response.status, 422);
  assert.equal(body.document.status, "failed");
  assert.equal(body.document.accessKey, null);
  assert.equal(body.rejections[0]?.code, "E185");
  assert.equal(body.rejections[0]?.message, "Codigo municipal invalido");
});

test("20. timeout nao causa retransmissao cega e exige consulta antes de reenviar", async () => {
  const { services } = createServices();
  const document = await createReadyDocument(services);
  (services.fiscalService as FakeFiscalService).setIssueBehavior(document.id, "timeout");

  const response = await request(services, `/v1/finance/nfse/documents/${document.id}/issue`, {
    body: JSON.stringify({}),
    headers: {
      ...authHeaders("token-finance-org-a"),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const body = (await response.json()) as NfseIssueDocumentResult;
  assert.equal(response.status, 202);
  assert.equal(body.document.pendingStatusCheck, true);
  assert.equal(body.document.transmissionState, "timeout_pending_query");

  const retryResponse = await request(services, `/v1/finance/nfse/documents/${document.id}/issue`, {
    body: JSON.stringify({}),
    headers: {
      ...authHeaders("token-finance-org-a"),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const retryBody = (await retryResponse.json()) as { message: string };
  assert.equal(retryResponse.status, 400);
  assert.match(retryBody.message, /sincronize o status antes de reenviar/);
});

test("21. XML e PDF permanecem privados ao tenant correto", async () => {
  const { services } = createServices();
  const document = await createReadyDocument(services);
  const issueResponse = await request(services, `/v1/finance/nfse/documents/${document.id}/issue`, {
    body: JSON.stringify({}),
    headers: {
      ...authHeaders("token-finance-org-a"),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const issued = (await issueResponse.json()) as NfseIssueDocumentResult;
  const xmlFile = issued.files.find((file) => file.fileRole === "authorized_xml");
  assert.ok(xmlFile);

  const ownDownload = await request(
    services,
    `/v1/finance/nfse/documents/${document.id}/files/${xmlFile?.id ?? ""}/download`,
    {
      headers: authHeaders("token-finance-org-a"),
    },
  );
  assert.equal(ownDownload.status, 200);

  const crossTenantDownload = await request(
    services,
    `/v1/finance/nfse/documents/${document.id}/files/${xmlFile?.id ?? ""}/download`,
    {
      headers: authHeaders("token-finance-org-b"),
    },
  );
  assert.notEqual(crossTenantDownload.status, 200);
});

test("22. certificado ou token nao aparecem em log nem na resposta de emissao", async () => {
  const { auditService, services } = createServices();
  const document = await createReadyDocument(services);
  const response = await request(services, `/v1/finance/nfse/documents/${document.id}/issue`, {
    body: JSON.stringify({}),
    headers: {
      ...authHeaders("token-finance-org-a"),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const bodyText = await response.text();
  assert.equal(bodyText.includes("vault://"), false);
  assert.equal(bodyText.includes("Bearer"), false);
  assert.equal(bodyText.includes("passphrase"), false);
  assert.equal(
    auditService.entries.some((entry) =>
      JSON.stringify(entry.payload).includes("vault://") ||
      JSON.stringify(entry.payload).includes("Bearer"),
    ),
    false,
  );
});

test("23. migration de RLS da fase 1 cobre select, insert, update e delete sem policy aberta", async () => {
  const migration = await readFile(
    new URL("../../../../supabase/migrations/202605250002_phase1_security_rls.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /create policy "tenant select %1\$s"/);
  assert.match(migration, /create policy "tenant insert %1\$s"/);
  assert.match(migration, /create policy "tenant update %1\$s"/);
  assert.match(migration, /create policy "tenant delete %1\$s"/);
  assert.doesNotMatch(migration, /using\s*\(\s*true\s*\)/i);
  assert.doesNotMatch(migration, /with check\s*\(\s*true\s*\)/i);
});

test("24. migration fiscal da fase 2 cria settings, snapshots e eventos sem segredo em claro", async () => {
  const migration = await readFile(
    new URL("../../../../supabase/migrations/202605250003_phase2_fiscal_base.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /create table public\.nfse_fiscal_settings/);
  assert.match(migration, /create table public\.organization_fiscal_profiles/);
  assert.match(migration, /create table public\.client_fiscal_profiles/);
  assert.match(migration, /create table public\.taxable_services/);
  assert.match(migration, /create table public\.service_invoice_events/);
  assert.match(migration, /provider_snapshot jsonb/);
  assert.match(migration, /taker_snapshot jsonb/);
  assert.match(migration, /service_snapshot jsonb/);
  assert.doesNotMatch(migration, /private_key|certificate_password|token_secret/i);
});

test("25. migration fiscal da fase 3 cria rejeicoes, arquivos privados, idempotencia e bloqueio de sobrescrita", async () => {
  const migration = await readFile(
    new URL("../../../../supabase/migrations/202605250004_phase3_nfse_emission.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /create table if not exists public\.nfse_document_rejections/);
  assert.match(migration, /create table if not exists public\.nfse_document_files/);
  assert.match(migration, /create unique index if not exists idx_service_invoices_org_idempotency/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /create policy "tenant select nfse_document_files"/);
  assert.doesNotMatch(migration, /create policy "tenant update nfse_document_files"/);
  assert.doesNotMatch(migration, /certificate_password|private_key|token_secret/i);
});

test("26. adapter nacional bloqueia ambiente de producao antes de qualquer transmissao", async () => {
  const adapter = new NfseNationalAdapter();
  const payload: NfseIssueAdapterInput = {
    certificateReference: "vault://certificates/case-logistica-a1",
    clientProfile: clientProfileDefault,
    credentialReference: "vault://credentials/nfse",
    document: {
      amounts: {
        conditionalDiscountAmount: "0.00",
        deductionAmount: "0.00",
        discountAmount: "0.00",
        serviceAmount: "18450.00",
        taxableAmount: "18450.00",
      },
      competenceDate: "2026-05-01",
      description: draftDefault.description,
      dpsIdentifier: "352050621716670700017500001A100000000000001",
      dpsNumber: "000000000000001",
      intendedIssueDate: "2026-05-25",
      serviceDate: "2026-05-25",
      taxes: draftDefault.taxes,
    },
    documentSeries: "A1",
    documentationReference: "Manual do Emissor Publico API v1.2",
    environment: "production",
    layoutVersion: "manual-api-v1.2-out2025",
    municipalityCode: "3520506",
    providerProfile: providerProfileDefault,
    taxableService: taxableServiceDefault,
  };

  await assert.rejects(adapter.issue(payload), /producao permanece bloqueado/);
});

test("27. documento autorizado torna-se imutavel para edicao direta", async () => {
  const { services } = createServices();
  const document = await createReadyDocument(services);
  await request(services, `/v1/finance/nfse/documents/${document.id}/issue`, {
    body: JSON.stringify({}),
    headers: {
      ...authHeaders("token-finance-org-a"),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const response = await request(services, `/v1/finance/nfse/documents/${document.id}`, {
    body: JSON.stringify({
      description: "Tentativa de alterar documento autorizado",
    }),
    headers: {
      ...authHeaders("token-finance-org-a"),
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });
  const body = (await response.json()) as { message: string };

  assert.equal(response.status, 400);
  assert.match(body.message, /imutaveis/);
});

test("28. sincronizacao de evento remoto de cancelamento preserva historico e marca documento como cancelado", async () => {
  const { services } = createServices();
  const document = await createReadyDocument(services);
  await request(services, `/v1/finance/nfse/documents/${document.id}/issue`, {
    body: JSON.stringify({}),
    headers: {
      ...authHeaders("token-finance-org-a"),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  (services.fiscalService as FakeFiscalService).setLifecycleBehavior(document.id, "cancelled");

  const response = await request(services, `/v1/finance/nfse/documents/${document.id}/sync`, {
    body: JSON.stringify({}),
    headers: {
      ...authHeaders("token-finance-org-a"),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const body = (await response.json()) as NfseIssueDocumentResult;

  assert.equal(response.status, 200);
  assert.equal(body.document.status, "cancelled");
  assert.equal(body.document.transmissionState, "cancelled");
  assert.equal(body.document.cancelEventId !== null, true);
  assert.equal(body.document.latestReconciliation?.status, "attention");
  assert.equal(body.events.some((event) => event.eventType === "document.cancelled"), true);

  const remoteEventsResponse = await request(
    services,
    `/v1/finance/nfse/documents/${document.id}/remote-events`,
    {
      headers: authHeaders("token-finance-org-a"),
    },
  );
  const remoteEventsBody = (await remoteEventsResponse.json()) as { items: NfseDocumentRemoteEventRecord[] };
  assert.equal(remoteEventsResponse.status, 200);
  assert.equal(remoteEventsBody.items.some((item) => item.effect === "cancelled"), true);
});

test("29. conciliacao registra auditoria e expõe status para financeiro e operacao", async () => {
  const { auditService, services } = createServices();
  const document = await createReadyDocument(services);

  const response = await request(services, `/v1/finance/nfse/documents/${document.id}/reconcile`, {
    body: JSON.stringify({}),
    headers: {
      ...authHeaders("token-finance-org-a"),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const body = (await response.json()) as { item: NfseDocumentRecord };

  assert.equal(response.status, 200);
  assert.equal(body.item.latestReconciliation?.status, "attention");
  assert.equal(body.item.latestReconciliation?.issues.some((issue) => issue.code === "missing_charge"), true);
  assert.equal(
    auditService.entries.some((entry) => entry.action === "fiscal.document.reconciled" && entry.entityId === document.id),
    true,
  );
});

test("30. matriz oficial diferencia evento implementado de suportado nao configurado", async () => {
  const { services } = createServices();
  const response = await request(services, "/v1/finance/nfse/event-matrix", {
    headers: authHeaders("token-finance-org-a"),
  });
  const body = (await response.json()) as { items: NfseEventMatrixRecord[] };

  assert.equal(response.status, 200);
  assert.equal(body.items.some((item) => item.key === "query_events" && item.supportStatus === "implemented"), true);
  assert.equal(body.items.some((item) => item.key === "cancel" && item.supportStatus === "supported_not_configured"), true);
  assert.equal(
    body.items.some((item) => item.key === "substitute" && item.supportStatus === "supported_not_configured"),
    true,
  );
});

test("31. migration fiscal da fase 4 cria eventos remotos, conciliacao e estados terminais sem abrir mutacao indevida", async () => {
  const migration = await readFile(
    new URL("../../../../supabase/migrations/202605260005_phase4_nfse_lifecycle.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /create table if not exists public\.nfse_document_remote_events/);
  assert.match(migration, /create table if not exists public\.nfse_document_reconciliations/);
  assert.match(migration, /cancel_requested/);
  assert.match(migration, /cancelled/);
  assert.match(migration, /create policy "tenant select nfse_document_remote_events"/);
  assert.match(migration, /create policy "tenant insert nfse_document_reconciliations"/);
  assert.doesNotMatch(migration, /create policy "tenant delete nfse_document_files"/);
  assert.doesNotMatch(migration, /certificate_password|private_key|token_secret/i);
});
