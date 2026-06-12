# Integracoes

## Matriz de integracoes

| Integracao | Objetivo | Estrategia |
|---|---|---|
| NFS-e | emissao, cancelamento, consulta, XML/PDF | adapter fiscal versionado |
| Cambio | cotacao e historico | adapter de mercado com fallback |
| Microsoft 365 / Gmail | envio de e-mails e historico | OAuth + templates internos |
| ERP externo | espelhamento financeiro/contabil | webhooks + jobs de conciliacao |
| WhatsApp | notificacoes e follow-up | provedor desacoplado |
| Webhooks | integracao com parceiros | assinatura HMAC |

## NFS-e de Indaiatuba

### Decisao de arquitetura

Em `25/05/2026`, o desenho recomendado para Indaiatuba/SP e:

- `NationalNfseProvider` como provider ativo de emissao
- `DeissAbrasfProvider` apenas como legado de consulta/migracao, se ainda houver necessidade operacional

Motivos:

- O login oficial do DEISS informa que, desde `01/01/2026`, o DEISS deixou de emitir notas fiscais e importar RPS, e que o web service municipal tambem deixou de emitir NFS-e.
- O mesmo aviso orienta empresas a integrarem seus sistemas com o Ambiente da NFS-e Nacional, com autenticacao por certificado digital.
- A documentacao tecnica atual do Portal Nacional da NFS-e foi atualizada em `17/04/2026` e concentra os manuais, guias, anexos e XSDs de producao.

Em termos praticos, a integracao principal nao deve mais nascer acoplada ao layout antigo ABRASF municipal para emissao.

### Fluxo recomendado

1. Configurar por tenant o municipio emissor, o ambiente e o certificado digital.
2. Consultar os parametros municipais antes da emissao da DPS.
3. Montar a DPS com dados do prestador, tomador, servico, incidencia, valores e retencoes.
4. Enviar a DPS ao endpoint nacional `POST /nfse`.
5. Persistir o retorno completo: protocolo, rejeicoes, XML autorizado, DANFSE e eventos.
6. Expor consulta por chave de acesso e por identificador da DPS.
7. Tratar cancelamento, substituicao e demais eventos por integracao assinada.

### Campos que devem existir no ERP

#### Configuracao fiscal do prestador

- CNPJ
- inscricao municipal / CCM
- municipio emissor e codigo IBGE
- regime tributario
- ambiente nacional ativo
- certificado digital
- serie DPS
- numeracao DPS
- e-mail e telefone fiscais

#### Emissao da NFS-e / DPS

- competencia
- data da prestacao
- processo operacional vinculado
- tomador: CPF/CNPJ ou documento estrangeiro, razao social, e-mail, telefone e endereco
- intermediario, quando existir
- descricao do servico
- codigo de tributacao nacional
- codigo de tributacao complementar municipal, quando exigido pelo municipio
- municipio de incidencia / local de incidencia do ISSQN
- natureza tributaria da operacao
- valor do servico
- descontos condicionados e incondicionados
- deducoes / reducoes de base, quando aplicaveis
- ISS retido e responsavel pela retencao
- PIS, COFINS, IRRF, CSLL e CP/CPP, quando houver
- informacoes complementares

### Endpoints nacionais relevantes

- `GET /parametros_municipais/{codigoMunicipio}/convenio`
- `GET /parametros_municipais/{codigoMunicipio}/{codigoServico}`
- `GET /parametros_municipais/{codigoMunicipio}/{CPF/CNPJ}`
- `POST /nfse`
- `GET /nfse/{chaveAcesso}`
- `GET /dps/{id}`
- `HEAD /dps/{id}`
- `POST /nfse/{chaveAcesso}/eventos`

### Observacao sobre arrecadacao

Indaiatuba publicou orientacoes sobre o `MAN` em `30/04/2026`. Como a camada de apuracao e arrecadacao pode evoluir separadamente da emissao, manter:

- emissao NFS-e nacional desacoplada da apuracao
- eventos e arrecadacao em modulo proprio
- configuracoes municipais versionadas por tenant

## Cambio

### Fonte oficial sugerida

Usar o BCB/PTAX como baseline oficial para BRL, com tabela interna para:

- spread por cliente
- taxa manual aprovada
- congelamento da cotacao por cobranca

### Politica recomendada

- `official_rate`: taxa vinda do provedor oficial
- `client_rate`: taxa calculada com spread/acordo
- `locked_rate`: taxa efetivamente utilizada no documento financeiro

## E-mail

- Caixa compartilhada por modulo.
- Templates versionados.
- Variaveis dinâmicas por operacao, AWB, processo e cobranca.
- Registro completo de envio, resposta e reenvio.

## Observacoes de seguranca

- tokens e certificados nunca trafegam ao frontend
- webhooks devem validar assinatura
- jobs de integracao devem ser idempotentes
- falhas externas viram pendencias com visibilidade operacional
