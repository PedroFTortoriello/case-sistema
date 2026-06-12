import {
  buildNfseDraftReadiness,
  clientFiscalProfileInputSchema,
  nfseDraftInputSchema,
  nfseDraftUpdateSchema,
  providerFiscalProfileInputSchema,
  taxableServiceInputSchema,
  type ClientFiscalProfileInput,
  type NfseDraftInput,
  type NfseDraftUpdateInput,
  type NfseFiscalSettingsInput,
  type ProviderFiscalProfileInput,
  type TaxableServiceInput,
} from "@case-sistema/contracts";
import type { PostgrestResponse, PostgrestSingleResponse, SupabaseClient } from "@supabase/supabase-js";
import { BadRequestError, AppError, ConfigurationError, NotFoundError } from "../../shared/errors/app-error";
import type {
  ClientFiscalProfileRecord,
  FiscalService,
  NfseDocumentDraftRecord,
  NfseDocumentEventRecord,
  NfseDocumentFileDownload,
  NfseDocumentFileRecord,
  NfseDocumentReconciliationRecord,
  NfseDocumentRejectionRecord,
  NfseDocumentRecord,
  NfseDocumentRemoteEventRecord,
  NfseEventMatrixRecord,
  NfseFiscalSettingsRecord,
  NfseIssueDocumentResult,
  ProviderFiscalProfileRecord,
  TaxableServiceRecord,
} from "../../shared/services/container";
import { getSupabaseUserClient } from "../../shared/supabase/user-client";
import {
  buildDpsIdentifier,
  computeNfseFileHash,
  NfseNationalAdapter,
  type NfseIssueAdapterInput,
} from "./nfse-national-adapter";
import { nfseNationalEventMatrix } from "./nfse-event-matrix";
import { assertLifecycleTransition, canEditPreparedDocument } from "./nfse-state-machine";

const INTERNAL_DRAFT_PROVIDER = "nfse_draft_internal";
const PROCESSING_JOB_TYPE = "nfse.status.check";

type DbResponse = PostgrestSingleResponse<unknown> | PostgrestResponse<unknown>;

function normalizeWriteError(response: DbResponse) {
  if (!response.error) {
    return;
  }

  if (response.error.code === "PGRST116") {
    throw new NotFoundError("Registro fiscal solicitado nao foi encontrado.");
  }

  throw new AppError(500, "Falha ao executar a operacao fiscal no banco de dados.", "DATABASE_ERROR");
}

function asMoney(value: string) {
  return Number.parseFloat(value);
}

function normalizeDraftAmounts(input: NfseDraftInput["amounts"]) {
  const serviceAmount = asMoney(input.serviceAmount);
  const discountAmount = asMoney(input.discountAmount);
  const conditionalDiscountAmount = asMoney(input.conditionalDiscountAmount);
  const deductionAmount = asMoney(input.deductionAmount);
  const taxableAmount = Math.max(serviceAmount - discountAmount - conditionalDiscountAmount - deductionAmount, 0);

  return {
    conditionalDiscountAmount,
    deductionAmount,
    discountAmount,
    serviceAmount,
    taxableAmount,
  };
}

function sumRetentions(input: NfseDraftInput["taxes"]) {
  return (
    (input.issRetained ? asMoney(input.issAmount) : 0) +
    asMoney(input.pisAmount) +
    asMoney(input.cofinsAmount) +
    asMoney(input.irrfAmount) +
    asMoney(input.csllAmount) +
    asMoney(input.cppAmount) +
    asMoney(input.inssAmount)
  );
}

function padDpsNumber(value: number | string) {
  return String(value).padStart(15, "0");
}

function parseSnapshot<T>(schema: { parse: (value: unknown) => T }, value: unknown): T | null {
  try {
    return schema.parse(value);
  } catch {
    return null;
  }
}

function createSupabase(accessToken: string) {
  return getSupabaseUserClient(accessToken);
}

function mapFiscalSettings(row: Record<string, unknown>): NfseFiscalSettingsRecord {
  return {
    adapterType: String(row.adapter_type) as NfseFiscalSettingsRecord["adapterType"],
    certificateReference: row.certificate_reference ? String(row.certificate_reference) : null,
    createdAt: String(row.created_at),
    credentialReference: row.credential_reference ? String(row.credential_reference) : null,
    documentationReference: String(row.documentation_reference),
    documentSeries: String(row.document_series),
    environment: row.environment as NfseFiscalSettingsRecord["environment"],
    id: String(row.id),
    isActive: Boolean(row.is_active),
    layoutVersion: String(row.layout_version),
    municipalityCode: String(row.municipality_code),
    municipalityName: String(row.municipality_name),
    nextNumberPreview: String(row.next_number_preview),
    organizationId: String(row.organization_id),
    providerType: String(row.provider_type) as NfseFiscalSettingsRecord["providerType"],
    stateCode: String(row.state_code),
    updatedAt: String(row.updated_at),
    validationStatus: row.validation_status as NfseFiscalSettingsRecord["validationStatus"],
  };
}

function mapProviderProfile(row: Record<string, unknown>): ProviderFiscalProfileRecord {
  return {
    cnaeCode: String(row.cnae_code),
    complement: row.complement ? String(row.complement) : null,
    countryCode: String(row.country_code),
    createdAt: String(row.created_at),
    documentNumber: String(row.document_number),
    email: String(row.email),
    id: String(row.id),
    legalName: String(row.legal_name),
    municipalRegistration: String(row.municipal_registration),
    municipalityCode: String(row.municipality_code),
    municipalityName: String(row.municipality_name),
    neighborhood: String(row.neighborhood),
    number: String(row.number),
    organizationId: String(row.organization_id),
    phone: String(row.phone),
    postalCode: String(row.postal_code),
    simpleNationalOptIn: Boolean(row.simple_national_opt_in),
    stateCode: String(row.state_code),
    street: String(row.street),
    taxIncentiveCode: row.tax_incentive_code ? String(row.tax_incentive_code) : null,
    taxRegime: String(row.tax_regime),
    tradeName: String(row.trade_name),
    updatedAt: String(row.updated_at),
  };
}

function mapClientProfile(row: Record<string, unknown>): ClientFiscalProfileRecord {
  return {
    clientId: String(row.client_id),
    complement: row.complement ? String(row.complement) : null,
    countryCode: String(row.country_code),
    createdAt: String(row.created_at),
    documentNumber: String(row.document_number),
    email: String(row.email),
    id: String(row.id),
    legalName: String(row.legal_name),
    municipalRegistration: row.municipal_registration ? String(row.municipal_registration) : null,
    municipalityCode: row.municipality_code ? String(row.municipality_code) : null,
    municipalityName: String(row.municipality_name),
    neighborhood: row.neighborhood ? String(row.neighborhood) : null,
    number: row.number ? String(row.number) : null,
    organizationId: String(row.organization_id),
    personType: row.person_type as ClientFiscalProfileRecord["personType"],
    phone: String(row.phone),
    postalCode: row.postal_code ? String(row.postal_code) : null,
    stateCode: row.state_code ? String(row.state_code) : null,
    stateRegistration: row.state_registration ? String(row.state_registration) : null,
    street: row.street ? String(row.street) : null,
    tradeName: row.trade_name ? String(row.trade_name) : null,
    updatedAt: String(row.updated_at),
  };
}

function mapTaxableService(row: Record<string, unknown>): TaxableServiceRecord {
  return {
    allowsDeductions: Boolean(row.allows_deductions),
    cnaeCode: row.cnae_code ? String(row.cnae_code) : null,
    code: String(row.code),
    createdAt: String(row.created_at),
    defaultDescription: String(row.default_description),
    description: row.description ? String(row.description) : null,
    id: String(row.id),
    incidenceMunicipalityCode: String(row.incidence_municipality_code),
    incidenceMunicipalityName: String(row.incidence_municipality_name),
    incidenceStateCode: String(row.incidence_state_code),
    isActive: Boolean(row.is_active),
    isIssWithheldByDefault: Boolean(row.is_iss_withheld_by_default),
    issExigibility: String(row.iss_exigibility),
    issRate: Number(row.iss_rate).toFixed(4),
    issRateOrigin: row.iss_rate_origin as TaxableServiceRecord["issRateOrigin"],
    listServiceItem: String(row.list_service_item),
    municipalServiceCode: String(row.municipal_service_code),
    name: String(row.name),
    nationalTaxationCode: String(row.national_taxation_code),
    organizationId: String(row.organization_id),
    taxationNature: String(row.taxation_nature),
    updatedAt: String(row.updated_at),
    version: Number(row.version),
  };
}

function mapEvent(row: Record<string, unknown>): NfseDocumentEventRecord {
  return {
    actorUserId: row.actor_user_id ? String(row.actor_user_id) : null,
    createdAt: String(row.created_at),
    eventType: String(row.event_type),
    id: String(row.id),
    organizationId: String(row.organization_id),
    payload: (row.payload as Record<string, unknown>) ?? {},
    serviceInvoiceId: String(row.service_invoice_id),
    statusFrom: (row.status_from as NfseDocumentEventRecord["statusFrom"]) ?? null,
    statusTo: (row.status_to as NfseDocumentEventRecord["statusTo"]) ?? null,
  };
}

function mapRejection(row: Record<string, unknown>): NfseDocumentRejectionRecord {
  return {
    attempt: Number(row.attempt ?? 1),
    code: String(row.code),
    createdAt: String(row.created_at),
    detail: (row.detail as Record<string, unknown>) ?? {},
    eventId: row.event_id ? String(row.event_id) : null,
    field: row.field ? String(row.field) : null,
    id: String(row.id),
    message: String(row.message),
    organizationId: String(row.organization_id),
    resolutionNote: row.resolution_note ? String(row.resolution_note) : null,
    resolvedAt: row.resolved_at ? String(row.resolved_at) : null,
    resolvedBy: row.resolved_by ? String(row.resolved_by) : null,
    serviceInvoiceId: String(row.service_invoice_id),
  };
}

function mapFile(row: Record<string, unknown>): NfseDocumentFileRecord {
  return {
    byteSize: Number(row.byte_size),
    createdAt: String(row.created_at),
    environment: row.environment as NfseDocumentFileRecord["environment"],
    eventId: row.event_id ? String(row.event_id) : null,
    fileRole: row.file_role as NfseDocumentFileRecord["fileRole"],
    hasBinaryContent: Boolean(row.content_base64),
    hasTextContent: Boolean(row.content_text),
    id: String(row.id),
    isLocked: Boolean(row.is_locked),
    mimeType: String(row.mime_type),
    organizationId: String(row.organization_id),
    serviceInvoiceId: String(row.service_invoice_id),
    sha256Hash: String(row.sha256_hash),
  };
}

function mapRemoteEvent(row: Record<string, unknown>): NfseDocumentRemoteEventRecord {
  return {
    accessKey: String(row.access_key),
    createdAt: String(row.created_at),
    detail: (row.detail as Record<string, unknown>) ?? {},
    effect: row.effect as NfseDocumentRemoteEventRecord["effect"],
    eventName: row.event_name ? String(row.event_name) : null,
    eventSequence: Number(row.event_sequence ?? 1),
    eventTypeCode: row.event_type_code != null ? Number(row.event_type_code) : null,
    fileId: row.file_id ? String(row.file_id) : null,
    id: String(row.id),
    occurredAt: row.occurred_at ? String(row.occurred_at) : null,
    organizationId: String(row.organization_id),
    serviceInvoiceId: String(row.service_invoice_id),
    source: String(row.source),
  };
}

function mapReconciliation(row: Record<string, unknown>): NfseDocumentReconciliationRecord {
  const issues = Array.isArray(row.issues) ? row.issues : [];

  return {
    actorUserId: row.actor_user_id ? String(row.actor_user_id) : null,
    chargeId: row.charge_id ? String(row.charge_id) : null,
    createdAt: String(row.created_at),
    id: String(row.id),
    issues: issues as NfseDocumentReconciliationRecord["issues"],
    organizationId: String(row.organization_id),
    processId: row.process_id ? String(row.process_id) : null,
    serviceInvoiceId: String(row.service_invoice_id),
    snapshot: (row.snapshot as Record<string, unknown>) ?? {},
    status: row.status as NfseDocumentReconciliationRecord["status"],
  };
}

function mapDocument(
  row: Record<string, unknown>,
  extras?: {
    latestRejection?: NfseDocumentRejectionRecord | null;
    latestReconciliation?: NfseDocumentReconciliationRecord | null;
    files?: NfseDocumentFileRecord[];
  },
): NfseDocumentRecord {
  const amounts = parseSnapshot(nfseDraftInputSchema.shape.amounts, row.amounts_snapshot) ?? {
    conditionalDiscountAmount: Number(row.conditional_discount_amount ?? 0).toFixed(2),
    deductionAmount: Number(row.deduction_amount ?? 0).toFixed(2),
    discountAmount: Number(row.discount_amount ?? 0).toFixed(2),
    serviceAmount: Number(row.service_amount ?? row.amount ?? 0).toFixed(2),
  };
  const taxes = parseSnapshot(nfseDraftInputSchema.shape.taxes, row.taxes_snapshot) ?? {
    calculationOrigin: "pending",
    cofinsAmount: "0.00",
    cppAmount: "0.00",
    csllAmount: "0.00",
    inssAmount: "0.00",
    irrfAmount: "0.00",
    issAmount: Number(row.iss_amount ?? 0).toFixed(2),
    issRate: "0.0000",
    issRetained: false,
    pisAmount: "0.00",
  };
  const readinessIssues = Array.isArray(row.readiness_issues) ? row.readiness_issues : [];
  const status = String(row.status) as NfseDocumentRecord["status"];
  const availableFiles = extras?.files?.map((item) => item.fileRole) ?? [];

  return {
    accessKey: row.access_key ? String(row.access_key) : null,
    amounts,
    authorizedAt: row.authorized_at ? String(row.authorized_at) : null,
    availableFiles,
    cancelEventId: row.cancel_event_id ? String(row.cancel_event_id) : null,
    cancelledReasonCode: row.cancelled_reason_code ? String(row.cancelled_reason_code) : null,
    cancelledReasonText: row.cancelled_reason_text ? String(row.cancelled_reason_text) : null,
    chargeId: row.charge_id ? String(row.charge_id) : null,
    clientFiscalProfileId: row.client_fiscal_profile_id ? String(row.client_fiscal_profile_id) : null,
    clientId: String(row.client_id),
    competenceDate: String(row.competence_date),
    createdAt: String(row.created_at),
    currencyCode: "BRL",
    description: String(row.service_description),
    documentationReference: String(row.documentation_reference),
    dpsIdentifier: row.dps_identifier ? String(row.dps_identifier) : null,
    dpsNumber: row.dps_number ? padDpsNumber(String(row.dps_number)) : null,
    fiscalSettingsId: row.fiscal_settings_id ? String(row.fiscal_settings_id) : null,
    id: String(row.id),
    idempotencyKey: row.idempotency_key ? String(row.idempotency_key) : null,
    intendedIssueDate: String(row.intended_issue_date),
    issueRequestedAt: row.transmission_requested_at ? String(row.transmission_requested_at) : null,
    lastSyncedAt: row.last_synced_at ? String(row.last_synced_at) : null,
    latestReconciliation: extras?.latestReconciliation ?? null,
    latestRejection: extras?.latestRejection ?? null,
    lifecycleSyncedAt: row.lifecycle_synced_at ? String(row.lifecycle_synced_at) : null,
    layoutVersion: String(row.layout_version),
    notes: row.external_reference ? String(row.external_reference) : null,
    organizationId: String(row.organization_id),
    pendingStatusCheck: Boolean(row.status_check_required),
    preparedBy: row.prepared_by ? String(row.prepared_by) : null,
    processId: row.process_id ? String(row.process_id) : null,
    providerSnapshot: parseSnapshot(providerFiscalProfileInputSchema, row.provider_snapshot),
    readyForIssueAt: row.ready_for_issue_at ? String(row.ready_for_issue_at) : null,
    readiness: {
      issues: readinessIssues as NfseDocumentRecord["readiness"]["issues"],
      isReady: status === "ready_for_issue" && readinessIssues.length === 0,
      status: status === "ready_for_issue" ? "ready_for_issue" : "draft",
    },
    serviceDate: String(row.service_date),
    serviceSnapshot: parseSnapshot(taxableServiceInputSchema, row.service_snapshot),
    status,
    takerSnapshot: parseSnapshot(clientFiscalProfileInputSchema, row.taker_snapshot),
    taxes,
    taxableServiceId: row.taxable_service_id ? String(row.taxable_service_id) : null,
    transmissionState: String(row.transmission_state ?? "idle") as NfseDocumentRecord["transmissionState"],
    updatedAt: String(row.updated_at),
    validationStatus: row.validation_status as NfseDocumentRecord["validationStatus"],
    verificationCode: row.verification_code ? String(row.verification_code) : null,
  };
}

function buildServiceVersionSnapshot(record: TaxableServiceRecord, actorUserId: string) {
  return {
    actorUserId,
    snapshotAt: new Date().toISOString(),
    taxableService: record,
  };
}

async function fetchSettings(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<NfseFiscalSettingsRecord | null> {
  const response = await supabase
    .from("nfse_fiscal_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  normalizeWriteError(response);
  return response.data ? mapFiscalSettings(response.data) : null;
}

async function fetchProviderProfile(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<ProviderFiscalProfileRecord | null> {
  const response = await supabase
    .from("organization_fiscal_profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  normalizeWriteError(response);
  return response.data ? mapProviderProfile(response.data) : null;
}

async function fetchClientProfile(
  supabase: SupabaseClient,
  organizationId: string,
  clientId: string,
): Promise<ClientFiscalProfileRecord | null> {
  const response = await supabase
    .from("client_fiscal_profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("client_id", clientId)
    .maybeSingle();

  normalizeWriteError(response);
  return response.data ? mapClientProfile(response.data) : null;
}

async function fetchTaxableService(
  supabase: SupabaseClient,
  organizationId: string,
  serviceId: string,
): Promise<TaxableServiceRecord | null> {
  const response = await supabase
    .from("taxable_services")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", serviceId)
    .maybeSingle();

  normalizeWriteError(response);
  return response.data ? mapTaxableService(response.data) : null;
}

async function fetchDocumentRow(
  supabase: SupabaseClient,
  organizationId: string,
  documentId: string,
) {
  const response = await supabase
    .from("service_invoices")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", documentId)
    .single();

  normalizeWriteError(response);
  return response.data as Record<string, unknown>;
}

async function fetchDocumentRejections(
  supabase: SupabaseClient,
  organizationId: string,
  documentId: string,
) {
  const response = await supabase
    .from("nfse_document_rejections")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("service_invoice_id", documentId)
    .order("created_at", { ascending: false });

  normalizeWriteError(response);
  return (response.data ?? []).map((item) => mapRejection(item));
}

async function fetchDocumentRemoteEvents(
  supabase: SupabaseClient,
  organizationId: string,
  documentId: string,
) {
  const response = await supabase
    .from("nfse_document_remote_events")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("service_invoice_id", documentId)
    .order("created_at", { ascending: false });

  normalizeWriteError(response);
  return (response.data ?? []).map((item) => mapRemoteEvent(item));
}

async function fetchLatestReconciliation(
  supabase: SupabaseClient,
  organizationId: string,
  documentId: string,
) {
  const response = await supabase
    .from("nfse_document_reconciliations")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("service_invoice_id", documentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  normalizeWriteError(response);
  return response.data ? mapReconciliation(response.data) : null;
}

async function fetchDocumentFiles(
  supabase: SupabaseClient,
  organizationId: string,
  documentId: string,
) {
  const response = await supabase
    .from("nfse_document_files")
    .select("id, organization_id, service_invoice_id, event_id, file_role, environment, mime_type, sha256_hash, byte_size, content_text, content_base64, is_locked, created_at")
    .eq("organization_id", organizationId)
    .eq("service_invoice_id", documentId)
    .order("created_at", { ascending: false });

  normalizeWriteError(response);
  return (response.data ?? []).map((item) => mapFile(item));
}

async function fetchDocumentEvents(
  supabase: SupabaseClient,
  organizationId: string,
  documentId: string,
) {
  const response = await supabase
    .from("service_invoice_events")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("service_invoice_id", documentId)
    .order("created_at", { ascending: false });

  normalizeWriteError(response);
  return (response.data ?? []).map((item) => mapEvent(item));
}

async function hydrateDocument(
  supabase: SupabaseClient,
  organizationId: string,
  row: Record<string, unknown>,
): Promise<NfseDocumentRecord> {
  const [files, rejections, latestReconciliation] = await Promise.all([
    fetchDocumentFiles(supabase, organizationId, String(row.id)),
    fetchDocumentRejections(supabase, organizationId, String(row.id)),
    fetchLatestReconciliation(supabase, organizationId, String(row.id)),
  ]);

  return mapDocument(row, {
    files,
    latestReconciliation,
    latestRejection: rejections[0] ?? null,
  });
}

async function appendEvent(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    serviceInvoiceId: string;
    actorUserId: string | null;
    eventType: string;
    statusFrom: NfseDocumentEventRecord["statusFrom"];
    statusTo: NfseDocumentEventRecord["statusTo"];
    payload?: Record<string, unknown>;
  },
) {
  const response = await supabase
    .from("service_invoice_events")
    .insert({
      actor_user_id: params.actorUserId,
      event_type: params.eventType,
      organization_id: params.organizationId,
      payload: params.payload ?? {},
      service_invoice_id: params.serviceInvoiceId,
      status_from: params.statusFrom,
      status_to: params.statusTo,
    })
    .select("*")
    .single();

  normalizeWriteError(response);
  return mapEvent(response.data);
}

async function appendRejection(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    serviceInvoiceId: string;
    eventId: string | null;
    attempt: number;
    code: string;
    message: string;
    field: string | null;
    detail?: Record<string, unknown>;
  },
) {
  const response = await supabase
    .from("nfse_document_rejections")
    .insert({
      attempt: params.attempt,
      code: params.code,
      detail: params.detail ?? {},
      event_id: params.eventId,
      field: params.field,
      message: params.message,
      organization_id: params.organizationId,
      service_invoice_id: params.serviceInvoiceId,
    })
    .select("*")
    .single();

  normalizeWriteError(response);
  return mapRejection(response.data);
}

async function storeFile(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    serviceInvoiceId: string;
    eventId: string | null;
    fileRole: NfseDocumentFileRecord["fileRole"];
    environment: NfseDocumentFileRecord["environment"];
    mimeType: string;
    contentText?: string;
    contentBase64?: string;
    isLocked?: boolean;
  },
) {
  const byteSize = params.contentText
    ? Buffer.byteLength(params.contentText, "utf8")
    : Buffer.from(params.contentBase64 ?? "", "base64").byteLength;
  const hash = computeNfseFileHash(
    params.contentText ? params.contentText : Buffer.from(params.contentBase64 ?? "", "base64"),
  );
  const response = await supabase
    .from("nfse_document_files")
    .insert({
      byte_size: byteSize,
      content_base64: params.contentBase64 ?? null,
      content_text: params.contentText ?? null,
      environment: params.environment,
      event_id: params.eventId,
      file_role: params.fileRole,
      is_locked: params.isLocked ?? false,
      mime_type: params.mimeType,
      organization_id: params.organizationId,
      service_invoice_id: params.serviceInvoiceId,
      sha256_hash: hash,
    })
    .select("id, organization_id, service_invoice_id, event_id, file_role, environment, mime_type, sha256_hash, byte_size, content_text, content_base64, is_locked, created_at")
    .single();

  normalizeWriteError(response);
  if (!response.data) {
    throw new AppError(500, "Falha ao persistir o arquivo fiscal.", "DATABASE_ERROR");
  }

  return mapFile(response.data);
}

async function storeFileIfMissing(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    serviceInvoiceId: string;
    eventId: string | null;
    fileRole: NfseDocumentFileRecord["fileRole"];
    environment: NfseDocumentFileRecord["environment"];
    mimeType: string;
    contentText?: string;
    contentBase64?: string;
    isLocked?: boolean;
  },
) {
  const hash = computeNfseFileHash(
    params.contentText ? params.contentText : Buffer.from(params.contentBase64 ?? "", "base64"),
  );
  const response = await supabase
    .from("nfse_document_files")
    .select("id, organization_id, service_invoice_id, event_id, file_role, environment, mime_type, sha256_hash, byte_size, content_text, content_base64, is_locked, created_at")
    .eq("organization_id", params.organizationId)
    .eq("service_invoice_id", params.serviceInvoiceId)
    .eq("file_role", params.fileRole)
    .eq("sha256_hash", hash)
    .maybeSingle();

  normalizeWriteError(response);

  if (response.data) {
    return mapFile(response.data);
  }

  return storeFile(supabase, params);
}

async function upsertRemoteEvent(
  supabase: SupabaseClient,
  params: {
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
  },
) {
  let query = supabase
    .from("nfse_document_remote_events")
    .select("*")
    .eq("organization_id", params.organizationId)
    .eq("service_invoice_id", params.serviceInvoiceId)
    .eq("event_sequence", params.eventSequence);

  query =
    params.eventTypeCode == null ? query.is("event_type_code", null) : query.eq("event_type_code", params.eventTypeCode);

  const currentResponse = await query.maybeSingle();
  normalizeWriteError(currentResponse);

  if (currentResponse.data) {
    const updateResponse = await supabase
      .from("nfse_document_remote_events")
      .update({
        access_key: params.accessKey,
        detail: params.detail,
        effect: params.effect,
        event_name: params.eventName,
        file_id: params.fileId,
        occurred_at: params.occurredAt,
        source: params.source,
      })
      .eq("id", currentResponse.data.id)
      .select("*")
      .single();

    normalizeWriteError(updateResponse);
    return mapRemoteEvent(updateResponse.data);
  }

  const insertResponse = await supabase
    .from("nfse_document_remote_events")
    .insert({
      access_key: params.accessKey,
      detail: params.detail,
      effect: params.effect,
      event_name: params.eventName,
      event_sequence: params.eventSequence,
      event_type_code: params.eventTypeCode,
      file_id: params.fileId,
      occurred_at: params.occurredAt,
      organization_id: params.organizationId,
      service_invoice_id: params.serviceInvoiceId,
      source: params.source,
    })
    .select("*")
    .single();

  normalizeWriteError(insertResponse);
  return mapRemoteEvent(insertResponse.data);
}

async function appendReconciliation(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    serviceInvoiceId: string;
    actorUserId: string | null;
    chargeId: string | null;
    processId: string | null;
    status: NfseDocumentReconciliationRecord["status"];
    issues: NfseDocumentReconciliationRecord["issues"];
    snapshot: Record<string, unknown>;
  },
) {
  const response = await supabase
    .from("nfse_document_reconciliations")
    .insert({
      actor_user_id: params.actorUserId,
      charge_id: params.chargeId,
      issues: params.issues,
      organization_id: params.organizationId,
      process_id: params.processId,
      service_invoice_id: params.serviceInvoiceId,
      snapshot: params.snapshot,
      status: params.status,
    })
    .select("*")
    .single();

  normalizeWriteError(response);
  return mapReconciliation(response.data);
}

async function updateDocumentState(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    documentId: string;
    values: Record<string, unknown>;
  },
) {
  const response = await supabase
    .from("service_invoices")
    .update(params.values)
    .eq("organization_id", params.organizationId)
    .eq("id", params.documentId)
    .select("*")
    .single();

  normalizeWriteError(response);
  return response.data as Record<string, unknown>;
}

async function reserveNextDpsNumber(supabase: SupabaseClient, settingsId: string) {
  const response = await supabase.rpc("reserve_nfse_sequence", {
    target_setting: settingsId,
  });

  normalizeWriteError(response);

  if (typeof response.data !== "number") {
    throw new ConfigurationError("Falha ao reservar a numeracao sequencial de DPS.");
  }

  return response.data;
}

async function scheduleStatusCheck(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    documentId: string;
    availableAt?: string;
    attempt?: number;
  },
) {
  const response = await supabase.from("async_jobs").insert({
    attempts: params.attempt ?? 0,
    available_at: params.availableAt ?? new Date().toISOString(),
    job_type: PROCESSING_JOB_TYPE,
    organization_id: params.organizationId,
    payload: {
      documentId: params.documentId,
    },
    status: "pending",
  });

  normalizeWriteError(response);
}

function buildIssuePayload(input: {
  settings: NfseFiscalSettingsRecord;
  document: NfseDocumentRecord;
  providerProfile: ProviderFiscalProfileInput;
  clientProfile: ClientFiscalProfileInput;
  taxableService: TaxableServiceInput;
  dpsNumber: string;
  dpsIdentifier: string;
}): NfseIssueAdapterInput {
  const amounts = normalizeDraftAmounts(input.document.amounts);

  return {
    certificateReference: input.settings.certificateReference ?? "",
    clientProfile: input.clientProfile,
    credentialReference: input.settings.credentialReference ?? null,
    document: {
      amounts: {
        conditionalDiscountAmount: input.document.amounts.conditionalDiscountAmount,
        deductionAmount: input.document.amounts.deductionAmount,
        discountAmount: input.document.amounts.discountAmount,
        serviceAmount: input.document.amounts.serviceAmount,
        taxableAmount: amounts.taxableAmount.toFixed(2),
      },
      competenceDate: input.document.competenceDate,
      description: input.document.description,
      dpsIdentifier: input.dpsIdentifier,
      dpsNumber: input.dpsNumber,
      intendedIssueDate: input.document.intendedIssueDate,
      serviceDate: input.document.serviceDate,
      taxes: input.document.taxes,
    },
    documentSeries: input.settings.documentSeries,
    documentationReference: input.document.documentationReference,
    environment: input.settings.environment,
    layoutVersion: input.document.layoutVersion,
    municipalityCode: input.settings.municipalityCode,
    providerProfile: input.providerProfile,
    taxableService: input.taxableService,
  };
}

async function ensureIssueReady(
  supabase: SupabaseClient,
  organizationId: string,
  document: NfseDocumentRecord,
) {
  const settings = await fetchSettings(supabase, organizationId);

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

  if (document.pendingStatusCheck || document.transmissionState === "processing" || document.transmissionState === "timeout_pending_query") {
    throw new BadRequestError("Existe transmissao anterior pendente de consulta; sincronize o status antes de reenviar.");
  }

  if (document.status !== "ready_for_issue" && document.status !== "failed") {
    throw new BadRequestError("Somente documentos prontos ou corrigidos podem ser transmitidos.");
  }

  return settings;
}

async function buildReconciliationSnapshot(
  supabase: SupabaseClient,
  organizationId: string,
  document: NfseDocumentRecord,
) {
  const [chargeResponse, processResponse, paymentResponse] = await Promise.all([
    document.chargeId
      ? supabase
          .from("charges")
          .select("id, status, gross_amount, net_amount, due_date, paid_at, installments")
          .eq("organization_id", organizationId)
          .eq("id", document.chargeId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as DbResponse),
    document.processId
      ? supabase
          .from("processes")
          .select("id, code, status, direction, shipment_mode")
          .eq("organization_id", organizationId)
          .eq("id", document.processId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as DbResponse),
    document.chargeId
      ? supabase
          .from("payment_events")
          .select("id, event_type, amount, happened_at")
          .eq("organization_id", organizationId)
          .eq("charge_id", document.chargeId)
          .order("happened_at", { ascending: false })
      : Promise.resolve({ data: [], error: null } as DbResponse),
  ]);

  normalizeWriteError(chargeResponse);
  normalizeWriteError(processResponse);
  normalizeWriteError(paymentResponse);

  const chargeRow = chargeResponse.data as Record<string, unknown> | null;
  const processRow = processResponse.data as Record<string, unknown> | null;
  const paymentRows = (paymentResponse.data as Record<string, unknown>[] | null) ?? [];
  const totalPaid = paymentRows.reduce((accumulator, item) => accumulator + Number(item.amount ?? 0), 0);
  const issues: NfseDocumentReconciliationRecord["issues"] = [];

  if (document.status === "authorized" && !chargeRow) {
    issues.push({
      code: "authorized_without_charge",
      message: "Documento autorizado ainda nao possui cobranca vinculada para conciliacao.",
      severity: "attention",
    });
  }

  if (document.status === "cancelled" && chargeRow && String(chargeRow.status) !== "cancelled") {
    issues.push({
      code: "cancelled_nfse_with_active_charge",
      message: "A NFS-e esta cancelada, mas a cobranca vinculada ainda nao foi cancelada.",
      severity: "divergent",
    });
  }

  if (document.status !== "authorized" && document.status !== "cancelled" && totalPaid > 0) {
    issues.push({
      code: "payment_before_fiscal_resolution",
      message: "Ha pagamentos registrados antes da resolucao fiscal definitiva do documento.",
      severity: "attention",
    });
  }

  if (document.status === "cancelled" && totalPaid > 0) {
    issues.push({
      code: "cancelled_nfse_with_payment",
      message: "A NFS-e esta cancelada, mas existem pagamentos registrados que exigem tratamento financeiro.",
      severity: "divergent",
    });
  }

  if (document.status === "authorized" && chargeRow && String(chargeRow.status) === "cancelled") {
    issues.push({
      code: "authorized_nfse_with_cancelled_charge",
      message: "A NFS-e esta autorizada, mas a cobranca vinculada foi cancelada.",
      severity: "divergent",
    });
  }

  const status: NfseDocumentReconciliationRecord["status"] =
    issues.some((issue) => issue.severity === "divergent")
      ? "divergent"
      : issues.length > 0
        ? "attention"
        : chargeRow || processRow
          ? "aligned"
          : "pending";

  return {
    chargeId: chargeRow ? String(chargeRow.id) : document.chargeId,
    issues,
    processId: processRow ? String(processRow.id) : document.processId,
    snapshot: {
      charge: chargeRow
        ? {
            dueDate: chargeRow.due_date ?? null,
            grossAmount: chargeRow.gross_amount ?? null,
            installments: chargeRow.installments ?? null,
            netAmount: chargeRow.net_amount ?? null,
            paidAt: chargeRow.paid_at ?? null,
            status: chargeRow.status ?? null,
          }
        : null,
      document: {
        accessKey: document.accessKey,
        status: document.status,
        transmissionState: document.transmissionState,
      },
      payments: {
        eventCount: paymentRows.length,
        lastEventAt: paymentRows[0]?.happened_at ?? null,
        totalPaid: totalPaid.toFixed(2),
      },
      process: processRow
        ? {
            code: processRow.code ?? null,
            direction: processRow.direction ?? null,
            shipmentMode: processRow.shipment_mode ?? null,
            status: processRow.status ?? null,
          }
        : null,
    },
    status,
  };
}

export class SupabaseFiscalService implements FiscalService {
  constructor(private readonly adapter = new NfseNationalAdapter()) {}

  async getFiscalSettings({
    accessToken,
    organizationId,
  }: {
    accessToken: string;
    organizationId: string;
  }) {
    return fetchSettings(createSupabase(accessToken), organizationId);
  }

  async saveFiscalSettings({
    accessToken,
    organizationId,
    payload,
  }: {
    accessToken: string;
    organizationId: string;
    payload: NfseFiscalSettingsInput;
  }) {
    const supabase = createSupabase(accessToken);
    const response = await supabase
      .from("nfse_fiscal_settings")
      .upsert(
        {
          adapter_type: payload.adapterType,
          certificate_reference: payload.certificateReference ?? null,
          credential_reference: payload.credentialReference ?? null,
          document_series: payload.documentSeries,
          documentation_reference: payload.documentationReference,
          environment: payload.environment,
          is_active: payload.isActive,
          layout_version: payload.layoutVersion,
          municipality_code: payload.municipalityCode,
          municipality_name: payload.municipalityName,
          next_number_preview: payload.nextNumberPreview,
          next_number_value: Number.parseInt(payload.nextNumberPreview, 10) || 1,
          organization_id: organizationId,
          provider_type: payload.providerType,
          state_code: payload.stateCode,
          validation_status: payload.validationStatus,
        },
        { onConflict: "organization_id" },
      )
      .select("*")
      .single();

    normalizeWriteError(response);
    return mapFiscalSettings(response.data);
  }

  async getProviderProfile({
    accessToken,
    organizationId,
  }: {
    accessToken: string;
    organizationId: string;
  }) {
    return fetchProviderProfile(createSupabase(accessToken), organizationId);
  }

  async saveProviderProfile({
    accessToken,
    organizationId,
    payload,
  }: {
    accessToken: string;
    organizationId: string;
    payload: ProviderFiscalProfileInput;
  }) {
    const supabase = createSupabase(accessToken);
    const response = await supabase
      .from("organization_fiscal_profiles")
      .upsert(
        {
          cnae_code: payload.cnaeCode,
          complement: payload.complement ?? null,
          country_code: payload.countryCode,
          document_number: payload.documentNumber,
          email: payload.email,
          legal_name: payload.legalName,
          municipal_registration: payload.municipalRegistration,
          municipality_code: payload.municipalityCode,
          municipality_name: payload.municipalityName,
          neighborhood: payload.neighborhood,
          number: payload.number,
          organization_id: organizationId,
          phone: payload.phone,
          postal_code: payload.postalCode,
          simple_national_opt_in: payload.simpleNationalOptIn,
          state_code: payload.stateCode,
          street: payload.street,
          tax_incentive_code: payload.taxIncentiveCode ?? null,
          tax_regime: payload.taxRegime,
          trade_name: payload.tradeName,
        },
        { onConflict: "organization_id" },
      )
      .select("*")
      .single();

    normalizeWriteError(response);
    return mapProviderProfile(response.data);
  }

  async getClientFiscalProfile({
    accessToken,
    organizationId,
    clientId,
  }: {
    accessToken: string;
    organizationId: string;
    clientId: string;
  }) {
    return fetchClientProfile(createSupabase(accessToken), organizationId, clientId);
  }

  async saveClientFiscalProfile({
    accessToken,
    organizationId,
    clientId,
    payload,
  }: {
    accessToken: string;
    organizationId: string;
    clientId: string;
    payload: ClientFiscalProfileInput;
  }) {
    const supabase = createSupabase(accessToken);
    const response = await supabase
      .from("client_fiscal_profiles")
      .upsert(
        {
          client_id: clientId,
          complement: payload.complement ?? null,
          country_code: payload.countryCode,
          document_number: payload.documentNumber,
          email: payload.email,
          legal_name: payload.legalName,
          municipal_registration: payload.municipalRegistration ?? null,
          municipality_code: payload.municipalityCode ?? null,
          municipality_name: payload.municipalityName,
          neighborhood: payload.neighborhood ?? null,
          number: payload.number ?? null,
          organization_id: organizationId,
          person_type: payload.personType,
          phone: payload.phone,
          postal_code: payload.postalCode ?? null,
          state_code: payload.stateCode ?? null,
          state_registration: payload.stateRegistration ?? null,
          street: payload.street ?? null,
          trade_name: payload.tradeName ?? null,
        },
        { onConflict: "client_id" },
      )
      .select("*")
      .single();

    normalizeWriteError(response);
    return mapClientProfile(response.data);
  }

  async listTaxableServices({
    accessToken,
    organizationId,
  }: {
    accessToken: string;
    organizationId: string;
  }) {
    const supabase = createSupabase(accessToken);
    const response = await supabase
      .from("taxable_services")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true });

    normalizeWriteError(response);
    return (response.data ?? []).map((row) => mapTaxableService(row));
  }

  async saveTaxableService({
    accessToken,
    organizationId,
    actorUserId,
    serviceId,
    payload,
  }: {
    accessToken: string;
    organizationId: string;
    actorUserId: string;
    serviceId?: string;
    payload: TaxableServiceInput;
  }) {
    const supabase = createSupabase(accessToken);
    const existing = serviceId ? await fetchTaxableService(supabase, organizationId, serviceId) : null;
    const nextVersion = existing ? existing.version + 1 : 1;

    const response = existing
      ? await supabase
          .from("taxable_services")
          .update({
            allows_deductions: payload.allowsDeductions,
            cnae_code: payload.cnaeCode ?? null,
            code: payload.code,
            default_description: payload.defaultDescription,
            description: payload.description ?? null,
            incidence_municipality_code: payload.incidenceMunicipalityCode,
            incidence_municipality_name: payload.incidenceMunicipalityName,
            incidence_state_code: payload.incidenceStateCode,
            is_active: payload.isActive,
            is_iss_withheld_by_default: payload.isIssWithheldByDefault,
            iss_exigibility: payload.issExigibility,
            iss_rate: payload.issRate,
            iss_rate_origin: payload.issRateOrigin,
            list_service_item: payload.listServiceItem,
            municipal_service_code: payload.municipalServiceCode,
            name: payload.name,
            national_taxation_code: payload.nationalTaxationCode,
            taxation_nature: payload.taxationNature,
            version: nextVersion,
          })
          .eq("organization_id", organizationId)
          .eq("id", serviceId)
          .select("*")
          .single()
      : await supabase
          .from("taxable_services")
          .insert({
            allows_deductions: payload.allowsDeductions,
            cnae_code: payload.cnaeCode ?? null,
            code: payload.code,
            default_description: payload.defaultDescription,
            description: payload.description ?? null,
            incidence_municipality_code: payload.incidenceMunicipalityCode,
            incidence_municipality_name: payload.incidenceMunicipalityName,
            incidence_state_code: payload.incidenceStateCode,
            is_active: payload.isActive,
            is_iss_withheld_by_default: payload.isIssWithheldByDefault,
            iss_exigibility: payload.issExigibility,
            iss_rate: payload.issRate,
            iss_rate_origin: payload.issRateOrigin,
            list_service_item: payload.listServiceItem,
            municipal_service_code: payload.municipalServiceCode,
            name: payload.name,
            national_taxation_code: payload.nationalTaxationCode,
            organization_id: organizationId,
            taxation_nature: payload.taxationNature,
            version: nextVersion,
          })
          .select("*")
          .single();

    normalizeWriteError(response);

    const record = mapTaxableService(response.data);
    const versionResponse = await supabase.from("taxable_service_versions").insert({
      created_by: actorUserId,
      organization_id: organizationId,
      snapshot: buildServiceVersionSnapshot(record, actorUserId),
      taxable_service_id: record.id,
      version: record.version,
    });

    normalizeWriteError(versionResponse);
    return record;
  }

  async listDocuments({
    accessToken,
    organizationId,
  }: {
    accessToken: string;
    organizationId: string;
  }) {
    const supabase = createSupabase(accessToken);
    const response = await supabase
      .from("service_invoices")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    normalizeWriteError(response);
    return Promise.all((response.data ?? []).map((row) => hydrateDocument(supabase, organizationId, row)));
  }

  async getDocument({
    accessToken,
    organizationId,
    documentId,
  }: {
    accessToken: string;
    organizationId: string;
    documentId: string;
  }) {
    const supabase = createSupabase(accessToken);
    const row = await fetchDocumentRow(supabase, organizationId, documentId);
    return hydrateDocument(supabase, organizationId, row);
  }

  async createDraftDocument({
    accessToken,
    organizationId,
    actorUserId,
    payload,
  }: {
    accessToken: string;
    organizationId: string;
    actorUserId: string;
    payload: NfseDraftInput;
  }) {
    const supabase = createSupabase(accessToken);
    const [settings, providerProfile, clientProfile, taxableService] = await Promise.all([
      fetchSettings(supabase, organizationId),
      fetchProviderProfile(supabase, organizationId),
      fetchClientProfile(supabase, organizationId, payload.clientId),
      fetchTaxableService(supabase, organizationId, payload.taxableServiceId),
    ]);
    const readiness = buildNfseDraftReadiness({
      clientProfile,
      draft: payload,
      providerProfile,
      settings,
      taxableService,
    });
    const amounts = normalizeDraftAmounts(payload.amounts);
    const validationStatus = readiness.isReady ? "valid" : "invalid";
    const response = await supabase
      .from("service_invoices")
      .insert({
        access_key: null,
        amount: amounts.serviceAmount,
        amounts_snapshot: payload.amounts,
        authorized_at: null,
        charge_id: payload.chargeId ?? null,
        client_fiscal_profile_id: clientProfile?.id ?? null,
        client_id: payload.clientId,
        competence_date: payload.competenceDate,
        conditional_discount_amount: amounts.conditionalDiscountAmount,
        cost_center_id: null,
        currency_code: payload.currencyCode,
        deduction_amount: amounts.deductionAmount,
        discount_amount: amounts.discountAmount,
        documentation_reference: settings?.documentationReference ?? "pending-documentation-reference",
        dps_identifier: null,
        dps_number: null,
        external_reference: payload.notes ?? null,
        fiscal_settings_id: settings?.id ?? null,
        idempotency_key: null,
        integration_protocol: null,
        iss_amount: asMoney(payload.taxes.issAmount),
        issue_attempts: 0,
        issued_at: null,
        last_synced_at: null,
        layout_version: settings?.layoutVersion ?? "pending-layout-version",
        pdf_path: null,
        pdf_storage_path: null,
        prepared_by: actorUserId,
        process_id: payload.processId ?? null,
        provider: INTERNAL_DRAFT_PROVIDER,
        provider_snapshot: providerProfile ?? {},
        readiness_issues: readiness.issues,
        ready_for_issue_at: readiness.isReady ? new Date().toISOString() : null,
        retained_amount: sumRetentions(payload.taxes),
        service_amount: amounts.serviceAmount,
        service_code: taxableService?.code ?? "pending-service-code",
        service_date: payload.serviceDate,
        service_description: payload.description,
        service_snapshot: taxableService ?? {},
        status: readiness.status,
        status_check_required: false,
        taker_snapshot: clientProfile ?? {},
        taxable_amount: amounts.taxableAmount,
        taxable_service_id: taxableService?.id ?? null,
        taxes: payload.taxes,
        taxes_snapshot: payload.taxes,
        intended_issue_date: payload.intendedIssueDate,
        transmission_requested_at: null,
        transmission_state: "idle",
        validation_status: validationStatus,
        verification_code: null,
        xml_path: null,
        xml_storage_path: null,
        organization_id: organizationId,
      })
      .select("*")
      .single();

    normalizeWriteError(response);

    await appendEvent(supabase, {
      actorUserId,
      eventType: "draft.created",
      organizationId,
      payload: { readiness },
      serviceInvoiceId: String(response.data.id),
      statusFrom: null,
      statusTo: readiness.status,
    });

    return hydrateDocument(supabase, organizationId, response.data);
  }

  async updateDraftDocument({
    accessToken,
    organizationId,
    actorUserId,
    documentId,
    payload,
  }: {
    accessToken: string;
    organizationId: string;
    actorUserId: string;
    documentId: string;
    payload: NfseDraftUpdateInput;
  }) {
    const supabase = createSupabase(accessToken);
    const currentRow = await fetchDocumentRow(supabase, organizationId, documentId);
    const current = mapDocument(currentRow);

    if (
      !canEditPreparedDocument({
        pendingStatusCheck: current.pendingStatusCheck,
        status: current.status,
        transmissionState: current.transmissionState,
      })
    ) {
      throw new BadRequestError("Documento fiscal imutavel ou com processamento pendente nao pode ser alterado.");
    }

    const liveSettings = await fetchSettings(supabase, organizationId);
    const liveProvider = await fetchProviderProfile(supabase, organizationId);
    const liveClient = current.clientId
      ? await fetchClientProfile(supabase, organizationId, current.clientId)
      : null;
    const liveService = current.taxableServiceId
      ? await fetchTaxableService(supabase, organizationId, current.taxableServiceId)
      : null;

    const mergedDraftInput = nfseDraftInputSchema.parse({
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
      taxableServiceId: current.taxableServiceId ?? "pending-taxable-service",
      taxes: payload.taxes ?? current.taxes,
    });

    const readiness = buildNfseDraftReadiness({
      clientProfile: liveClient ?? current.takerSnapshot,
      draft: mergedDraftInput,
      providerProfile: liveProvider ?? current.providerSnapshot,
      settings: liveSettings,
      taxableService: liveService ?? current.serviceSnapshot,
    });
    const amounts = normalizeDraftAmounts(mergedDraftInput.amounts);
    const validationStatus = readiness.isReady ? "valid" : "invalid";
    const updatedRow = await updateDocumentState(supabase, {
      documentId,
      organizationId,
      values: {
        amount: amounts.serviceAmount,
        amounts_snapshot: mergedDraftInput.amounts,
        charge_id: mergedDraftInput.chargeId ?? null,
        client_fiscal_profile_id: liveClient?.id ?? current.clientFiscalProfileId,
        competence_date: mergedDraftInput.competenceDate,
        conditional_discount_amount: amounts.conditionalDiscountAmount,
        deduction_amount: amounts.deductionAmount,
        discount_amount: amounts.discountAmount,
        external_reference: mergedDraftInput.notes ?? null,
        fiscal_settings_id: liveSettings?.id ?? current.fiscalSettingsId,
        iss_amount: asMoney(mergedDraftInput.taxes.issAmount),
        provider_snapshot: liveProvider ?? current.providerSnapshot ?? {},
        ready_for_issue_at: readiness.isReady ? new Date().toISOString() : null,
        readiness_issues: readiness.issues,
        retained_amount: sumRetentions(mergedDraftInput.taxes),
        service_amount: amounts.serviceAmount,
        service_date: mergedDraftInput.serviceDate,
        service_description: mergedDraftInput.description,
        service_snapshot: liveService ?? current.serviceSnapshot ?? {},
        status: readiness.isReady ? "ready_for_issue" : "draft",
        status_check_required: false,
        taker_snapshot: liveClient ?? current.takerSnapshot ?? {},
        taxable_amount: amounts.taxableAmount,
        taxes: mergedDraftInput.taxes,
        taxes_snapshot: mergedDraftInput.taxes,
        intended_issue_date: mergedDraftInput.intendedIssueDate,
        transmission_state: readiness.isReady ? "idle" : "idle",
        validation_status: validationStatus,
      },
    });

    await appendEvent(supabase, {
      actorUserId,
      eventType: "draft.updated",
      organizationId,
      payload: {
        readiness,
        snapshotsRefreshed: Boolean(liveProvider || liveClient || liveService),
      },
      serviceInvoiceId: documentId,
      statusFrom: current.status,
      statusTo: readiness.isReady ? "ready_for_issue" : "draft",
    });

    return hydrateDocument(supabase, organizationId, updatedRow);
  }

  async issueDocument({
    accessToken,
    organizationId,
    actorUserId,
    documentId,
  }: {
    accessToken: string;
    organizationId: string;
    actorUserId: string;
    documentId: string;
  }) {
    const supabase = createSupabase(accessToken);
    const currentRow = await fetchDocumentRow(supabase, organizationId, documentId);
    const current = await hydrateDocument(supabase, organizationId, currentRow);
    const settings = await ensureIssueReady(supabase, organizationId, current);
    const providerSnapshot = current.providerSnapshot;
    const clientSnapshot = current.takerSnapshot;
    const serviceSnapshot = current.serviceSnapshot;

    if (!providerSnapshot || !clientSnapshot || !serviceSnapshot) {
      throw new BadRequestError("O documento nao possui snapshots fiscais suficientes para emissao.");
    }

    const reservedNumber = current.dpsNumber
      ? Number.parseInt(current.dpsNumber, 10)
      : await reserveNextDpsNumber(supabase, settings.id);
    const dpsNumber = padDpsNumber(reservedNumber);
    const dpsIdentifier =
      current.dpsIdentifier ??
      buildDpsIdentifier({
        documentSeries: settings.documentSeries,
        dpsNumber,
        municipalityCode: settings.municipalityCode,
        providerDocumentNumber: providerSnapshot.documentNumber,
      });
    const idempotencyKey =
      current.idempotencyKey ??
      computeNfseFileHash(
        JSON.stringify({
          dpsIdentifier,
          documentId,
          organizationId,
          taxableAmount: current.amounts.serviceAmount,
          taxes: current.taxes,
        }),
      );

    await appendEvent(supabase, {
      actorUserId,
      eventType: "validation.started",
      organizationId,
      payload: {
        dpsIdentifier,
        idempotencyKey,
      },
      serviceInvoiceId: documentId,
      statusFrom: current.status,
      statusTo: current.status,
    });

    assertLifecycleTransition({
      eventType: "transmission.requested",
      nextStatus: "queued",
      previousStatus: current.status,
    });

    const requestedRow = await updateDocumentState(supabase, {
      documentId,
      organizationId,
      values: {
        dps_identifier: dpsIdentifier,
        dps_number: reservedNumber,
        idempotency_key: idempotencyKey,
        issue_attempts: Number(currentRow.issue_attempts ?? 0) + 1,
        provider: settings.adapterType,
        status: "queued",
        status_check_required: false,
        transmission_requested_at: new Date().toISOString(),
        transmission_state: "requested",
      },
    });

    const requestEvent = await appendEvent(supabase, {
      actorUserId,
      eventType: "transmission.requested",
      organizationId,
      payload: {
        dpsIdentifier,
        dpsNumber,
        idempotencyKey,
      },
      serviceInvoiceId: documentId,
      statusFrom: current.status,
      statusTo: "queued",
    });

    const issuePayload = buildIssuePayload({
      clientProfile: clientSnapshot,
      document: mapDocument(requestedRow),
      dpsIdentifier,
      dpsNumber,
      providerProfile: providerSnapshot,
      settings,
      taxableService: serviceSnapshot,
    });
    const result = await this.adapter.issue(issuePayload);

    const files: NfseDocumentFileRecord[] = [];
    const rejections: NfseDocumentRejectionRecord[] = [];
    const events: NfseDocumentEventRecord[] = [requestEvent];

    files.push(
      await storeFile(supabase, {
        contentText: result.requestXml,
        environment: settings.environment,
        eventId: requestEvent.id,
        fileRole: "request_xml",
        isLocked: result.kind === "authorized",
        mimeType: "application/xml",
        organizationId,
        serviceInvoiceId: documentId,
      }),
    );

    if (result.kind === "authorized") {
      assertLifecycleTransition({
        eventType: "document.authorized",
        nextStatus: "authorized",
        previousStatus: "queued",
      });
      const authorizedEvent = await appendEvent(supabase, {
        actorUserId,
        eventType: "document.authorized",
        organizationId,
        payload: {
          accessKey: result.accessKey,
          nfseNumber: result.nfseNumber,
        },
        serviceInvoiceId: documentId,
        statusFrom: "queued",
        statusTo: "authorized",
      });
      events.push(authorizedEvent);

      files.push(
        await storeFile(supabase, {
          contentText: result.authorizedXml,
          environment: settings.environment,
          eventId: authorizedEvent.id,
          fileRole: "authorized_xml",
          isLocked: true,
          mimeType: "application/xml",
          organizationId,
          serviceInvoiceId: documentId,
        }),
      );

      if (result.danfsePdfBase64) {
        const pdfFile = await storeFile(supabase, {
          contentBase64: result.danfsePdfBase64,
          environment: settings.environment,
          eventId: authorizedEvent.id,
          fileRole: "danfse_pdf",
          isLocked: true,
          mimeType: "application/pdf",
          organizationId,
          serviceInvoiceId: documentId,
        });
        files.push(pdfFile);
      }

      const updatedRow = await updateDocumentState(supabase, {
        documentId,
        organizationId,
        values: {
          access_key: result.accessKey,
          authorized_at: new Date().toISOString(),
          issued_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
          nfse_number: result.nfseNumber,
          pdf_storage_path:
            files.find((item) => item.fileRole === "danfse_pdf")?.id ?? null,
          ready_for_issue_at: current.readyForIssueAt,
          status: "authorized",
          status_check_required: false,
          transmission_state: "authorized",
          verification_code: result.verificationCode,
          xml_storage_path:
            files.find((item) => item.fileRole === "authorized_xml")?.id ?? null,
        },
      });

      return {
        document: await hydrateDocument(supabase, organizationId, updatedRow),
        events,
        files,
        rejections,
      };
    }

    if (result.kind === "rejected") {
      assertLifecycleTransition({
        eventType: "transmission.rejected",
        nextStatus: "failed",
        previousStatus: "queued",
      });
      if (result.responsePayload.trim().startsWith("<")) {
        files.push(
          await storeFile(supabase, {
            contentText: result.responsePayload,
            environment: settings.environment,
            eventId: requestEvent.id,
            fileRole: "response_xml",
            mimeType: "application/xml",
            organizationId,
            serviceInvoiceId: documentId,
          }),
        );
      }

      const rejectedEvent = await appendEvent(supabase, {
        actorUserId,
        eventType: "transmission.rejected",
        organizationId,
        payload: {
          code: result.code,
          field: result.field,
          message: result.message,
        },
        serviceInvoiceId: documentId,
        statusFrom: "queued",
        statusTo: "failed",
      });
      events.push(rejectedEvent);

      rejections.push(
        await appendRejection(supabase, {
          attempt: Number(requestedRow.issue_attempts ?? 1),
          code: result.code,
          detail: {
            responsePayload: result.responsePayload.slice(0, 2000),
          },
          eventId: rejectedEvent.id,
          field: result.field,
          message: result.message,
          organizationId,
          serviceInvoiceId: documentId,
        }),
      );

      const updatedRow = await updateDocumentState(supabase, {
        documentId,
        organizationId,
        values: {
          last_synced_at: new Date().toISOString(),
          status: "failed",
          status_check_required: false,
          transmission_state: "rejected",
        },
      });

      return {
        document: await hydrateDocument(supabase, organizationId, updatedRow),
        events,
        files,
        rejections,
      };
    }

    if (result.kind === "processing") {
      assertLifecycleTransition({
        eventType: "transmission.accepted",
        nextStatus: "queued",
        previousStatus: "queued",
      });
      if (result.responsePayload.trim().startsWith("<")) {
        files.push(
          await storeFile(supabase, {
            contentText: result.responsePayload,
            environment: settings.environment,
            eventId: requestEvent.id,
            fileRole: "response_xml",
            mimeType: "application/xml",
            organizationId,
            serviceInvoiceId: documentId,
          }),
        );
      }

      const processingEvent = await appendEvent(supabase, {
        actorUserId,
        eventType: "transmission.accepted",
        organizationId,
        payload: {
          needsStatusQuery: result.needsStatusQuery,
        },
        serviceInvoiceId: documentId,
        statusFrom: "queued",
        statusTo: "queued",
      });
      events.push(processingEvent);

      const updatedRow = await updateDocumentState(supabase, {
        documentId,
        organizationId,
        values: {
          last_synced_at: new Date().toISOString(),
          status: "queued",
          status_check_required: true,
          transmission_state: "processing",
        },
      });
      await scheduleStatusCheck(supabase, {
        documentId,
        organizationId,
      });

      return {
        document: await hydrateDocument(supabase, organizationId, updatedRow),
        events,
        files,
        rejections,
      };
    }

    const timeoutEvent = await appendEvent(supabase, {
      actorUserId,
      eventType: "network.timeout",
      organizationId,
      payload: {
        message: result.message,
      },
      serviceInvoiceId: documentId,
      statusFrom: "queued",
      statusTo: "queued",
    });
    events.push(timeoutEvent);

    const updatedRow = await updateDocumentState(supabase, {
      documentId,
      organizationId,
      values: {
        last_synced_at: new Date().toISOString(),
        status: "queued",
        status_check_required: true,
        transmission_state: "timeout_pending_query",
      },
    });
    await scheduleStatusCheck(supabase, {
      documentId,
      organizationId,
    });

    return {
      document: await hydrateDocument(supabase, organizationId, updatedRow),
      events,
      files,
      rejections,
    };
  }

  async syncDocumentStatus({
    accessToken,
    organizationId,
    actorUserId,
    documentId,
  }: {
    accessToken: string;
    organizationId: string;
    actorUserId: string;
    documentId: string;
  }) {
    const supabase = createSupabase(accessToken);
    const currentRow = await fetchDocumentRow(supabase, organizationId, documentId);
    const current = await hydrateDocument(supabase, organizationId, currentRow);
    const settings = await fetchSettings(supabase, organizationId);

    if (!settings?.certificateReference) {
      throw new ConfigurationError("Nao existe referencia segura de certificado configurada para consulta de status.");
    }

    if (!current.dpsIdentifier) {
      throw new BadRequestError("O documento ainda nao possui identificador DPS reservado para consulta.");
    }

    const queryEvent = await appendEvent(supabase, {
      actorUserId,
      eventType: "processing.query.requested",
      organizationId,
      payload: {
        dpsIdentifier: current.dpsIdentifier,
      },
      serviceInvoiceId: documentId,
      statusFrom: current.status,
      statusTo: current.status,
    });

    const result = await this.adapter.queryStatus({
      certificateReference: settings.certificateReference,
      credentialReference: settings.credentialReference ?? null,
      dpsIdentifier: current.dpsIdentifier,
      environment: settings.environment,
    });

    const files: NfseDocumentFileRecord[] = [];
    const rejections: NfseDocumentRejectionRecord[] = [];
    const events: NfseDocumentEventRecord[] = [queryEvent];

    if (result.kind === "authorized") {
      assertLifecycleTransition({
        eventType: "document.authorized",
        nextStatus: "authorized",
        previousStatus: current.status,
      });
      const authorizedEvent = await appendEvent(supabase, {
        actorUserId,
        eventType: "document.authorized",
        organizationId,
        payload: {
          accessKey: result.accessKey,
          nfseNumber: result.nfseNumber,
        },
        serviceInvoiceId: documentId,
        statusFrom: current.status,
        statusTo: "authorized",
      });
      events.push(authorizedEvent);

      files.push(
        await storeFile(supabase, {
          contentText: result.authorizedXml,
          environment: settings.environment,
          eventId: authorizedEvent.id,
          fileRole: "authorized_xml",
          isLocked: true,
          mimeType: "application/xml",
          organizationId,
          serviceInvoiceId: documentId,
        }),
      );

      if (result.danfsePdfBase64) {
        files.push(
          await storeFile(supabase, {
            contentBase64: result.danfsePdfBase64,
            environment: settings.environment,
            eventId: authorizedEvent.id,
            fileRole: "danfse_pdf",
            isLocked: true,
            mimeType: "application/pdf",
            organizationId,
            serviceInvoiceId: documentId,
          }),
        );
      }

      const updatedRow = await updateDocumentState(supabase, {
        documentId,
        organizationId,
        values: {
          access_key: result.accessKey,
          authorized_at: new Date().toISOString(),
          issued_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
          nfse_number: result.nfseNumber,
          pdf_storage_path:
            files.find((item) => item.fileRole === "danfse_pdf")?.id ?? currentRow.pdf_storage_path ?? null,
          status: "authorized",
          status_check_required: false,
          transmission_state: "authorized",
          verification_code: result.verificationCode,
          xml_storage_path:
            files.find((item) => item.fileRole === "authorized_xml")?.id ?? currentRow.xml_storage_path ?? null,
        },
      });

      await supabase
        .from("async_jobs")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", organizationId)
        .eq("job_type", PROCESSING_JOB_TYPE)
        .contains("payload", { documentId });

      return {
        document: await hydrateDocument(supabase, organizationId, updatedRow),
        events,
        files,
        rejections,
      };
    }

    if (result.kind === "rejected") {
      assertLifecycleTransition({
        eventType: "document.error_definitive",
        nextStatus: "failed",
        previousStatus: current.status,
      });
      const rejectedEvent = await appendEvent(supabase, {
        actorUserId,
        eventType: "document.error_definitive",
        organizationId,
        payload: {
          code: result.code,
          field: result.field,
          message: result.message,
        },
        serviceInvoiceId: documentId,
        statusFrom: current.status,
        statusTo: "failed",
      });
      events.push(rejectedEvent);
      rejections.push(
        await appendRejection(supabase, {
          attempt: Number(currentRow.issue_attempts ?? 1),
          code: result.code,
          detail: {
            responsePayload: result.responsePayload.slice(0, 2000),
          },
          eventId: rejectedEvent.id,
          field: result.field,
          message: result.message,
          organizationId,
          serviceInvoiceId: documentId,
        }),
      );

      const updatedRow = await updateDocumentState(supabase, {
        documentId,
        organizationId,
        values: {
          last_synced_at: new Date().toISOString(),
          status: "failed",
          status_check_required: false,
          transmission_state: "rejected",
        },
      });

      return {
        document: await hydrateDocument(supabase, organizationId, updatedRow),
        events,
        files,
        rejections,
      };
    }

    const pendingEvent = await appendEvent(supabase, {
      actorUserId,
      eventType: "processing.query.pending",
      organizationId,
      payload: {
        status: result.kind,
      },
      serviceInvoiceId: documentId,
      statusFrom: current.status,
      statusTo: "queued",
    });
    events.push(pendingEvent);

    const updatedRow = await updateDocumentState(supabase, {
      documentId,
      organizationId,
      values: {
        last_synced_at: new Date().toISOString(),
        status: "queued",
        status_check_required: true,
        transmission_state: "processing",
      },
    });

    await scheduleStatusCheck(supabase, {
      attempt: Number(currentRow.issue_attempts ?? 0),
      documentId,
      organizationId,
      availableAt: new Date(Date.now() + 60_000).toISOString(),
    });

    return {
      document: await hydrateDocument(supabase, organizationId, updatedRow),
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
  }) {
    const supabase = createSupabase(accessToken);
    const events: NfseDocumentEventRecord[] = [];
    const files: NfseDocumentFileRecord[] = [];
    const rejections: NfseDocumentRejectionRecord[] = [];

    let currentRow = await fetchDocumentRow(supabase, organizationId, documentId);
    let current = await hydrateDocument(supabase, organizationId, currentRow);

    if (
      current.pendingStatusCheck ||
      current.transmissionState === "processing" ||
      current.transmissionState === "timeout_pending_query"
    ) {
      const syncResult = await this.syncDocumentStatus({
        accessToken,
        actorUserId,
        documentId,
        organizationId,
      });
      events.push(...syncResult.events);
      files.push(...syncResult.files);
      rejections.push(...syncResult.rejections);
      currentRow = await fetchDocumentRow(supabase, organizationId, documentId);
      current = await hydrateDocument(supabase, organizationId, currentRow);
    }

    const settings = await fetchSettings(supabase, organizationId);

    if (current.accessKey && settings?.certificateReference) {
      const remoteResult = await this.adapter.listEvents({
        accessKey: current.accessKey,
        certificateReference: settings.certificateReference,
        credentialReference: settings.credentialReference ?? null,
        environment: settings.environment,
      });

      let statusChangedToCancelled = false;
      let statusChangedByRemoteEvent: NfseDocumentRemoteEventRecord | null = null;

      for (const remoteEvent of remoteResult.events) {
        const fileRecord =
          remoteEvent.eventXml && remoteEvent.eventXml.trim().startsWith("<")
            ? await storeFileIfMissing(supabase, {
                contentText: remoteEvent.eventXml,
                environment: settings.environment,
                eventId: null,
                fileRole: "event_xml",
                isLocked: true,
                mimeType: "application/xml",
                organizationId,
                serviceInvoiceId: documentId,
              })
            : null;

        if (fileRecord) {
          files.push(fileRecord);
        }

        const remoteRecord = await upsertRemoteEvent(supabase, {
          accessKey: current.accessKey ?? "",
          detail: remoteEvent.summary,
          effect: remoteEvent.effect,
          eventName: remoteEvent.eventName,
          eventSequence: remoteEvent.eventSequence ?? 1,
          eventTypeCode: remoteEvent.eventTypeCode,
          fileId: fileRecord?.id ?? null,
          occurredAt: remoteEvent.occurredAt,
          organizationId,
          serviceInvoiceId: documentId,
          source: "adn",
        });

        if (remoteRecord.effect === "cancelled" && current.status === "authorized" && !statusChangedToCancelled) {
          assertLifecycleTransition({
            eventType: "document.cancelled",
            nextStatus: "cancelled",
            previousStatus: current.status,
          });

          const cancelledEvent = await appendEvent(supabase, {
            actorUserId,
            eventType: "document.cancelled",
            organizationId,
            payload: {
              accessKey: current.accessKey,
              eventName: remoteRecord.eventName,
              eventSequence: remoteRecord.eventSequence,
              eventTypeCode: remoteRecord.eventTypeCode,
            },
            serviceInvoiceId: documentId,
            statusFrom: current.status,
            statusTo: "cancelled",
          });
          events.push(cancelledEvent);

          currentRow = await updateDocumentState(supabase, {
            documentId,
            organizationId,
            values: {
              cancel_event_id: cancelledEvent.id,
              cancelled_at: remoteRecord.occurredAt ?? new Date().toISOString(),
              cancelled_reason_code: remoteRecord.eventTypeCode ? String(remoteRecord.eventTypeCode) : null,
              cancelled_reason_text: remoteRecord.eventName,
              last_synced_at: new Date().toISOString(),
              lifecycle_synced_at: new Date().toISOString(),
              status: "cancelled",
              status_check_required: false,
              transmission_state: "cancelled",
            },
          });
          current = await hydrateDocument(supabase, organizationId, currentRow);
          statusChangedToCancelled = true;
          statusChangedByRemoteEvent = remoteRecord;
        }
      }

      if (!statusChangedToCancelled) {
        currentRow = await updateDocumentState(supabase, {
          documentId,
          organizationId,
          values: {
            lifecycle_synced_at: new Date().toISOString(),
          },
        });
        current = await hydrateDocument(supabase, organizationId, currentRow);
      }

      events.push(
        await appendEvent(supabase, {
          actorUserId,
          eventType: "lifecycle.remote_events_synced",
          organizationId,
          payload: {
            changedStatusToCancelled: statusChangedToCancelled,
            officialRemoteEventCount: remoteResult.events.length,
            remoteCancellationEventName: statusChangedByRemoteEvent?.eventName ?? null,
          },
          serviceInvoiceId: documentId,
          statusFrom: current.status,
          statusTo: current.status,
        }),
      );
    }

    const reconciledDocument = await this.reconcileDocument({
      accessToken,
      actorUserId,
      documentId,
      organizationId,
    });

    return {
      document: reconciledDocument,
      events,
      files,
      rejections,
    };
  }

  async reconcileDocument({
    accessToken,
    organizationId,
    actorUserId,
    documentId,
  }: {
    accessToken: string;
    organizationId: string;
    actorUserId: string;
    documentId: string;
  }) {
    const supabase = createSupabase(accessToken);
    const currentRow = await fetchDocumentRow(supabase, organizationId, documentId);
    const current = await hydrateDocument(supabase, organizationId, currentRow);
    const reconciliation = await buildReconciliationSnapshot(supabase, organizationId, current);

    await appendReconciliation(supabase, {
      actorUserId,
      chargeId: reconciliation.chargeId ?? null,
      issues: reconciliation.issues,
      organizationId,
      processId: reconciliation.processId ?? null,
      serviceInvoiceId: documentId,
      snapshot: reconciliation.snapshot,
      status: reconciliation.status,
    });

    await appendEvent(supabase, {
      actorUserId,
      eventType: "reconciliation.checked",
      organizationId,
      payload: {
        issueCount: reconciliation.issues.length,
        reconciliationStatus: reconciliation.status,
      },
      serviceInvoiceId: documentId,
      statusFrom: current.status,
      statusTo: current.status,
    });

    return hydrateDocument(supabase, organizationId, currentRow);
  }

  async listDocumentEvents({
    accessToken,
    organizationId,
    documentId,
  }: {
    accessToken: string;
    organizationId: string;
    documentId: string;
  }) {
    return fetchDocumentEvents(createSupabase(accessToken), organizationId, documentId);
  }

  async listDocumentRemoteEvents({
    accessToken,
    organizationId,
    documentId,
  }: {
    accessToken: string;
    organizationId: string;
    documentId: string;
  }) {
    return fetchDocumentRemoteEvents(createSupabase(accessToken), organizationId, documentId);
  }

  async listDocumentRejections({
    accessToken,
    organizationId,
    documentId,
  }: {
    accessToken: string;
    organizationId: string;
    documentId: string;
  }) {
    return fetchDocumentRejections(createSupabase(accessToken), organizationId, documentId);
  }

  async listDocumentFiles({
    accessToken,
    organizationId,
    documentId,
  }: {
    accessToken: string;
    organizationId: string;
    documentId: string;
  }) {
    return fetchDocumentFiles(createSupabase(accessToken), organizationId, documentId);
  }

  async downloadDocumentFile({
    accessToken,
    organizationId,
    documentId,
    fileId,
  }: {
    accessToken: string;
    organizationId: string;
    documentId: string;
    fileId: string;
  }): Promise<NfseDocumentFileDownload> {
    const supabase = createSupabase(accessToken);
    const response = await supabase
      .from("nfse_document_files")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("service_invoice_id", documentId)
      .eq("id", fileId)
      .single();

    normalizeWriteError(response);

    const row = response.data as Record<string, unknown>;
    const role = String(row.file_role);
    const extension = role === "danfse_pdf" ? "pdf" : "xml";

    return {
      content: row.content_base64 ? String(row.content_base64) : String(row.content_text ?? ""),
      fileName: `nfse-${documentId}-${role}.${extension}`,
      isBase64: Boolean(row.content_base64),
      mimeType: String(row.mime_type),
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
    const supabase = createSupabase(accessToken);
    const response = await supabase
      .from("async_jobs")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("job_type", PROCESSING_JOB_TYPE)
      .eq("status", "pending")
      .lte("available_at", new Date().toISOString())
      .order("available_at", { ascending: true })
      .limit(10);

    normalizeWriteError(response);

    let processed = 0;

    for (const job of response.data ?? []) {
      const jobId = String(job.id);
      const documentId = String((job.payload as Record<string, unknown>)?.documentId ?? "");

      if (!documentId) {
        await supabase
          .from("async_jobs")
          .update({
            last_error: "Payload do job sem documentId.",
            status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", jobId);
        continue;
      }

      await supabase
        .from("async_jobs")
        .update({
          attempts: Number(job.attempts ?? 0) + 1,
          status: "processing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      try {
        await this.syncDocumentStatus({
          accessToken,
          actorUserId,
          documentId,
          organizationId,
        });

        await supabase
          .from("async_jobs")
          .update({
            status: "completed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", jobId);
        processed += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao processar job fiscal.";
        await supabase
          .from("async_jobs")
          .update({
            available_at: new Date(Date.now() + 60_000).toISOString(),
            last_error: message,
            status: "pending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      }
    }

    return processed;
  }

  async getEventMatrix(): Promise<NfseEventMatrixRecord[]> {
    return [...nfseNationalEventMatrix];
  }
}
