export const executiveMetrics = [
  {
    label: "Receita mensal",
    value: "R$ 742,1 mil",
    delta: "+12,4%",
    description: "Comparado a abril com carteira consolidada em 18 clientes ativos.",
  },
  {
    label: "Operacoes em aberto",
    value: "37",
    delta: "5 criticas",
    description: "Importacao, exportacao e desembaraco acompanhados em tempo real.",
  },
  {
    label: "Contas a receber",
    value: "R$ 584,2 mil",
    delta: "14 vencendo",
    description: "Pipeline financeiro com aging, cobrancas e historico de contato.",
  },
  {
    label: "Cambio medio",
    value: "USD 5,47",
    delta: "PTAX + spread",
    description: "Taxa oficial congelada por cobranca, com tabela comercial por cliente.",
  },
] as const;

export const moduleCards = [
  {
    href: "/financeiro",
    title: "Financeiro",
    accent: "Finance",
    description:
      "Cobrancas, NFS-e, fluxo de caixa, receita mensal, aging, cambio e historico de faturamento.",
  },
  {
    href: "/operacional",
    title: "Operacional",
    accent: "Ops",
    description:
      "Processos de importacao/exportacao, tracking, timeline, follow-up, agenda e documentos.",
  },
  {
    href: "/admin/rbac",
    title: "RBAC e auditoria",
    accent: "Admin",
    description:
      "Perfis, permissoes, trilha de auditoria, multiempresa e governanca para escalar com seguranca.",
  },
  {
    href: "/processos/IMP-2026-0048",
    title: "Detalhe de processo",
    accent: "Trace",
    description:
      "Visao ponta a ponta entre operacional e financeiro, com AWB, documentos e cobrancas vinculadas.",
  },
] as const;

export const deliverables = [
  "Arquitetura modular em Clean Architecture / Hexagonal no backend.",
  "Modelagem Supabase preparada para multiempresa e RLS.",
  "Wireframes, fluxos, APIs e roadmap em documentos versionados.",
  "Fundacao pronta para integrar NFS-e, cambio, e-mail, ERP e webhooks.",
] as const;

export const financeMetrics = [
  {
    label: "Cobrancas emitidas",
    value: "92",
    meta: "24 por PIX, 51 boleto, 17 internacionais",
  },
  {
    label: "NFS-e pendentes",
    value: "6",
    meta: "4 aguardando envio e 2 aguardando reprocessamento",
  },
  {
    label: "Fluxo projetado",
    value: "R$ 801,4 mil",
    meta: "Estimativa de junho com carteira atual",
  },
  {
    label: "Faturamento pronto",
    value: "14 ops",
    meta: "Documentos completos e liberados para cobranca",
  },
] as const;

export const financeOverviewCards = [
  {
    href: "/financeiro/cobrancas",
    title: "Cobrancas",
    description: "Titulos, vencimentos, status e acoes financeiras por processo.",
  },
  {
    href: "/financeiro/nfse",
    title: "NFS-e",
    description: "Emissao, cancelamento, historico fiscal e retorno do ambiente nacional por municipio.",
  },
  {
    href: "/financeiro/cambio",
    title: "Cambio",
    description: "Taxa oficial, taxa do cliente, spread e congelamento por cobranca.",
  },
  {
    href: "/financeiro/emails",
    title: "E-mails",
    description: "Templates, envio em lote, historico e variaveis dinamicas por operacao.",
  },
] as const;

export const chargeQueue = [
  {
    client: "Orion Components",
    process: "IMP-2026-0048",
    method: "PIX",
    dueDate: "05/06/2026",
    amount: "R$ 18.450,00",
    status: "Aberto",
  },
  {
    client: "Blue Port Foods",
    process: "EXP-2026-0019",
    method: "Boleto",
    dueDate: "30/05/2026",
    amount: "USD 3.280,00",
    status: "Pago",
  },
  {
    client: "North Harbor Pharma",
    process: "IMP-2026-0039",
    method: "Link",
    dueDate: "27/05/2026",
    amount: "R$ 42.900,00",
    status: "Atrasado",
  },
] as const;

export const invoiceQueue = [
  {
    client: "Orion Components",
    service: "Despacho aduaneiro + coordenacao operacional",
    amount: "R$ 18.450,00",
    taxes: "ISS 2%",
    provider: "NFS-e Nacional / Indaiatuba",
    status: "Rascunho bloqueado",
  },
  {
    client: "Blue Port Foods",
    service: "Agenciamento de exportacao",
    amount: "R$ 9.260,00",
    taxes: "ISS 2%",
    provider: "NFS-e Nacional / Indaiatuba",
    status: "Pronto para emissao",
  },
] as const;

export const invoiceSummary = [
  {
    label: "Rascunhos bloqueados",
    value: "4",
    meta: "Cadastros ou configuracoes fiscais ainda impedem preparar o documento para emissao.",
  },
  {
    label: "Prontas para emissao",
    value: "18",
    meta: "Documentos completos e validados, mas ainda sem transmissao externa nesta fase.",
  },
  {
    label: "Reprocessar",
    value: "2",
    meta: "Pendencias de dados fiscais ou regras municipais ainda nao confirmadas.",
  },
] as const;

export const nfseConfigurationHighlights = [
  {
    label: "Municipio emissor",
    value: "Indaiatuba/SP",
    helper: "Codigo IBGE 3520506 para identificar o municipio emissor e consultar parametros municipais.",
  },
  {
    label: "Provider ativo",
    value: "NFS-e Nacional",
    helper: "O fluxo de emissao deve sair pelo portal/API nacional desde 01/01/2026.",
  },
  {
    label: "Ambientes",
    value: "Producao + restrito",
    helper: "Separar homologacao e producao com credenciais, certificados e trilhas independentes.",
  },
  {
    label: "Autenticacao",
    value: "Certificado digital",
    helper: "A orientacao municipal atual para integracao empresarial exige autenticacao com certificado digital.",
  },
  {
    label: "Identificacao fiscal",
    value: "CNPJ + CCM",
    helper: "Manter cadastro do prestador com CNPJ, inscricao municipal e regime tributario consolidados.",
  },
  {
    label: "Controle da DPS",
    value: "Serie + numero",
    helper: "A identificacao da DPS combina municipio IBGE, tipo de inscricao, documento federal, serie e numero.",
  },
] as const;

export const nfseOperationalRules = [
  "Desde 01/01/2026 o DEISS e o web service municipal deixaram de emitir NFS-e e importar RPS.",
  "Nesta fase o sistema apenas prepara o documento fiscal e valida sua completude, sem qualquer transmissao externa.",
  "Antes da Fase 3, sera necessario confirmar parametros municipais, convenios, aliquotas, retencoes e beneficios do contribuinte.",
  "A emissao por API nacional fica reservada para a fase seguinte, com certificado, numeração e adapter dedicados.",
  "Campos de chave, protocolo, XML e PDF existem apenas como reserva tecnica para evolucao posterior.",
] as const;

export const nfseIntegrationEndpoints = [
  {
    label: "API interna fase 2",
    value: "POST /v1/finance/nfse/documents",
    helper: "Prepara rascunho fiscal com snapshots e valida prontidao para emissao.",
  },
  {
    label: "Configuracao fiscal",
    value: "PUT /v1/finance/nfse/settings",
    helper: "Guarda municipio, ambiente, leiaute e referencia segura para futura credencial protegida.",
  },
  {
    label: "Prestador e tomador",
    value: "PUT /v1/finance/nfse/provider-profile",
    helper: "Mantem cadastro fiscal validado do prestador e do tomador por organizacao.",
  },
  {
    label: "Servico tributavel",
    value: "POST /v1/finance/nfse/services",
    helper: "Configura codigo municipal, item da lista, aliquota e versao fiscal do servico.",
  },
] as const;

export const nfseRequiredFieldGroups = [
  {
    title: "Cadastro fiscal do prestador",
    description: "Configuracao que precisa existir antes de qualquer emissao.",
    items: [
      "CNPJ do prestador e inscricao municipal (CCM).",
      "Municipio emissor (Indaiatuba/SP) e codigo IBGE 3520506.",
      "Regime tributario, inclusive Simples Nacional quando aplicavel.",
      "Certificado digital da empresa e ambiente ativo.",
      "Serie DPS, controle do proximo numero e responsavel tecnico.",
    ],
  },
  {
    title: "Tomador e local da prestacao",
    description: "Campos de cadastro e localizacao para suportar Brasil ou exterior.",
    items: [
      "CPF/CNPJ ou documento do tomador e razao social.",
      "E-mail, telefone e endereco completo; para exterior, pais, estado/provincia e cidade.",
      "Processo operacional vinculado e dados do intermediario quando houver.",
      "Municipio de incidencia do ISSQN ou indicacao de nao aplicacao em exportacao de servico.",
    ],
  },
  {
    title: "Servico e tributacao",
    description: "Bloco que define a regra fiscal da nota.",
    items: [
      "Descricao do servico e codigo de tributacao nacional.",
      "Codigo de tributacao complementar municipal quando parametrizado.",
      "Competencia, data da prestacao e natureza tributaria da operacao.",
      "Indicacao de beneficio municipal, deducao/reducao de base e exigibilidade quando aplicavel.",
    ],
  },
  {
    title: "Valores e retencoes",
    description: "Campos monetarios usados na validacao e no XML.",
    items: [
      "Valor do servico, descontos condicionados e incondicionados.",
      "ISSQN retido ou nao, incluindo o responsavel pela retencao.",
      "PIS, COFINS, IRRF, CSLL e CP/CPP quando houver retencao federal.",
      "Informacoes complementares e valor aproximado de tributos para o documento.",
    ],
  },
] as const;

export const fxBoard = [
  {
    currency: "USD",
    officialRate: "5,4721",
    clientRate: "5,5160",
    spread: "0,80%",
    source: "BCB/PTAX",
  },
  {
    currency: "EUR",
    officialRate: "6,1114",
    clientRate: "6,1848",
    spread: "1,20%",
    source: "BCB/PTAX",
  },
] as const;

export const fxPolicies = [
  "Taxa oficial puxada do provider base com historico imutavel.",
  "Spread customizado por cliente e politica comercial.",
  "Congelamento da taxa utilizada em cada cobranca emitida.",
  "Trilha completa para revisao, override e auditoria financeira.",
] as const;

export const financeEmailTemplates = [
  {
    name: "Aviso de vencimento",
    audience: "Financeiro do cliente",
    trigger: "D-2 do vencimento",
    lastSent: "24/05/2026 16:10",
    status: "Ativo",
  },
  {
    name: "Confirmacao de pagamento",
    audience: "Cliente + diretor financeiro",
    trigger: "Baixa automatica",
    lastSent: "24/05/2026 15:02",
    status: "Ativo",
  },
  {
    name: "Pendencia documental para faturar",
    audience: "Operacional + financeiro interno",
    trigger: "Status aguardando documentos",
    lastSent: "24/05/2026 11:48",
    status: "Ativo",
  },
] as const;

export const financeEmailVariables = [
  "{{cliente}}",
  "{{awb}}",
  "{{processo}}",
  "{{valor}}",
  "{{vencimento}}",
  "{{link_pagamento}}",
] as const;

export const emissionChecklists = {
  charge: [
    "Validar processo, cliente e centro de custo antes de emitir.",
    "Confirmar moeda, taxa cambial e valor liquido do titulo.",
    "Escolher template de comunicacao e canal de cobranca.",
  ],
  nfse: [
    "Validar cadastro do prestador com CNPJ, CCM, certificado e serie DPS ativa.",
    "Consultar parametros municipais de Indaiatuba antes de montar a DPS.",
    "Conferir tomador, municipio de incidencia, codigo tributacao nacional e codigo complementar.",
    "Revisar ISSQN, retencoes federais, descontos e informacoes complementares antes do envio.",
  ],
  fx: [
    "Comparar taxa oficial com politica comercial do cliente.",
    "Registrar validade da cotacao e spread aplicado.",
    "Definir se a taxa deve ficar congelada para a cobranca.",
  ],
  email: [
    "Selecionar template e variaveis dinamicas corretas.",
    "Conferir destinatarios, CC e anexos obrigatorios.",
    "Registrar contexto do processo antes do disparo.",
  ],
  process: [
    "Definir cliente, direcao da operacao e modal.",
    "Associar owners comercial, operacional e financeiro.",
    "Informar origem, destino, datas e incoterm.",
  ],
  awb: [
    "Vincular o AWB ao processo operacional correto.",
    "Conferir companhia, rota, peso, volume e valor da carga.",
    "Registrar datas criticas de emissao e entrega.",
  ],
  document: [
    "Escolher tipo documental e processo relacionado.",
    "Definir ownership, versao e observacoes de compliance.",
    "Preparar o upload e a trilha de validacao do arquivo.",
  ],
} as const;

export const operationalStages = [
  { label: "Em abertura", value: "6", helper: "novos processos e kick-off" },
  { label: "Documentacao", value: "12", helper: "coleta, upload e revisao" },
  { label: "Em transito", value: "11", helper: "tracking internacional" },
  { label: "Desembaraco", value: "5", helper: "janela critica atual" },
] as const;

export const processRows = [
  {
    id: "IMP-2026-0048",
    client: "Orion Components",
    modal: "Aereo",
    status: "Desembaraco",
    awb: "057-12345675",
    eta: "28/05/2026",
  },
  {
    id: "EXP-2026-0019",
    client: "Blue Port Foods",
    modal: "Aereo",
    status: "Em transito",
    awb: "957-55667788",
    eta: "29/05/2026",
  },
  {
    id: "IMP-2026-0039",
    client: "North Harbor Pharma",
    modal: "Aereo",
    status: "Documentacao",
    awb: "074-90887766",
    eta: "31/05/2026",
  },
] as const;

export const operationalTimeline = [
  {
    time: "08:40",
    title: "Invoice revisada e anexada",
    detail: "Processo IMP-2026-0048 recebeu nova versao da invoice do fornecedor alemao.",
  },
  {
    time: "10:15",
    title: "AWB emitido",
    detail: "House AWB 957-55667788 emitido para Blue Port Foods.",
  },
  {
    time: "14:05",
    title: "Alerta de SLA",
    detail: "Packing list pendente ha 18h para o embarque IMP-2026-0039.",
  },
] as const;

export const documentStack = [
  { type: "AWB", version: "v3", status: "Aprovado", owner: "Operacional" },
  { type: "Invoice", version: "v5", status: "Em revisao", owner: "Cliente" },
  { type: "Packing List", version: "v2", status: "Completo", owner: "Fornecedor" },
  { type: "Contrato", version: "v1", status: "Assinado", owner: "Comercial" },
] as const;

export const permissionMatrix = [
  {
    capability: "Ver dashboard geral",
    administrator: "Sim",
    financeiro: "Sim",
    operacional: "Sim",
    comercial: "Sim",
    diretor: "Sim",
  },
  {
    capability: "Gerir cobrancas",
    administrator: "Sim",
    financeiro: "Sim",
    operacional: "Nao",
    comercial: "Nao",
    diretor: "Sim",
  },
  {
    capability: "Emitir / cancelar NFS-e",
    administrator: "Sim",
    financeiro: "Sim",
    operacional: "Nao",
    comercial: "Nao",
    diretor: "Sim",
  },
  {
    capability: "Atualizar status operacional",
    administrator: "Sim",
    financeiro: "Nao",
    operacional: "Sim",
    comercial: "Nao",
    diretor: "Sim",
  },
  {
    capability: "Gerir usuarios e perfis",
    administrator: "Sim",
    financeiro: "Nao",
    operacional: "Nao",
    comercial: "Nao",
    diretor: "Sim",
  },
] as const;

export const processDetail = {
  title: "Processo importacao de componentes eletronicos",
  client: "Orion Components",
  status: "Desembaraco",
  incoterm: "CIP",
  route: "Frankfurt (FRA) -> Viracopos (VCP)",
  financialStatus: "Pronto para faturar",
  timeline: [
    "Abertura operacional concluida",
    "Documentos revisados com fornecedor",
    "AWB emitido e tracking iniciado",
    "Carga em solo e aguardando desembaraco",
    "Cobranca preparada pelo financeiro",
  ],
};
