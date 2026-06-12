# Estrutura de Pastas

```text
.
|-- apps
|   |-- api
|   |   |-- api
|   |   |   `-- index.ts
|   |   `-- src
|   |       |-- app.ts
|   |       |-- server.ts
|   |       |-- modules
|   |       |   |-- admin
|   |       |   |-- finance
|   |       |   |-- operations
|   |       |   |-- reference
|   |       |   `-- reports
|   |       `-- shared
|   |           |-- auth
|   |           |-- config
|   |           |-- context
|   |           |-- fixtures
|   |           |-- http
|   |           `-- supabase
|   `-- web
|       `-- src
|           |-- app
|           |   |-- admin
|           |   |-- financeiro
|           |   |-- operacional
|           |   `-- processos
|           |-- components
|           `-- lib
|-- docs
|-- supabase
|   `-- migrations
|-- package.json
`-- turbo.json
```

## Regras de organizacao

- Cada modulo de negocio no backend deve ter contratos, casos de uso e rotas no proprio namespace.
- Regras compartilhadas entre modulos ficam em `shared`, nunca em pastas de tela.
- No frontend, componentes de produto ficam em `components`, e dados mockados, constantes e mapeamentos em `lib`.
- Integracoes externas entram no backend por adapters especializados dentro do modulo correspondente.

## Evolucao futura

Quando o produto crescer, a proxima etapa recomendada e adicionar `packages/` para compartilhar:

- contratos TypeScript entre frontend e backend
- design tokens
- regras puras de dominio
- configs de lint e tsconfig
