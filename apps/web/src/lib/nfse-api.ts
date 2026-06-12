"use client";

import type {
  ClientFiscalProfileInput,
  NfseDraftInput,
  NfseDocumentFileRole,
  NfseDocumentStatus,
  NfseFiscalSettingsInput,
  NfseReconciliationStatus,
  NfseReadiness,
  NfseTransmissionState,
  ProviderFiscalProfileInput,
  TaxableServiceInput,
} from "@case-sistema/contracts";

export type NfseApiSession = {
  apiBaseUrl: string;
  accessToken: string;
  organizationId: string;
};

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

export type NfseIssueDocumentResult = {
  document: NfseDocumentRecord;
  events: NfseDocumentEventRecord[];
  files: NfseDocumentFileRecord[];
  rejections: NfseDocumentRejectionRecord[];
};

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, "");
}

export function getDefaultNfseApiBaseUrl() {
  return process.env.NEXT_PUBLIC_NFSE_API_BASE_URL?.trim() || "http://localhost:3001";
}

export function maskAccessToken(token: string) {
  if (!token.trim()) {
    return "Nao informado";
  }

  if (token.length <= 10) {
    return `${token.slice(0, 2)}***`;
  }

  return `${token.slice(0, 4)}***${token.slice(-4)}`;
}

export function describeDocumentStatus(document: Pick<NfseDocumentRecord, "status" | "transmissionState">) {
  if (document.status === "cancelled" || document.transmissionState === "cancelled") {
    return "Cancelada";
  }

  if (document.status === "authorized") {
    return "Autorizada";
  }

  if (document.status === "failed" || document.transmissionState === "rejected") {
    return "Rejeitada";
  }

  if (document.transmissionState === "timeout_pending_query") {
    return "Aguardando consulta";
  }

  if (document.transmissionState === "processing") {
    return "Em processamento";
  }

  if (document.transmissionState === "requested" || document.status === "queued") {
    return "Fila de emissao";
  }

  if (document.status === "ready_for_issue") {
    return "Pronto para emissao";
  }

  return "Rascunho bloqueado";
}

export function describeEnvironment(environment: NfseFiscalSettingsInput["environment"]) {
  return environment === "homologation" ? "Homologacao nacional" : "Producao bloqueada";
}

export async function requestNfseApi<T>(
  session: NfseApiSession,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${session.accessToken}`);

  if (session.organizationId.trim()) {
    headers.set("x-organization-id", session.organizationId.trim());
  }

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${normalizeBaseUrl(session.apiBaseUrl)}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = `Falha HTTP ${response.status}.`;

    try {
      const payload = (await response.json()) as { message?: string };
      message = payload.message || message;
    } catch {
      // Ignore parse failures and keep the generic message.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function downloadDocumentFile(
  session: NfseApiSession,
  documentId: string,
  fileId: string,
) {
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${session.accessToken}`);

  if (session.organizationId.trim()) {
    headers.set("x-organization-id", session.organizationId.trim());
  }

  const response = await fetch(
    `${normalizeBaseUrl(session.apiBaseUrl)}/v1/finance/nfse/documents/${documentId}/files/${fileId}/download`,
    {
      headers,
      method: "GET",
    },
  );

  if (!response.ok) {
    let message = `Falha HTTP ${response.status}.`;

    try {
      const payload = (await response.json()) as { message?: string };
      message = payload.message || message;
    } catch {
      // No-op.
    }

    throw new Error(message);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const fileNameMatch = disposition.match(/filename="([^"]+)"/i);

  return {
    blob,
    fileName: fileNameMatch?.[1] ?? `${documentId}-${fileId}`,
  };
}
