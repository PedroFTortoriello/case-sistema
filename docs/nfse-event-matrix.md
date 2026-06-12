# Matriz de Eventos NFS-e - Fase 4

Base oficial consultada em `2026-05-26`:

- Portal Nacional NFS-e - `Manual dos Contribuintes - API do Emissor Publico Nacional v1.2 out/2025`
- Portal Nacional NFS-e - `Manual dos Contribuintes - APIs do ADN`
- Portal Nacional NFS-e - `Guia do Emissor Publico Nacional Web v1.2`
- Swagger da Sefin Nacional em producao restrita

## Situacao por evento

| Evento | Endpoint oficial | Ambiente | Regra conhecida | Efeito local | Status na Fase 4 |
| --- | --- | --- | --- | --- | --- |
| Emissao | `POST /nfse` | Homologacao | DPS assinada, parametros municipais e certificado cliente | `ready_for_issue -> queued -> authorized/failed` | Implementado |
| Consulta por DPS | `HEAD /dps/{id}` e `GET /dps/{id}` | Homologacao | Reconsulta segura apos timeout/processamento ambiguo | `queued -> queued/authorized/failed` | Implementado |
| Consulta NFS-e | `GET /nfse/{chaveAcesso}` | Homologacao | Recupera a NFS-e autorizada por chave | `authorized -> authorized` | Implementado |
| Consulta eventos oficiais | `GET /NFSe/{chaveAcesso}/Eventos` | Homologacao | ADN devolve os eventos vinculados a chave consultada | `authorized -> cancelled` quando um evento oficial com efeito de cancelamento for encontrado | Implementado |
| Cancelamento | `POST /nfse/{chaveAcesso}/eventos` | Homologacao configurada | Depende do Anexo II de eventos e parametrizacao municipal | `authorized -> cancelled` | Suportado oficialmente, nao configurado para envio nesta fase |
| Substituicao | `POST /nfse` com nova DPS informando a chave da nota original | Homologacao configurada | Depende do Anexo I da DPS e das regras municipais de substituicao | nota original `authorized -> cancelled`; nova nota `draft -> authorized` | Suportado oficialmente, nao configurado para envio nesta fase |
| Solicitacao de cancelamento por analise fiscal | `POST /nfse/{chaveAcesso}/eventos` | Homologacao configurada | Fluxo contencioso manual quando o cancelamento direto nao se aplica | pode resultar em cancelamento posterior | Suportado oficialmente, nao configurado nesta fase |
| Download XML | `GET /nfse/{chaveAcesso}` e armazenamento local privado | Homologacao | XML autorizado nao pode ser sobrescrito apos autorizacao | sem alterar status | Implementado |
| Download DANFSe | endpoint DANFSe configurado no ambiente nacional | Homologacao configurada | Somente quando o endpoint oficial estiver disponivel | sem alterar status | Implementado quando configurado |

## Regras locais desta fase

- NFS-e `authorized` ou `cancelled` e tratada como imutavel para edicao de rascunho.
- Nenhum evento fiscal apaga historico local, rejeicoes, arquivos ou reconciliacoes anteriores.
- Timeout de transmissao exige consulta antes de qualquer nova tentativa.
- Divergencias entre documento fiscal, cobranca, pagamento e processo sao registradas em conciliacao versionada.
- `production` continua bloqueado no adapter.
