export type NfseEventSupportStatus = "implemented" | "supported_not_configured" | "not_supported";

export type NfseEventMatrixItem = {
  environment: "homologation_only" | "homologation_when_configured";
  implementedInPhase4: boolean;
  key:
    | "issue"
    | "query_dps"
    | "query_nfse"
    | "query_events"
    | "cancel"
    | "substitute"
    | "requery"
    | "download_xml"
    | "download_danfse"
    | "cancel_fiscal_review";
  knownRules: string;
  localStatusEffects: string[];
  method: "GET" | "HEAD" | "POST";
  notes: string;
  officialEndpoint: string;
  requiredData: string[];
  supportStatus: NfseEventSupportStatus;
  title: string;
};

export const nfseNationalEventMatrix: NfseEventMatrixItem[] = [
  {
    environment: "homologation_only",
    implementedInPhase4: true,
    key: "issue",
    knownRules:
      "A API /nfse recebe uma DPS e pode rejeitar ou gerar a NFS-e de forma sincrona. O manual atual tambem descreve substituicao pelo mesmo endpoint quando a nova DPS informa uma chave de acesso ja existente.",
    localStatusEffects: ["ready_for_issue -> queued", "queued -> authorized", "queued -> failed"],
    method: "POST",
    notes: "Implementado com bloqueio explicito para production nesta fase.",
    officialEndpoint: "POST /nfse",
    requiredData: ["DPS assinada", "certificado digital cliente", "parametros municipais"],
    supportStatus: "implemented",
    title: "Emissao sincrona",
  },
  {
    environment: "homologation_only",
    implementedInPhase4: true,
    key: "query_dps",
    knownRules:
      "GET /dps/{id} retorna a chave de acesso e HEAD /dps/{id} informa se a NFS-e ja foi gerada. A consulta exige certificado valido e, no GET, o certificado deve corresponder a um ator do documento.",
    localStatusEffects: ["queued -> queued", "queued -> authorized", "queued -> failed"],
    method: "GET",
    notes: "Usado para reconsulta segura apos timeout ou processamento ambiguo.",
    officialEndpoint: "GET /dps/{id} e HEAD /dps/{id}",
    requiredData: ["identificador DPS", "certificado digital cliente"],
    supportStatus: "implemented",
    title: "Consulta por DPS",
  },
  {
    environment: "homologation_only",
    implementedInPhase4: true,
    key: "query_nfse",
    knownRules:
      "A API NFS-e exposta pela Sefin Nacional possui consulta pela chave de acesso. O retorno contem a NFS-e autorizada associada a chave informada.",
    localStatusEffects: ["authorized -> authorized", "cancelled -> cancelled"],
    method: "GET",
    notes: "Usado para recuperar novamente o XML autorizado de forma oficial.",
    officialEndpoint: "GET /nfse/{chaveAcesso}",
    requiredData: ["chave de acesso", "certificado digital cliente"],
    supportStatus: "implemented",
    title: "Consulta de NFS-e autorizada",
  },
  {
    environment: "homologation_only",
    implementedInPhase4: true,
    key: "query_events",
    knownRules:
      "O manual atual do ADN descreve consulta de eventos por chave de acesso. A API deve devolver os documentos fiscais de servico do tipo evento vinculados a NFS-e consultada.",
    localStatusEffects: ["authorized -> cancelled", "authorized -> authorized", "cancelled -> cancelled"],
    method: "GET",
    notes: "Implementado para sincronizar o ciclo de vida local com eventos oficiais ja registrados.",
    officialEndpoint: "GET /NFSe/{chaveAcesso}/Eventos",
    requiredData: ["chave de acesso", "certificado digital cliente"],
    supportStatus: "implemented",
    title: "Consulta de eventos oficiais",
  },
  {
    environment: "homologation_when_configured",
    implementedInPhase4: false,
    key: "cancel",
    knownRules:
      "O registro do evento de cancelamento depende do Anexo II de eventos e das parametrizacoes municipais sobre prazo, bloqueio e regras de aceite. O guia do emissor web indica motivo do cancelamento e justificativa.",
    localStatusEffects: ["authorized -> cancelled", "authorized -> authorized"],
    method: "POST",
    notes:
      "O endpoint oficial foi identificado, mas o leiaute especifico do pedido de evento nao foi ativado nesta fase sem validacao adicional do anexo de eventos.",
    officialEndpoint: "POST /nfse/{chaveAcesso}/eventos",
    requiredData: ["chave de acesso", "pedido de registro de evento assinado", "parametros municipais"],
    supportStatus: "supported_not_configured",
    title: "Cancelamento",
  },
  {
    environment: "homologation_when_configured",
    implementedInPhase4: false,
    key: "substitute",
    knownRules:
      "A substituicao no Sistema Nacional ocorre pelo envio de nova DPS contendo a chave de acesso da NFS-e original. O sistema cancela a nota original por evento de cancelamento por substituicao e gera a substituta.",
    localStatusEffects: ["authorized -> cancelled", "new draft -> authorized"],
    method: "POST",
    notes:
      "Identificado oficialmente no manual atual da API, mas a tag exata do Anexo I para informar a nota substituida nao foi ativada nesta fase sem validacao complementar.",
    officialEndpoint: "POST /nfse",
    requiredData: ["nova DPS assinada", "chave da NFS-e original", "parametros municipais"],
    supportStatus: "supported_not_configured",
    title: "Substituicao",
  },
  {
    environment: "homologation_only",
    implementedInPhase4: true,
    key: "requery",
    knownRules:
      "Quando a transmissao fica ambigua ou assicrona, o sistema deve consultar antes de retransmitir. Timeout nao pode gerar reenvio cego.",
    localStatusEffects: ["timeout_pending_query -> queued", "timeout_pending_query -> authorized", "timeout_pending_query -> failed"],
    method: "POST",
    notes: "Implementado como reconsulta do ciclo fiscal local sem gerar nova DPS.",
    officialEndpoint: "GET/HEAD /dps/{id} e GET /NFSe/{chaveAcesso}/Eventos",
    requiredData: ["documento com DPS reservado", "certificado digital cliente"],
    supportStatus: "implemented",
    title: "Reconsulta / reprocessamento seguro",
  },
  {
    environment: "homologation_only",
    implementedInPhase4: true,
    key: "download_xml",
    knownRules:
      "O XML autorizado pode ser recuperado pela consulta oficial da NFS-e e deve permanecer armazenado no tenant sem sobrescrita indevida.",
    localStatusEffects: ["authorized -> authorized", "cancelled -> cancelled"],
    method: "GET",
    notes: "Implementado com armazenamento privado e download autenticado por tenant.",
    officialEndpoint: "GET /nfse/{chaveAcesso}",
    requiredData: ["chave de acesso", "certificado digital cliente"],
    supportStatus: "implemented",
    title: "Download XML",
  },
  {
    environment: "homologation_when_configured",
    implementedInPhase4: true,
    key: "download_danfse",
    knownRules:
      "O DANFSe depende do servico oficial disponibilizado no ambiente configurado. Quando nao houver endpoint ativo, o documento permanece simplesmente indisponivel.",
    localStatusEffects: ["authorized -> authorized", "cancelled -> cancelled"],
    method: "GET",
    notes: "Implementado apenas quando a URL segura do DANFSe estiver configurada.",
    officialEndpoint: "GET DANFSe no ambiente nacional configurado",
    requiredData: ["chave de acesso", "certificado digital cliente", "endpoint DANFSe"],
    supportStatus: "implemented",
    title: "Download DANFSe/PDF",
  },
  {
    environment: "homologation_when_configured",
    implementedInPhase4: false,
    key: "cancel_fiscal_review",
    knownRules:
      "A solicitacao de analise fiscal para cancelamento e um procedimento contencioso manual quando o emitente nao consegue usar o evento normal de cancelamento segundo as regras do municipio emissor.",
    localStatusEffects: ["authorized -> authorized", "authorized -> cancelled"],
    method: "POST",
    notes:
      "Evento identificado oficialmente, mas nao ativado nesta fase por depender de fluxo contencioso e parametrizacao municipal adicional.",
    officialEndpoint: "POST /nfse/{chaveAcesso}/eventos",
    requiredData: ["chave de acesso", "pedido de analise fiscal assinado", "parametros municipais"],
    supportStatus: "supported_not_configured",
    title: "Solicitacao de cancelamento por analise fiscal",
  },
];
