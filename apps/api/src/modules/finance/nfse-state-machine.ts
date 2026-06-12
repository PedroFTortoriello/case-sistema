import type { NfseDocumentStatus, NfseTransmissionState } from "@case-sistema/contracts";
import { BadRequestError } from "../../shared/errors/app-error";

type TransitionMap = Record<NfseDocumentStatus, NfseDocumentStatus[]>;

const allowedTransitions: TransitionMap = {
  authorized: ["authorized", "cancelled"],
  cancelled: ["cancelled"],
  draft: ["draft", "ready_for_issue"],
  failed: ["draft", "ready_for_issue", "queued", "failed"],
  queued: ["queued", "authorized", "failed"],
  ready_for_issue: ["draft", "ready_for_issue", "queued"],
};

export function assertLifecycleTransition(params: {
  eventType: string;
  nextStatus: NfseDocumentStatus;
  previousStatus: NfseDocumentStatus;
}) {
  const allowed = allowedTransitions[params.previousStatus] ?? [];

  if (!allowed.includes(params.nextStatus)) {
    throw new BadRequestError(
      `A transicao fiscal ${params.previousStatus} -> ${params.nextStatus} nao e permitida para o evento ${params.eventType}.`,
    );
  }
}

export function isImmutableFiscalStatus(status: NfseDocumentStatus) {
  return status === "authorized" || status === "cancelled";
}

export function canEditPreparedDocument(params: {
  pendingStatusCheck: boolean;
  status: NfseDocumentStatus;
  transmissionState: NfseTransmissionState;
}) {
  if (isImmutableFiscalStatus(params.status)) {
    return false;
  }

  if (params.pendingStatusCheck) {
    return false;
  }

  return !["requested", "processing", "timeout_pending_query", "cancel_requested"].includes(params.transmissionState);
}
