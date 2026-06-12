"use client";

import { useMemo, useState } from "react";
import {
  clientFiscalProfileInputSchema,
  fiscalPersonTypeValues,
  nfseEnvironmentValues,
  nfseValidationStatusValues,
  providerFiscalProfileInputSchema,
  taxRuleOriginValues,
  taxableServiceInputSchema,
  type ClientFiscalProfileInput,
  type NfseDraftInput,
  type NfseReadiness,
  type ProviderFiscalProfileInput,
  type TaxableServiceInput,
} from "@case-sistema/contracts";
import { Field, Input, Select, TextArea } from "@/components/form-primitives";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import {
  clientProfileDefault,
  buildUiReadiness,
  collectFieldErrors,
  draftDefault,
  fiscalSettingsDefault,
  groupIssuesBySource,
  normalizeDraftPayload,
  providerProfileDefault,
  taxableServiceDefault,
} from "@/lib/nfse-form-state";
import {
  describeDocumentStatus,
  describeEnvironment,
  downloadDocumentFile,
  getDefaultNfseApiBaseUrl,
  maskAccessToken,
  requestNfseApi,
  type ClientFiscalProfileRecord,
  type NfseApiSession,
  type NfseDocumentEventRecord,
  type NfseDocumentFileRecord,
  type NfseDocumentRecord,
  type NfseDocumentReconciliationRecord,
  type NfseDocumentRejectionRecord,
  type NfseDocumentRemoteEventRecord,
  type NfseEventMatrixRecord,
  type NfseFiscalSettingsRecord,
  type NfseIssueDocumentResult,
  type ProviderFiscalProfileRecord,
  type TaxableServiceRecord,
} from "@/lib/nfse-api";

const storageKey = "case-sistema:nfse-api-session";

type FeedbackState = {
  tone: "error" | "info" | "success";
  message: string;
};

type SessionFormState = {
  apiBaseUrl: string;
  accessToken: string;
  organizationId: string;
};

function buttonClass(tone: "primary" | "secondary" | "danger" = "primary") {
  if (tone === "secondary") {
    return "inline-flex h-11 items-center justify-center rounded-[14px] border border-[#D8E2EC] bg-white px-4 text-sm font-semibold text-[#1E4F80] transition-colors duration-200 hover:bg-[#F5F9FD] disabled:cursor-not-allowed disabled:border-[#E7EEF5] disabled:text-[#94A3B8]";
  }

  if (tone === "danger") {
    return "inline-flex h-11 items-center justify-center rounded-[14px] bg-[#B42318] px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#8F1B13] disabled:cursor-not-allowed disabled:bg-[#E4A8A1]";
  }

  return "inline-flex h-11 items-center justify-center rounded-[14px] bg-[#1E4F80] px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#173A5E] disabled:cursor-not-allowed disabled:bg-[#90ACC8]";
}

function feedbackClass(tone: FeedbackState["tone"]) {
  if (tone === "success") {
    return "border-[#CFEFDD] bg-[#ECF9F1] text-[#1F8D53]";
  }

  if (tone === "error") {
    return "border-[#F9D5D5] bg-[#FDF1F1] text-[#B42318]";
  }

  return "border-[#D7E6F5] bg-[#EEF5FC] text-[#1E4F80]";
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Nao registrado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatByteSize(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  return `${(value / 1024).toFixed(1)} KB`;
}

function mapDocumentToDraft(document: NfseDocumentRecord): NfseDraftInput {
  return {
    amounts: document.amounts,
    chargeId: document.chargeId,
    clientId: document.clientId,
    competenceDate: document.competenceDate,
    currencyCode: "BRL",
    description: document.description,
    intendedIssueDate: document.intendedIssueDate,
    notes: document.notes,
    processId: document.processId,
    serviceDate: document.serviceDate,
    taxableServiceId: document.taxableServiceId ?? draftDefault.taxableServiceId,
    taxes: document.taxes,
  };
}

function getInitialSessionForm(): SessionFormState {
  const fallback: SessionFormState = {
    accessToken: "",
    apiBaseUrl: getDefaultNfseApiBaseUrl(),
    organizationId: "",
  };

  if (typeof window === "undefined") {
    return fallback;
  }

  const stored = window.sessionStorage.getItem(storageKey);

  if (!stored) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(stored) as Pick<NfseApiSession, "apiBaseUrl" | "organizationId">;
    return {
      accessToken: "",
      apiBaseUrl: parsed.apiBaseUrl || fallback.apiBaseUrl,
      organizationId: parsed.organizationId || "",
    };
  } catch {
    window.sessionStorage.removeItem(storageKey);
    return fallback;
  }
}

export function NfsePreparationWorkbench() {
  const [sessionForm, setSessionForm] = useState<SessionFormState>(getInitialSessionForm);
  const [session, setSession] = useState<NfseApiSession | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const [settings, setSettings] = useState(fiscalSettingsDefault);
  const [providerProfile, setProviderProfile] = useState(providerProfileDefault);
  const [clientProfile, setClientProfile] = useState(clientProfileDefault);
  const [services, setServices] = useState<TaxableServiceRecord[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [taxableService, setTaxableService] = useState(taxableServiceDefault);

  const [draft, setDraft] = useState(draftDefault);
  const [documents, setDocuments] = useState<NfseDocumentRecord[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<NfseDocumentRecord | null>(null);
  const [events, setEvents] = useState<NfseDocumentEventRecord[]>([]);
  const [remoteEvents, setRemoteEvents] = useState<NfseDocumentRemoteEventRecord[]>([]);
  const [rejections, setRejections] = useState<NfseDocumentRejectionRecord[]>([]);
  const [files, setFiles] = useState<NfseDocumentFileRecord[]>([]);
  const [eventMatrix, setEventMatrix] = useState<NfseEventMatrixRecord[]>([]);
  const [latestReconciliation, setLatestReconciliation] = useState<NfseDocumentReconciliationRecord | null>(null);

  const providerErrors = collectFieldErrors(providerFiscalProfileInputSchema, providerProfile);
  const clientErrors = collectFieldErrors(clientFiscalProfileInputSchema, clientProfile);
  const serviceErrors = collectFieldErrors(taxableServiceInputSchema, taxableService);

  const localReadiness = useMemo<NfseReadiness>(() => {
    if (selectedDocument) {
      return selectedDocument.readiness;
    }

    try {
      return buildUiReadiness({
        clientProfile,
        draft,
        providerProfile,
        settings,
        taxableService,
      });
    } catch {
      return {
        issues: [],
        isReady: false,
        status: "draft",
      };
    }
  }, [clientProfile, draft, providerProfile, selectedDocument, settings, taxableService]);
  const groupedIssues = useMemo(() => groupIssuesBySource(localReadiness.issues), [localReadiness.issues]);

  const documentCounts = useMemo(() => {
    return documents.reduce(
      (accumulator, document) => {
        const label = describeDocumentStatus(document);
        accumulator[label] = (accumulator[label] ?? 0) + 1;
        return accumulator;
      },
      {} as Record<string, number>,
    );
  }, [documents]);

  const selectedDocumentCanEdit = Boolean(
    selectedDocument &&
      selectedDocument.status !== "authorized" &&
      selectedDocument.status !== "cancelled" &&
      !selectedDocument.pendingStatusCheck &&
      selectedDocument.transmissionState !== "requested" &&
      selectedDocument.transmissionState !== "processing" &&
      selectedDocument.transmissionState !== "cancel_requested" &&
      selectedDocument.transmissionState !== "timeout_pending_query",
  );
  const canIssue =
    Boolean(selectedDocument) &&
    selectedDocument?.status === "ready_for_issue" &&
    selectedDocument.validationStatus === "valid" &&
    settings.environment === "homologation";
  const canSync = Boolean(
    selectedDocument &&
      settings.environment === "homologation" &&
      (selectedDocument.pendingStatusCheck ||
        selectedDocument.status === "authorized" ||
        selectedDocument.status === "cancelled"),
  );
  const canReconcile = Boolean(selectedDocument && session);

  async function runAction(action: string, callback: () => Promise<void>, successMessage?: string) {
    setBusyAction(action);

    try {
      await callback();

      if (successMessage) {
        setFeedback({
          message: successMessage,
          tone: "success",
        });
      }
    } catch (error) {
      setFeedback({
        message: error instanceof Error ? error.message : "Falha inesperada ao executar a operacao fiscal.",
        tone: "error",
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function loadClientProfile(activeSession: NfseApiSession, clientId: string) {
    const response = await requestNfseApi<{ item: ClientFiscalProfileRecord | null }>(
      activeSession,
      `/v1/finance/nfse/clients/${clientId}/fiscal-profile`,
    );

    if (response.item) {
      setClientProfile(response.item);
    } else {
      setClientProfile({
        ...clientProfileDefault,
        clientId,
      });
    }
  }

  async function loadDocumentCollections(activeSession: NfseApiSession, documentId: string) {
    const [detail, eventItems, remoteEventItems, rejectionItems, fileItems] = await Promise.all([
      requestNfseApi<{ item: NfseDocumentRecord }>(activeSession, `/v1/finance/nfse/documents/${documentId}`),
      requestNfseApi<{ items: NfseDocumentEventRecord[] }>(activeSession, `/v1/finance/nfse/documents/${documentId}/events`),
      requestNfseApi<{ items: NfseDocumentRemoteEventRecord[] }>(
        activeSession,
        `/v1/finance/nfse/documents/${documentId}/remote-events`,
      ),
      requestNfseApi<{ items: NfseDocumentRejectionRecord[] }>(
        activeSession,
        `/v1/finance/nfse/documents/${documentId}/rejections`,
      ),
      requestNfseApi<{ items: NfseDocumentFileRecord[] }>(activeSession, `/v1/finance/nfse/documents/${documentId}/files`),
    ]);

    setSelectedDocument(detail.item);
    setEvents(eventItems.items);
    setRemoteEvents(remoteEventItems.items);
    setRejections(rejectionItems.items);
    setFiles(fileItems.items);
    setLatestReconciliation(detail.item.latestReconciliation);
    setDraft(mapDocumentToDraft(detail.item));

    if (detail.item.taxableServiceId) {
      setSelectedServiceId(detail.item.taxableServiceId);
    }

    if (detail.item.clientId && detail.item.clientId !== clientProfile.clientId) {
      await loadClientProfile(activeSession, detail.item.clientId);
    }
  }

  async function loadWorkspace(activeSession: NfseApiSession, announce = true) {
    const [settingsResponse, providerResponse, servicesResponse, documentsResponse, matrixResponse] = await Promise.all([
      requestNfseApi<{ item: NfseFiscalSettingsRecord | null }>(activeSession, "/v1/finance/nfse/settings"),
      requestNfseApi<{ item: ProviderFiscalProfileRecord | null }>(activeSession, "/v1/finance/nfse/provider-profile"),
      requestNfseApi<{ items: TaxableServiceRecord[] }>(activeSession, "/v1/finance/nfse/services"),
      requestNfseApi<{ items: NfseDocumentRecord[] }>(activeSession, "/v1/finance/nfse/documents"),
      requestNfseApi<{ items: NfseEventMatrixRecord[] }>(activeSession, "/v1/finance/nfse/event-matrix"),
    ]);

    setSettings(settingsResponse.item ?? fiscalSettingsDefault);
    setProviderProfile(providerResponse.item ?? providerProfileDefault);
    setServices(servicesResponse.items);
    setDocuments(documentsResponse.items);
    setEventMatrix(matrixResponse.items);

    if (servicesResponse.items[0]) {
      setSelectedServiceId((current) => current ?? servicesResponse.items[0].id);
      setTaxableService((current) => {
        const selected = servicesResponse.items.find((item) => item.id === (selectedServiceId ?? servicesResponse.items[0].id));
        return selected ?? current;
      });
      setDraft((current) => ({
        ...current,
        taxableServiceId: servicesResponse.items[0].id,
      }));
    }

    await loadClientProfile(activeSession, clientProfile.clientId);

    const nextSelectedDocumentId = selectedDocumentId ?? documentsResponse.items[0]?.id ?? null;
    setSelectedDocumentId(nextSelectedDocumentId);

    if (nextSelectedDocumentId) {
      await loadDocumentCollections(activeSession, nextSelectedDocumentId);
    } else {
      setSelectedDocument(null);
      setEvents([]);
      setRemoteEvents([]);
      setRejections([]);
      setFiles([]);
      setLatestReconciliation(null);
    }

    if (announce) {
      setFeedback({
        message: "Sessao de homologacao carregada com sucesso.",
        tone: "success",
      });
    }
  }

  function updateSessionForm<K extends keyof SessionFormState>(key: K, value: SessionFormState[K]) {
    setSessionForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateSettings<K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateProvider<K extends keyof ProviderFiscalProfileInput>(key: K, value: ProviderFiscalProfileInput[K]) {
    setProviderProfile((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateClient<K extends keyof ClientFiscalProfileInput>(key: K, value: ClientFiscalProfileInput[K]) {
    setClientProfile((current) => ({
      ...current,
      [key]: value,
    }));

    if (key === "clientId") {
      setDraft((current) => ({
        ...current,
        clientId: String(value),
      }));
    }
  }

  function updateService<K extends keyof TaxableServiceInput>(key: K, value: TaxableServiceInput[K]) {
    setTaxableService((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateDraft<K extends keyof NfseDraftInput>(key: K, value: NfseDraftInput[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateDraftAmount(key: keyof NfseDraftInput["amounts"], value: string) {
    setDraft((current) => ({
      ...current,
      amounts: {
        ...current.amounts,
        [key]: value,
      },
    }));
  }

  function updateDraftTax<K extends keyof NfseDraftInput["taxes"]>(
    key: K,
    value: NfseDraftInput["taxes"][K],
  ) {
    setDraft((current) => ({
      ...current,
      taxes: {
        ...current.taxes,
        [key]: value,
      },
    }));
  }

  async function connectSession() {
    const nextSession: NfseApiSession = {
      accessToken: sessionForm.accessToken.trim(),
      apiBaseUrl: sessionForm.apiBaseUrl.trim(),
      organizationId: sessionForm.organizationId.trim(),
    };

    if (!nextSession.accessToken || !nextSession.apiBaseUrl) {
      setFeedback({
        message: "Informe URL da API e token valido para abrir a sessao fiscal.",
        tone: "error",
      });
      return;
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          apiBaseUrl: nextSession.apiBaseUrl,
          organizationId: nextSession.organizationId,
        }),
      );
    }

    setSession(nextSession);
    await runAction("connect-session", async () => {
      await loadWorkspace(nextSession);
    });
  }

  async function refreshWorkspace() {
    if (!session) {
      return;
    }

    await runAction("refresh-workspace", async () => {
      await loadWorkspace(session);
    }, "Dados fiscais atualizados.");
  }

  async function saveSettings() {
    if (!session) {
      return;
    }

    await runAction("save-settings", async () => {
      const response = await requestNfseApi<{ item: NfseFiscalSettingsRecord }>(session, "/v1/finance/nfse/settings", {
        body: JSON.stringify(settings),
        method: "PUT",
      });
      setSettings(response.item);
      await refreshWorkspace();
    }, "Configuracao fiscal salva.");
  }

  async function saveProviderProfile() {
    if (!session) {
      return;
    }

    await runAction("save-provider", async () => {
      const response = await requestNfseApi<{ item: ProviderFiscalProfileRecord }>(
        session,
        "/v1/finance/nfse/provider-profile",
        {
          body: JSON.stringify(providerProfile),
          method: "PUT",
        },
      );
      setProviderProfile(response.item);
      await refreshWorkspace();
    }, "Prestador fiscal salvo.");
  }

  async function saveClientProfile() {
    if (!session) {
      return;
    }

    await runAction("save-client", async () => {
      const response = await requestNfseApi<{ item: ClientFiscalProfileRecord }>(
        session,
        `/v1/finance/nfse/clients/${clientProfile.clientId}/fiscal-profile`,
        {
          body: JSON.stringify(clientProfile),
          method: "PUT",
        },
      );
      setClientProfile(response.item);
      await refreshWorkspace();
    }, "Tomador fiscal salvo.");
  }

  async function saveTaxableService() {
    if (!session) {
      return;
    }

    await runAction("save-service", async () => {
      const path = selectedServiceId
        ? `/v1/finance/nfse/services/${selectedServiceId}`
        : "/v1/finance/nfse/services";
      const response = await requestNfseApi<{ item: TaxableServiceRecord }>(session, path, {
        body: JSON.stringify(taxableService),
        method: selectedServiceId ? "PATCH" : "POST",
      });

      setSelectedServiceId(response.item.id);
      setTaxableService(response.item);
      setDraft((current) => ({
        ...current,
        taxableServiceId: response.item.id,
      }));
      await refreshWorkspace();
    }, "Servico tributavel salvo.");
  }

  async function saveDocument() {
    if (!session) {
      return;
    }

    const payload = normalizeDraftPayload({
      ...draft,
      clientId: clientProfile.clientId,
      taxableServiceId: selectedServiceId ?? draft.taxableServiceId,
    });

    await runAction("save-document", async () => {
      const path = selectedDocumentId && selectedDocumentCanEdit
        ? `/v1/finance/nfse/documents/${selectedDocumentId}`
        : "/v1/finance/nfse/documents";
      const response = await requestNfseApi<{ item: NfseDocumentRecord }>(session, path, {
        body: JSON.stringify(payload),
        method: selectedDocumentId && selectedDocumentCanEdit ? "PATCH" : "POST",
      });

      setSelectedDocumentId(response.item.id);
      await loadWorkspace(session, false);
      await loadDocumentCollections(session, response.item.id);
    }, selectedDocumentId && selectedDocumentCanEdit ? "Rascunho fiscal atualizado." : "Rascunho fiscal criado.");
  }

  async function issueDocument() {
    if (!session || !selectedDocumentId) {
      return;
    }

    await runAction("issue-document", async () => {
      const response = await requestNfseApi<NfseIssueDocumentResult>(
        session,
        `/v1/finance/nfse/documents/${selectedDocumentId}/issue`,
        {
          body: JSON.stringify({}),
          method: "POST",
        },
      );
      setSelectedDocument(response.document);
      setEvents(response.events);
      setRejections(response.rejections);
      setFiles(response.files);
      await refreshWorkspace();
      await loadDocumentCollections(session, selectedDocumentId);
    }, "Transmissao de homologacao executada.");
  }

  async function syncDocument() {
    if (!session || !selectedDocumentId) {
      return;
    }

    await runAction("sync-document", async () => {
      const response = await requestNfseApi<NfseIssueDocumentResult>(
        session,
        `/v1/finance/nfse/documents/${selectedDocumentId}/sync`,
        {
          body: JSON.stringify({}),
          method: "POST",
        },
      );
      setSelectedDocument(response.document);
      setEvents(response.events);
      setRejections(response.rejections);
      setFiles(response.files);
      await refreshWorkspace();
      await loadDocumentCollections(session, selectedDocumentId);
    }, "Ciclo fiscal sincronizado com o ambiente oficial.");
  }

  async function reconcileDocument() {
    if (!session || !selectedDocumentId) {
      return;
    }

    await runAction("reconcile-document", async () => {
      await requestNfseApi<{ item: NfseDocumentRecord }>(
        session,
        `/v1/finance/nfse/documents/${selectedDocumentId}/reconcile`,
        {
          body: JSON.stringify({}),
          method: "POST",
        },
      );
      await loadDocumentCollections(session, selectedDocumentId);
      await refreshWorkspace();
    }, "Conciliacao fiscal, financeira e operacional atualizada.");
  }

  async function processPendingJobs() {
    if (!session) {
      return;
    }

    await runAction("process-jobs", async () => {
      await requestNfseApi<{ processed: number }>(session, "/v1/finance/nfse/jobs/process", {
        body: JSON.stringify({}),
        method: "POST",
      });
      await refreshWorkspace();
    }, "Fila local de consulta processada.");
  }

  async function selectDocument(documentId: string) {
    if (!documentId) {
      setSelectedDocumentId(null);
      setSelectedDocument(null);
      setEvents([]);
      setRemoteEvents([]);
      setRejections([]);
      setFiles([]);
      setLatestReconciliation(null);
      setDraft(draftDefault);
      return;
    }

    if (!session) {
      return;
    }

    setSelectedDocumentId(documentId);
    await runAction("select-document", async () => {
      await loadDocumentCollections(session, documentId);
    });
  }

  async function selectService(serviceId: string) {
    if (!serviceId) {
      setSelectedServiceId(null);
      setTaxableService(taxableServiceDefault);
      setDraft((current) => ({
        ...current,
        taxableServiceId: draftDefault.taxableServiceId,
      }));
      return;
    }

    setSelectedServiceId(serviceId);
    const found = services.find((item) => item.id === serviceId);

    if (found) {
      setTaxableService(found);
      setDraft((current) => ({
        ...current,
        taxableServiceId: found.id,
      }));
    }
  }

  async function handleFileDownload(file: NfseDocumentFileRecord) {
    if (!session || !selectedDocumentId) {
      return;
    }

    await runAction("download-file", async () => {
      const { blob, fileName } = await downloadDocumentFile(session, selectedDocumentId, file.id);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    }, `Arquivo ${file.fileRole} baixado com sucesso.`);
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionCard
        title="Sessao de homologacao"
        description="Esta fase usa a API real da NFS-e em homologacao/producao restrita. Producao permanece bloqueada. O token e usado apenas para as chamadas da API e nunca e exibido por inteiro."
        aside={<StatusPill status={session ? "Homologacao conectada" : "Sessao pendente"} />}
      >
        <div className="grid gap-5 lg:grid-cols-[1.5fr,1fr,1fr,auto]">
          <Field label="URL da API">
            <Input
              value={sessionForm.apiBaseUrl}
              onChange={(event) => updateSessionForm("apiBaseUrl", event.target.value)}
            />
          </Field>
          <Field label="Organizacao (header opcional)">
            <Input
              value={sessionForm.organizationId}
              onChange={(event) => updateSessionForm("organizationId", event.target.value)}
              placeholder="org-a"
            />
          </Field>
          <Field label="Bearer token">
            <Input
              type="password"
              value={sessionForm.accessToken}
              onChange={(event) => updateSessionForm("accessToken", event.target.value)}
              placeholder="Cole um token valido do backend/Auth"
            />
          </Field>
          <div className="flex items-end gap-3">
            <button className={buttonClass()} onClick={() => void connectSession()} disabled={busyAction !== null}>
              Conectar
            </button>
            <button
              className={buttonClass("secondary")}
              onClick={() => void refreshWorkspace()}
              disabled={!session || busyAction !== null}
            >
              Atualizar
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-[18px] border border-[#E7EEF5] bg-[#FBFDFF] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5F7D95]">Ambiente fiscal</p>
            <p className="mt-3 text-sm font-semibold text-[#12263A]">{describeEnvironment(settings.environment)}</p>
          </div>
          <div className="rounded-[18px] border border-[#E7EEF5] bg-[#FBFDFF] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5F7D95]">Token atual</p>
            <p className="mt-3 text-sm font-semibold text-[#12263A]">{maskAccessToken(sessionForm.accessToken)}</p>
          </div>
          <div className="rounded-[18px] border border-[#E7EEF5] bg-[#FBFDFF] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5F7D95]">Controles de fila</p>
            <button
              className={`${buttonClass("secondary")} mt-3 w-full`}
              onClick={() => void processPendingJobs()}
              disabled={!session || busyAction !== null}
            >
              Processar consultas pendentes
            </button>
          </div>
        </div>

        {feedback ? (
          <div className={`mt-5 rounded-[18px] border px-4 py-3 text-sm leading-7 ${feedbackClass(feedback.tone)}`}>
            {feedback.message}
          </div>
        ) : null}
      </SectionCard>

      <div className="order-2 grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          <SectionCard title="Configuracao fiscal NFS-e" description="Metadados nao secretos da empresa emissora e do leiaute aplicado.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Municipio emissor">
                <Input value={settings.municipalityName} onChange={(event) => updateSettings("municipalityName", event.target.value)} />
              </Field>
              <Field label="Codigo IBGE">
                <Input value={settings.municipalityCode} onChange={(event) => updateSettings("municipalityCode", event.target.value)} />
              </Field>
              <Field label="UF">
                <Input value={settings.stateCode} onChange={(event) => updateSettings("stateCode", event.target.value.toUpperCase())} />
              </Field>
              <Field label="Ambiente">
                <Select
                  value={settings.environment}
                  onChange={(event) => updateSettings("environment", event.target.value as NfseFiscalSettingsRecord["environment"])}
                  options={nfseEnvironmentValues.map((item) => ({ label: item, value: item }))}
                />
              </Field>
              <Field label="Versao do leiaute">
                <Input value={settings.layoutVersion} onChange={(event) => updateSettings("layoutVersion", event.target.value)} />
              </Field>
              <Field label="Status de validacao">
                <Select
                  value={settings.validationStatus}
                  onChange={(event) =>
                    updateSettings("validationStatus", event.target.value as NfseFiscalSettingsRecord["validationStatus"])
                  }
                  options={nfseValidationStatusValues.map((item) => ({ label: item, value: item }))}
                />
              </Field>
              <Field label="Serie DPS/NFS-e">
                <Input value={settings.documentSeries} onChange={(event) => updateSettings("documentSeries", event.target.value)} />
              </Field>
              <Field label="Proximo numero previsto">
                <Input value={settings.nextNumberPreview} onChange={(event) => updateSettings("nextNumberPreview", event.target.value)} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Referencia documental">
                  <Input
                    value={settings.documentationReference}
                    onChange={(event) => updateSettings("documentationReference", event.target.value)}
                  />
                </Field>
              </div>
            </div>

            <div className="mt-5 rounded-[18px] border border-[#E7EEF5] bg-[#FBFDFF] p-4 text-sm leading-7 text-[#64748B]">
              Referencias seguras configuradas no backend: certificado{" "}
              <strong>{settings.certificateReference ? "presente" : "pendente"}</strong> e credencial{" "}
              <strong>{settings.credentialReference ? "presente" : "pendente"}</strong>. Nenhum segredo e exibido nesta tela.
            </div>

            <div className="mt-5 flex justify-end">
              <button className={buttonClass()} onClick={() => void saveSettings()} disabled={!session || busyAction !== null}>
                Salvar configuracao fiscal
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Prestador do servico" description="Cadastro fiscal do emissor usado para snapshots na hora da preparacao.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Razao social">
                <Input value={providerProfile.legalName} onChange={(event) => updateProvider("legalName", event.target.value)} />
              </Field>
              <Field label="Nome fantasia">
                <Input value={providerProfile.tradeName} onChange={(event) => updateProvider("tradeName", event.target.value)} />
              </Field>
              <Field label="CNPJ" error={providerErrors.documentNumber}>
                <Input value={providerProfile.documentNumber} onChange={(event) => updateProvider("documentNumber", event.target.value)} />
              </Field>
              <Field label="Inscricao municipal" error={providerErrors.municipalRegistration}>
                <Input
                  value={providerProfile.municipalRegistration}
                  onChange={(event) => updateProvider("municipalRegistration", event.target.value)}
                />
              </Field>
              <Field label="Regime tributario">
                <Input value={providerProfile.taxRegime} onChange={(event) => updateProvider("taxRegime", event.target.value)} />
              </Field>
              <Field label="CNAE">
                <Input value={providerProfile.cnaeCode} onChange={(event) => updateProvider("cnaeCode", event.target.value)} />
              </Field>
              <Field label="E-mail fiscal">
                <Input value={providerProfile.email} onChange={(event) => updateProvider("email", event.target.value)} type="email" />
              </Field>
              <Field label="Telefone">
                <Input value={providerProfile.phone} onChange={(event) => updateProvider("phone", event.target.value)} />
              </Field>
              <Field label="CEP">
                <Input value={providerProfile.postalCode} onChange={(event) => updateProvider("postalCode", event.target.value)} />
              </Field>
              <Field label="Logradouro">
                <Input value={providerProfile.street} onChange={(event) => updateProvider("street", event.target.value)} />
              </Field>
              <Field label="Numero">
                <Input value={providerProfile.number} onChange={(event) => updateProvider("number", event.target.value)} />
              </Field>
              <Field label="Bairro">
                <Input value={providerProfile.neighborhood} onChange={(event) => updateProvider("neighborhood", event.target.value)} />
              </Field>
            </div>

            <div className="mt-5 flex justify-end">
              <button className={buttonClass()} onClick={() => void saveProviderProfile()} disabled={!session || busyAction !== null}>
                Salvar prestador
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Tomador do servico" description="Dados fiscais minimos do tomador suportado nesta fase.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Identificador interno do cliente">
                <Input value={clientProfile.clientId} onChange={(event) => updateClient("clientId", event.target.value)} />
              </Field>
              <Field label="Perfil do tomador">
                <Select
                  value={clientProfile.personType}
                  onChange={(event) => updateClient("personType", event.target.value as ClientFiscalProfileInput["personType"])}
                  options={fiscalPersonTypeValues.map((item) => ({ label: item, value: item }))}
                />
              </Field>
              <Field label="Nome / razao social">
                <Input value={clientProfile.legalName} onChange={(event) => updateClient("legalName", event.target.value)} />
              </Field>
              <Field label="Documento" error={clientErrors.documentNumber}>
                <Input value={clientProfile.documentNumber} onChange={(event) => updateClient("documentNumber", event.target.value)} />
              </Field>
              <Field label="E-mail">
                <Input value={clientProfile.email} onChange={(event) => updateClient("email", event.target.value)} type="email" />
              </Field>
              <Field label="Telefone">
                <Input value={clientProfile.phone} onChange={(event) => updateClient("phone", event.target.value)} />
              </Field>
              <Field label="CEP" error={clientErrors.postalCode}>
                <Input value={clientProfile.postalCode ?? ""} onChange={(event) => updateClient("postalCode", event.target.value)} />
              </Field>
              <Field label="Logradouro" error={clientErrors.street}>
                <Input value={clientProfile.street ?? ""} onChange={(event) => updateClient("street", event.target.value)} />
              </Field>
              <Field label="Numero">
                <Input value={clientProfile.number ?? ""} onChange={(event) => updateClient("number", event.target.value)} />
              </Field>
              <Field label="Bairro">
                <Input value={clientProfile.neighborhood ?? ""} onChange={(event) => updateClient("neighborhood", event.target.value)} />
              </Field>
              <Field label="Municipio">
                <Input value={clientProfile.municipalityName} onChange={(event) => updateClient("municipalityName", event.target.value)} />
              </Field>
              <Field label="Codigo IBGE" error={clientErrors.municipalityCode}>
                <Input value={clientProfile.municipalityCode ?? ""} onChange={(event) => updateClient("municipalityCode", event.target.value)} />
              </Field>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                className={buttonClass("secondary")}
                onClick={() => session && void loadClientProfile(session, clientProfile.clientId)}
                disabled={!session || busyAction !== null}
              >
                Recarregar tomador
              </button>
              <button className={buttonClass()} onClick={() => void saveClientProfile()} disabled={!session || busyAction !== null}>
                Salvar tomador
              </button>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6 xl:col-span-5">
          <SectionCard title="Servico tributavel" description="Configuracao municipal versionada e vinculada ao documento preparado.">
            <div className="space-y-4">
              <Field label="Servico salvo">
                <Select
                  value={selectedServiceId ?? ""}
                  onChange={(event) => void selectService(event.target.value)}
                  options={[
                    { label: "Novo servico", value: "" },
                    ...services.map((item) => ({
                      label: `${item.name} (${item.version})`,
                      value: item.id,
                    })),
                  ]}
                />
              </Field>
              <Field label="Codigo interno">
                <Input value={taxableService.code} onChange={(event) => updateService("code", event.target.value)} />
              </Field>
              <Field label="Nome">
                <Input value={taxableService.name} onChange={(event) => updateService("name", event.target.value)} />
              </Field>
              <Field label="Descricao padrao">
                <TextArea
                  rows={3}
                  value={taxableService.defaultDescription}
                  onChange={(event) => updateService("defaultDescription", event.target.value)}
                />
              </Field>
              <Field label="Item da lista" error={serviceErrors.listServiceItem}>
                <Input value={taxableService.listServiceItem} onChange={(event) => updateService("listServiceItem", event.target.value)} />
              </Field>
              <Field label="Codigo municipal" error={serviceErrors.municipalServiceCode}>
                <Input
                  value={taxableService.municipalServiceCode}
                  onChange={(event) => updateService("municipalServiceCode", event.target.value)}
                />
              </Field>
              <Field label="Codigo nacional" error={serviceErrors.nationalTaxationCode}>
                <Input
                  value={taxableService.nationalTaxationCode}
                  onChange={(event) => updateService("nationalTaxationCode", event.target.value)}
                />
              </Field>
              <Field label="Aliquota ISS">
                <Input value={taxableService.issRate} onChange={(event) => updateService("issRate", event.target.value)} />
              </Field>
              <Field label="Origem da aliquota" error={serviceErrors.issRateOrigin}>
                <Select
                  value={taxableService.issRateOrigin}
                  onChange={(event) => updateService("issRateOrigin", event.target.value as TaxableServiceInput["issRateOrigin"])}
                  options={taxRuleOriginValues.map((item) => ({ label: item, value: item }))}
                />
              </Field>
            </div>

            <div className="mt-5 flex justify-end">
              <button className={buttonClass()} onClick={() => void saveTaxableService()} disabled={!session || busyAction !== null}>
                Salvar servico tributavel
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Preparacao e emissao do documento" description="Criacao, atualizacao, transmissao, consulta e download de arquivos autorizados por tenant.">
            <div className="space-y-4">
              <Field label="Documento selecionado">
                <Select
                  value={selectedDocumentId ?? ""}
                  onChange={(event) => void selectDocument(event.target.value)}
                  options={[
                    { label: "Novo documento", value: "" },
                    ...documents.map((item) => ({
                      label: `${describeDocumentStatus(item)} - ${item.id}`,
                      value: item.id,
                    })),
                  ]}
                />
              </Field>
              <Field label="Competencia">
                <Input value={draft.competenceDate} onChange={(event) => updateDraft("competenceDate", event.target.value)} type="date" />
              </Field>
              <Field label="Data do servico">
                <Input value={draft.serviceDate} onChange={(event) => updateDraft("serviceDate", event.target.value)} type="date" />
              </Field>
              <Field label="Data pretendida de emissao">
                <Input
                  value={draft.intendedIssueDate}
                  onChange={(event) => updateDraft("intendedIssueDate", event.target.value)}
                  type="date"
                />
              </Field>
              <Field label="Descricao fiscal">
                <TextArea rows={4} value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} />
              </Field>
              <Field label="Valor do servico">
                <Input value={draft.amounts.serviceAmount} onChange={(event) => updateDraftAmount("serviceAmount", event.target.value)} />
              </Field>
              <Field label="Desconto incondicionado">
                <Input value={draft.amounts.discountAmount} onChange={(event) => updateDraftAmount("discountAmount", event.target.value)} />
              </Field>
              <Field label="Deducao">
                <Input value={draft.amounts.deductionAmount} onChange={(event) => updateDraftAmount("deductionAmount", event.target.value)} />
              </Field>
              <Field label="Origem do calculo tributario">
                <Select
                  value={draft.taxes.calculationOrigin}
                  onChange={(event) =>
                    updateDraftTax("calculationOrigin", event.target.value as NfseDraftInput["taxes"]["calculationOrigin"])
                  }
                  options={taxRuleOriginValues.map((item) => ({ label: item, value: item }))}
                />
              </Field>
              <Field label="Aliquota ISS aplicada">
                <Input value={draft.taxes.issRate} onChange={(event) => updateDraftTax("issRate", event.target.value)} />
              </Field>
              <Field label="Valor ISS">
                <Input value={draft.taxes.issAmount} onChange={(event) => updateDraftTax("issAmount", event.target.value)} />
              </Field>
              <Field label="Observacoes internas">
                <TextArea rows={3} value={draft.notes ?? ""} onChange={(event) => updateDraft("notes", event.target.value)} />
              </Field>
            </div>

            <div className="mt-5 grid gap-3">
              <button className={buttonClass()} onClick={() => void saveDocument()} disabled={!session || busyAction !== null}>
                {selectedDocumentId && selectedDocumentCanEdit ? "Atualizar documento selecionado" : "Criar novo documento"}
              </button>
              <button className={buttonClass("secondary")} onClick={() => void issueDocument()} disabled={!session || !canIssue || busyAction !== null}>
                Emitir em homologacao
              </button>
              <button className={buttonClass("secondary")} onClick={() => void syncDocument()} disabled={!session || !canSync || busyAction !== null}>
                Sincronizar ciclo fiscal
              </button>
              <button
                className={buttonClass("secondary")}
                onClick={() => void reconcileDocument()}
                disabled={!canReconcile || busyAction !== null}
              >
                Conciliar com financeiro e operacao
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Documento selecionado" description="Motivos de bloqueio, historico local, eventos oficiais e arquivos privados da emissao.">
            {selectedDocument ? (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[18px] border border-[#E7EEF5] bg-[#FBFDFF] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5F7D95]">Status</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <StatusPill status={describeDocumentStatus(selectedDocument)} />
                      <span className="text-sm text-[#64748B]">Validacao: {selectedDocument.validationStatus}</span>
                    </div>
                    {selectedDocument.cancelledReasonText ? (
                      <p className="mt-3 text-sm leading-7 text-[#B42318]">
                        Cancelamento detectado: {selectedDocument.cancelledReasonText}
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-[18px] border border-[#E7EEF5] bg-[#FBFDFF] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5F7D95]">Retorno oficial</p>
                    <p className="mt-3 text-sm leading-7 text-[#12263A]">
                      Chave: {selectedDocument.accessKey ?? "Aguardando retorno oficial"}
                    </p>
                    <p className="text-sm leading-7 text-[#64748B]">
                      Verificacao: {selectedDocument.verificationCode ?? "Nao disponivel"}
                    </p>
                    <p className="text-sm leading-7 text-[#64748B]">
                      Ultima sincronizacao de ciclo: {formatDateTime(selectedDocument.lifecycleSyncedAt)}
                    </p>
                  </div>
                </div>

                <div className="rounded-[18px] border border-[#E7EEF5] bg-[#FBFDFF] p-4">
                  <p className="text-sm font-semibold text-[#12263A]">Por que o documento ainda nao esta apto ou autorizado</p>
                  <div className="mt-3 space-y-2">
                    {selectedDocument.readiness.issues.length === 0 ? (
                      <p className="text-sm leading-7 text-[#1F8D53]">
                        Documento com validacao fiscal completa. Quando houver retorno oficial, o status muda para autorizado.
                      </p>
                    ) : (
                      selectedDocument.readiness.issues.map((issue) => (
                        <div key={`${issue.source}-${issue.code}-${issue.field}`} className="rounded-[14px] bg-white px-4 py-3 text-sm leading-7 text-[#64748B]">
                          <strong className="text-[#12263A]">{issue.source}:</strong> {issue.message}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-3">
                  <div className="rounded-[18px] border border-[#E7EEF5] bg-[#FBFDFF] p-4">
                    <p className="text-sm font-semibold text-[#12263A]">Eventos locais</p>
                    <div className="mt-3 space-y-3">
                      {events.length === 0 ? (
                        <p className="text-sm leading-7 text-[#64748B]">Nenhum evento registrado ainda.</p>
                      ) : (
                        events.map((event) => (
                          <div key={event.id} className="rounded-[14px] bg-white px-4 py-3 text-sm leading-7 text-[#64748B]">
                            <p className="font-semibold text-[#12263A]">{event.eventType}</p>
                            <p>{formatDateTime(event.createdAt)}</p>
                            <p>
                              {event.statusFrom ?? "sem status"} {"->"} {event.statusTo ?? "sem status"}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-[#E7EEF5] bg-[#FBFDFF] p-4">
                    <p className="text-sm font-semibold text-[#12263A]">Eventos oficiais consultados</p>
                    <div className="mt-3 space-y-3">
                      {remoteEvents.length === 0 ? (
                        <p className="text-sm leading-7 text-[#64748B]">
                          Nenhum evento oficial adicional foi sincronizado ainda.
                        </p>
                      ) : (
                        remoteEvents.map((remoteEvent) => (
                          <div key={remoteEvent.id} className="rounded-[14px] bg-white px-4 py-3 text-sm leading-7 text-[#64748B]">
                            <p className="font-semibold text-[#12263A]">
                              {remoteEvent.eventName ?? "Evento oficial"}
                              {remoteEvent.eventTypeCode ? ` - tipo ${remoteEvent.eventTypeCode}` : ""}
                            </p>
                            <p>
                              {remoteEvent.effect === "cancelled"
                                ? "Evento oficial com efeito de cancelamento detectado."
                                : `Evento sincronizado em ${formatDateTime(remoteEvent.occurredAt ?? remoteEvent.createdAt)}.`}
                            </p>
                            <p>Sequencia {remoteEvent.eventSequence}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-[#E7EEF5] bg-[#FBFDFF] p-4">
                    <p className="text-sm font-semibold text-[#12263A]">Arquivos</p>
                    <div className="mt-3 space-y-3">
                      {files.length === 0 ? (
                        <p className="text-sm leading-7 text-[#64748B]">Nenhum XML/PDF disponivel ainda.</p>
                      ) : (
                        files.map((file) => (
                          <div key={file.id} className="rounded-[14px] bg-white px-4 py-3 text-sm leading-7 text-[#64748B]">
                            <p className="font-semibold text-[#12263A]">{file.fileRole}</p>
                            <p>
                              {file.mimeType} - {formatByteSize(file.byteSize)}
                            </p>
                            <p>{file.isLocked ? "Bloqueado para sobrescrita" : "Arquivo ainda editavel"}</p>
                            <button
                              className={`${buttonClass("secondary")} mt-3 w-full`}
                              onClick={() => void handleFileDownload(file)}
                              disabled={!session || busyAction !== null}
                            >
                              Baixar arquivo
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-[18px] border border-[#E7EEF5] bg-[#FBFDFF] p-4">
                  <p className="text-sm font-semibold text-[#12263A]">Rejeicoes estruturadas</p>
                  <div className="mt-3 space-y-3">
                    {rejections.length === 0 ? (
                      <p className="text-sm leading-7 text-[#64748B]">Nenhuma rejeicao registrada para este documento.</p>
                    ) : (
                      rejections.map((rejection) => (
                        <div key={rejection.id} className="rounded-[14px] bg-white px-4 py-3 text-sm leading-7 text-[#64748B]">
                          <p className="font-semibold text-[#12263A]">
                            {rejection.code}
                            {rejection.field ? ` - ${rejection.field}` : ""}
                          </p>
                          <p>{rejection.message}</p>
                          <p>Tentativa {rejection.attempt}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[18px] border border-[#E7EEF5] bg-[#FBFDFF] p-4">
                  <p className="text-sm font-semibold text-[#12263A]">Conciliacao</p>
                  <div className="mt-3 space-y-3">
                    {latestReconciliation ? (
                      <div className="rounded-[14px] bg-white px-4 py-3 text-sm leading-7 text-[#64748B]">
                        <p className="font-semibold text-[#12263A]">Status: {latestReconciliation.status}</p>
                        <p>Atualizado em {formatDateTime(latestReconciliation.createdAt)}</p>
                        <p>Cobranca: {latestReconciliation.chargeId ?? "Nao vinculada"}</p>
                        <p>Processo: {latestReconciliation.processId ?? "Nao vinculado"}</p>
                        {latestReconciliation.issues.length === 0 ? (
                          <p className="text-[#1F8D53]">Sem divergencias detectadas.</p>
                        ) : (
                          latestReconciliation.issues.map((issue) => (
                            <p key={issue.code}>
                              {issue.severity.toUpperCase()}: {issue.message}
                            </p>
                          ))
                        )}
                      </div>
                    ) : (
                      <p className="text-sm leading-7 text-[#64748B]">Nenhuma conciliacao executada ainda.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-7 text-[#64748B]">
                Crie ou selecione um documento para acompanhar status, rejeicoes, eventos, conciliacao e arquivos privados.
              </p>
            )}
          </SectionCard>

          <SectionCard title="Matriz oficial de eventos" description="Capacidades identificadas no adapter nacional e no material oficial consultado.">
            <div className="space-y-3">
              {eventMatrix.length === 0 ? (
                <p className="text-sm leading-7 text-[#64748B]">Conecte a sessao para carregar a matriz oficial de eventos.</p>
              ) : (
                eventMatrix.map((item) => (
                  <div key={item.key} className="rounded-[18px] border border-[#E7EEF5] bg-[#FBFDFF] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[#12263A]">{item.title}</p>
                      <StatusPill
                        status={
                          item.supportStatus === "implemented"
                            ? "Implementado"
                            : item.supportStatus === "supported_not_configured"
                              ? "Suportado, nao configurado"
                              : "Nao suportado"
                        }
                      />
                    </div>
                    <p className="mt-2 text-sm leading-7 text-[#64748B]">
                      {item.officialEndpoint} - {item.method} - {item.environment === "homologation_only" ? "homologacao" : "depende de configuracao"}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[#64748B]">{item.notes}</p>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard title="Pendencias por origem" description="Conferencias rapidas para destravar a emissao em homologacao.">
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries({
                settings: "Configuracao",
                provider: "Prestador",
                client: "Tomador",
                service: "Servico",
                document: "Documento",
              }).map(([source, label]) => (
                <div key={source} className="rounded-[18px] border border-[#E7EEF5] bg-[#FBFDFF] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5F7D95]">{label}</p>
                  <p className="mt-3 text-sm font-semibold text-[#12263A]">
                    {groupedIssues[source as keyof typeof groupedIssues].length === 0
                      ? "Sem pendencias"
                      : `${groupedIssues[source as keyof typeof groupedIssues].length} ajuste(s)`}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="order-3">
        <SectionCard
          title="Acompanhamento da emissao"
          description="Os documentos ficam em rascunho, prontos, em processamento, autorizados, cancelados ou rejeitados. Nenhum protocolo ficticio e mostrado."
          aside={<StatusPill status={selectedDocument ? describeDocumentStatus(selectedDocument) : "Sem documento"} />}
        >
          <div className="grid gap-4 lg:grid-cols-5">
            {[
              "Rascunho bloqueado",
              "Pronto para emissao",
              "Fila de emissao",
              "Em processamento",
              "Autorizada",
              "Cancelada",
              "Rejeitada",
              "Aguardando consulta",
            ].map((statusLabel) => (
              <div key={statusLabel} className="rounded-[18px] border border-[#E7EEF5] bg-[#FBFDFF] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5F7D95]">{statusLabel}</p>
                <p className="mt-3 text-2xl font-semibold text-[#12263A]">{documentCounts[statusLabel] ?? 0}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[18px] border border-[#E7EEF5] bg-[#FBFDFF] p-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill status={settings.environment === "homologation" ? "Homologacao" : "Producao bloqueada"} />
              <p className="text-sm leading-7 text-[#64748B]">
                A transmissao so e liberada quando o documento estiver <strong>ready_for_issue</strong> e o ambiente permanecer em homologacao. Cancelamento e substituicao aparecem nesta fase como capacidades oficiais claramente separadas entre implementadas e ainda nao configuradas.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
