# Wireframes

## Dashboard executivo

```text
+-----------------------------------------------------------------------------------+
| Logo | Busca global | Empresa ativa | Perfil | Alertas | Usuario                 |
+-----------------------------------------------------------------------------------+
| Side nav         | Receita MTD | Operacoes abertas | NFS-e pendentes | FX médio  |
| - Visao Geral    +---------------------------------------------------------------+
| - Financeiro     | Pipeline operacional             | Faturamento por status      |
| - Operacional    | Timeline de excecoes             | Caixa projetado             |
| - Relatorios     +---------------------------------------------------------------+
| - Admin          | Atalhos: Nova cobranca | Novo processo | Emitir NFS-e           |
+-----------------------------------------------------------------------------------+
```

## Financeiro

```text
+-----------------------------------------------------------------------------------+
| Header do modulo: Financeiro | Filtros | Exportar                                 |
+-----------------------------------------------------------------------------------+
| Contas a receber | Receita mensal | Fluxo de caixa | Operacoes em aberto           |
+-----------------------------------------------------------------------------------+
| Cobrancas abertas                         | NFS-e                               |
| - cliente                                 | - pendentes                         |
| - vencimento                              | - rejeitadas                        |
| - metodo                                  | - historico                         |
+-----------------------------------------------------------------------------------+
| Cambio por cliente                        | E-mails financeiros                 |
+-----------------------------------------------------------------------------------+
```

## Operacional

```text
+-----------------------------------------------------------------------------------+
| Header do modulo: Operacional | SLA | Importacao/Exportacao | Novo processo        |
+-----------------------------------------------------------------------------------+
| Em abertura | Documentacao | Em transito | Desembaraco | Finalizado              |
+-----------------------------------------------------------------------------------+
| Lista de processos                         | Painel lateral                       |
| - codigo                                   | - timeline                          |
| - cliente                                  | - documentos                        |
| - modal                                    | - follow-up                         |
| - status                                   | - alertas                           |
+-----------------------------------------------------------------------------------+
```

## Detalhe do processo

```text
+-----------------------------------------------------------------------------------+
| Processo IMP-2026-0048 | Cliente | Incoterm | Status | Responsaveis               |
+-----------------------------------------------------------------------------------+
| Timeline operacional                    | Financeiro vinculado                 |
| - abertura                              | - cobrancas                          |
| - docs                                  | - fatura                             |
| - transito                              | - cambio                             |
| - entrega                               | - NFS-e                              |
+-----------------------------------------------------------------------------------+
| Documentos versionados                  | Comunicacoes                         |
+-----------------------------------------------------------------------------------+
```

## Mobile

- Navegacao por menu colapsado.
- KPIs em cards empilhados.
- Timeline com prioridade visual.
- Acoes criticas fixadas no rodape: `Novo processo`, `Nova cobranca`, `Emitir NFS-e`.
