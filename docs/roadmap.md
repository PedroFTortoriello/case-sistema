# Roadmap e Sprints

## MVP

### Objetivo

Colocar em producao o fluxo principal do negocio com rastreabilidade ponta a ponta.

### Escopo

- autenticacao e RBAC
- multiempresa basico
- cadastros principais
- processos de importacao/exportacao
- AWB
- documentos e versionamento
- cobrancas
- NFS-e
- dashboards financeiro e operacional
- auditoria e logs

## V1

- OCR documental
- automacao de e-mails
- relatorios exportaveis
- integracao ERP
- webhooks
- agenda operacional e SLA avancado
- cambio com regras por cliente

## Escala

- filas dedicadas
- observabilidade completa
- data mart de analytics
- automacoes com regras por tenant
- notificacoes omnichannel
- motor de permissao mais granular

## Sprints sugeridas

### Sprint 1

- foundation do monorepo
- auth, tenant e RBAC
- schema inicial Supabase
- shell do frontend

### Sprint 2

- cadastros base
- processos operacionais
- timeline e status
- anexos e versionamento

### Sprint 3

- AWB
- dashboard operacional
- agenda, alertas e follow-up

### Sprint 4

- cobrancas
- dashboard financeiro
- cambio e tabela por cliente

### Sprint 5

- integracao NFS-e
- historico fiscal
- PDF/XML

### Sprint 6

- relatorios
- exportacoes
- hardening de auditoria, logs e LGPD

## Riscos tecnicos prioritarios

- variacao de padrao fiscal por municipio
- storage documental e governanca de acesso
- conciliacao de cambio versus faturamento
- crescimento de regras cross-modulo sem eventos bem definidos

## Metricas de sucesso

- tempo medio de abertura a encerramento
- tempo medio de emissao fiscal
- taxa de retrabalho documental
- valor em aberto por aging
- SLA de follow-up
