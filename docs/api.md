# APIs

## Padrao

- Prefixo: `/v1`
- Formato: JSON
- Autenticacao: `Authorization: Bearer <access-token>`
- Contexto de organizacao selecionada: `x-organization-id`
- O backend resolve `userId`, `organizationId`, `role` e `permissions` a partir do token valido e do membership persistido.

## Saude

- `GET /health`

## Financeiro

- `GET /v1/finance/overview`
- `GET /v1/finance/charges`
- `POST /v1/finance/charges`
- `GET /v1/finance/nfse/settings`
- `PUT /v1/finance/nfse/settings`
- `GET /v1/finance/nfse/provider-profile`
- `PUT /v1/finance/nfse/provider-profile`
- `GET /v1/finance/nfse/clients/:clientId/fiscal-profile`
- `PUT /v1/finance/nfse/clients/:clientId/fiscal-profile`
- `GET /v1/finance/nfse/services`
- `POST /v1/finance/nfse/services`
- `PATCH /v1/finance/nfse/services/:serviceId`
- `GET /v1/finance/nfse/documents`
- `GET /v1/finance/nfse/documents/:documentId`
- `POST /v1/finance/nfse/documents`
- `PATCH /v1/finance/nfse/documents/:documentId`
- `POST /v1/finance/nfse/documents/:documentId/issue`
- `POST /v1/finance/nfse/documents/:documentId/sync`
- `POST /v1/finance/nfse/documents/:documentId/reconcile`
- `GET /v1/finance/nfse/documents/:documentId/remote-events`
- `GET /v1/finance/nfse/documents/:documentId/events`
- `GET /v1/finance/nfse/documents/:documentId/rejections`
- `GET /v1/finance/nfse/documents/:documentId/files`
- `GET /v1/finance/nfse/documents/:documentId/files/:fileId/download`
- `GET /v1/finance/nfse/event-matrix`
- `POST /v1/finance/nfse/jobs/process`
- `GET /v1/finance/nfse/history`

### Escopo da Fase 4

- A API fiscal prepara documentos em `draft` ou `ready_for_issue`, transmite em `homologation`/`producao restrita` e nunca marca autorizacao sem retorno oficial.
- O ciclo local sincroniza eventos oficiais consultaveis e pode mudar um documento `authorized` para `cancelled` somente quando houver evento remoto compativel.
- NFS-e `authorized` e `cancelled` sao imutaveis para edicao direta; correcoes passam por fluxo fiscal autorizado.
- Retornos, rejeicoes, eventos locais, eventos oficiais, XML e DANFSe/PDF ficam persistidos por tenant e so podem ser baixados por usuario autorizado.
- Timeout ou fluxo assincrono exigem consulta posterior antes de qualquer nova transmissao.
- A conciliacao entre documento fiscal, cobranca, pagamento e processo operacional fica registrada em historico proprio.
- Producao real permanece bloqueada nesta fase, mesmo que a configuracao exista.

### Exemplo de cobranca

```json
{
  "processId": "IMP-2026-0048",
  "clientId": "cli-orion",
  "paymentMethod": "pix",
  "currency": "BRL",
  "amount": 18450,
  "dueDate": "2026-06-05",
  "installments": 1
}
```

## Operacional

- `GET /v1/operations/overview`
- `GET /v1/operations/processes`
- `GET /v1/operations/awbs`
- `POST /v1/operations/awbs`

### Exemplo de AWB

```json
{
  "processId": "IMP-2026-0048",
  "awbNumber": "057-12345675",
  "airline": "LATAM Cargo",
  "origin": "FRA",
  "destination": "VCP",
  "weightKg": 830.5,
  "volumeM3": 4.2,
  "cargoValue": 126000,
  "incoterm": "CIP"
}
```

## Cadastros e cambio

- `GET /v1/reference/clients`
- `GET /v1/reference/fx-rates`

## Relatorios

- `GET /v1/reports/summary`

## Administracao

- `GET /v1/admin/rbac/matrix`
- `GET /v1/admin/audit`

## Regras de autorizacao

- Financeiro acessa endpoints financeiros e relatorios consolidados.
- Operacional acessa processos, documentos, AWB e agenda.
- Comercial acessa visao comercial e clientes, sem manutencao financeira.
- Diretor e administrador possuem visao transversal.

## Evolucao recomendada

- paginação padrao para listagens
- filtros por periodo, cliente e status
- webhooks assinados
- idempotencia em emissao fiscal e cobrancas
- upload assinado para documentos
