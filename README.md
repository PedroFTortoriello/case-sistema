# Case Sistema

Case Sistema is a multi-tenant backoffice platform for Brazilian foreign-trade (Comercio Exterior) companies. It unifies the operational lifecycle of import/export processes with the financial lifecycle of charges, FX, and Brazilian municipal electronic service-invoice (NFS-e) emission, with strict separation between Financeiro and Operacional domains, granular role-based access control, full audit trails, and tenant isolation enforced at the UI, API, and database levels.

## Overview

Case Sistema is a domain-oriented ERP/backoffice for foreign-trade (comex) operations. It is built around two central business domains:

- **Financeiro** — charges (cobrancas), NFS-e fiscal invoices, FX/cambio, invoicing, cash flow, and consolidation.
- **Operacional** — import/export processes, AWBs, document management with versioning, agenda, tracking, and follow-up.

These are surrounded by supporting modules for Cadastros (reference data), Integracoes, Relatorios, Administracao, and RBAC.

**Main business objective.** Put the core comex business flow into production with end-to-end traceability ("rastreabilidade ponta a ponta") so that every process can be followed from commercial opportunity through operational execution to billing and fiscal issuance. Documented success metrics include average process open-to-close time, average fiscal issuance time, document rework rate, open value by aging, and follow-up SLA.

**Target audience.** Staff at foreign-trade companies across role profiles — administrator, financeiro, operacional, comercial, and diretor. The interface is designed to be responsive for operational desktop use and executive mobile/tablet use, with the NFS-e fiscal scope currently focused on Indaiatuba/SP.

**Core benefits.**

- A unified operational + financial view per process.
- Multi-tenant (multiempresa) isolation.
- Granular RBAC with separation of duties.
- A full, immutable audit trail for sensitive actions.
- LGPD-minded data handling.
- Isolated provider integrations via adapters.
- Traceable fiscal issuance backed by the national NFS-e environment.

> **Status note:** Production NFS-e emission is intentionally hard-blocked in this phase. The fiscal engine operates against the national NFS-e **homologation** (restricted/sandbox) environment only. See [Roadmap](#roadmap) and [Security](#security).

## Features

### Authentication

- Bearer JWT validated against Supabase Auth on every `/v1/*` request.
- Optional `x-organization-id` tenant header to select the active organization.
- Membership-based tenant resolution: a single membership is used automatically; with multiple memberships, the single default (or an explicit `x-organization-id`) is required.
- The resolved authentication context (`organizationId`, `userId`, `role`, `permissions`) is attached per request and used for all downstream authorization and tenant scoping.

> **Frontend note:** The web application does not bundle a Supabase or auth SDK. The only API-integrated screen (the NFS-e workbench) authenticates with a manually pasted Bearer token held in memory and masked in the UI; the session URL and organization id are persisted in `sessionStorage` (never the token). End-to-end Supabase-backed login in the web UI is a roadmap item.

### Dashboard / Control Tower

- Executive KPI cards (monthly revenue, open operations, accounts receivable, average FX) with deltas and badges.
- Product module map linking to Financeiro, Operacional, RBAC, and a sample process detail.
- Priority processes table (Client / Process / Status / AWB / Value / Actions) with status pills and per-row open links.
- Recent operational events / timeline.
- Responsibility-separation panel (Financeiro vs Operacional).
- Animated KPI/section cards, plus demonstration loading-skeleton and empty-state panels.

> Dashboard content is presentational and rendered from local demo data; it is not yet wired to live data.

### Financeiro

- Finance hub with KPIs and area cards (Cobrancas, NFS-e, Cambio, E-mails).
- **Cobrancas:** charge-emission form (client, process, method PIX/Boleto/Link/Internacional, cost center, currency BRL/USD/EUR, value, due date, installments, notes) plus a charge queue table with Aberto/Pago/Atrasado status pills, and a dedicated emission screen with checklist and predicted summary.
- **Cambio (FX):** official/client rate and spread quotation form, FX board (USD/EUR PTAX), FX governance policies, a rate-freeze-per-charge concept, and a dedicated new-quotation screen.
- **E-mails:** template-based send form, templates + history table, dynamic variable placeholders (`{{cliente}}`, `{{awb}}`, `{{processo}}`, `{{valor}}`, `{{vencimento}}`, `{{link_pagamento}}`), and a dedicated compose screen.

> Of the Financeiro surface, only the NFS-e module is wired to the live API (see Fiscal / NFS-e). Charge, FX, and email screens are presentational with link-only actions in the current build, and the `POST /v1/finance/charges` API endpoint returns a simulated record.

### Fiscal / NFS-e

The NFS-e module is the core fiscal domain and the only fully API-integrated feature.

- NFS-e overview with phase scope highlights and intentional production-blocked guardrails.
- A full NFS-e preparation & emission **workbench** (client component) backed by the real REST API.
- Homologation session connection: configurable API base URL, organization-id header, and masked Bearer token.
- Fiscal settings editor (municipality, IBGE code, UF, environment, layout version, validation status, DPS series, next number, document reference).
- Provider (emitter) fiscal profile editor.
- Client (tomador) fiscal profile load/save.
- Taxable service catalog with create/update versioning.
- NFS-e draft document create/update (amounts, taxes, dates, description).
- Lifecycle actions: emit in homologation, sync fiscal lifecycle, reconcile with finance/ops, and process pending query jobs.
- Document detail: status, official return (access key / verification code), local events, official remote events, structured rejections, reconciliation, and private XML/PDF file listing with authenticated download.
- Client-side readiness validation using the shared Zod contracts, mirroring the server's readiness logic so browser and server stay in lockstep.
- Server-side NFS-e Nacional lifecycle: `draft -> ready_for_issue -> queued -> authorized/failed/cancelled`, governed by an explicit state machine, with DPS XML built, digitally signed (PFX/PKCS#12 certificate), gzipped, and transmitted to the national SEFIN/ADN homologation endpoints.

### Operacional

- Operations page: stage KPIs (Em abertura, Documentacao, Em transito, Desembaraco), process-open form, processes list, day timeline, document stack, operational guardrails, and empty state.
- Open new import/export process form: client, direction, modal (Aereo/Maritimo/Rodoviario/Multimodal), incoterm (CIP/FCA/FOB/EXW), origin/destination, dates, and commercial & operational owners.
- **AWB:** emission form (process, AWB number, airline, route, weight, volume, cargo value), recent AWBs list, and a dedicated emission screen.
- **Documents:** registration form (process, doc type AWB/Invoice/Packing List/DI/BL/Contrato, title, owner, version, validation status, planned upload path) and a current document stack with versions and ownership.

> Operacional screens are presentational in the current build; the operations API endpoints serve demo fixture data and `POST /v1/operations/awbs` returns a simulated record.

### Processos (traceability)

- Dynamic process detail page (`/processos/[id]`) presenting billing status, ownership, a step timeline, documents and versions, and a linked financial charges table — joining the operational and financial context end-to-end.

### Cadastros (Reference)

- Reference data for clients and FX rates is exposed via the API (`/v1/reference/*`, demo fixture data).
- The broader cadastros domain (clients, carriers, agents, ports, airports, currencies, cost centers) is modeled in the database schema. Dedicated cadastros management screens are a roadmap item; current navigation links reuse existing routes.

### Integracoes

- **Roadmap / documented strategy.** Each integration enters the backend through a domain port with a provider-isolated adapter. The documented integration matrix covers NFS-e (Prefeitura / national provider), Cambio/FX APIs (BCB/PTAX baseline), Microsoft 365 / Gmail email, external ERP mirroring, WhatsApp notifications, and signed (HMAC) webhooks.
- **Implemented today:** the NFS-e national fiscal adapter (homologation). Other integrations are documented as adapter strategy and are not yet implemented.

### Relatorios (Reports)

- Reports summary endpoint (`/v1/reports/summary`, demo fixture data) and a reporting surface.
- Exportable/period-filtered reports are a documented roadmap item.

### Administracao / RBAC

- Permission matrix by role (Administrador, Financeiro, Operacional, Comercial, Diretor) per business capability.
- Separation-of-duties rules across Financeiro, Operacional, Diretor, and Administrador.
- Mandatory audit-trail list for sensitive actions (NFS-e emit/cancel, charges, status changes, exports/permission changes).
- Admin API for the RBAC matrix, audit-log listing, and membership role updates.

### App Shell / Navigation

- `DashboardShell` with a fixed dark sidebar (Principal / Financeiro / Operacional / Gestao), sticky top header, notifications/help buttons, and a static user chip.
- Per-module sub-navigation tabs (FinanceSectionNav, OperationalSectionNav) with active-state detection.
- `PageToolbar` with title/description and link-based primary/secondary actions.
- A reusable `StatusPill` mapping domain statuses to badge styles.

## Tech Stack

### Frontend (`apps/web`)

| Technology | Version | Notes |
|---|---|---|
| Next.js (App Router) | 16.2.6 | Dev runs with `--webpack`; `next.config.ts` sets the Turborepo root |
| React / React DOM | 19.2.4 | |
| TypeScript | ^5 | target ES2017, `moduleResolution: bundler`, strict, `@/*` path alias |
| Tailwind CSS | ^4 | CSS-first config via `@tailwindcss/postcss`; no `tailwind.config` file |
| framer-motion | ^12.40.0 | Entrance/hover animations |
| lucide-react | ^1.16.0 | Icon set |
| next/font (Geist / Geist Mono) | — | Self-hosted fonts via CSS variables |
| ESLint | ^9 + `eslint-config-next` 16.2.6 | Flat config (core-web-vitals + typescript) |

No component library (no MUI/shadcn/Radix/Chakra); UI is hand-built from Tailwind utilities and a small local primitive set. No global state library and no data-fetching library; the single data-fetching path is a hand-rolled `fetch` client. The interface is light-theme only and fully Portuguese (`pt-BR`).

### Backend (`apps/api`)

| Technology | Version | Notes |
|---|---|---|
| Node.js | `@types/node` ^24 | Runtime; HTTP server built directly on the native `node:http` module — no web framework |
| TypeScript | ^5.9.2 | ESM (`"type": "module"`) |
| zod | ^3.25.76 | Env parsing, request validation, and all request contracts |
| @supabase/supabase-js | ^2.57.4 | Auth (`getUser`) and all DB access (PostgREST) with RLS |
| node-forge | ^1.4.0 | Parses PFX/PKCS#12 certificates for NFS-e signing |
| xml-crypto | ^6.1.2 | XML digital signature of the DPS document |
| @xmldom/xmldom | ^0.9.10 | DOMParser/XMLSerializer for NFS-e XML |
| fast-xml-parser | ^5.8.0 | Parsing XML responses from the national NFS-e API |
| tsx | ^4.20.6 | Dev TS execution/watch and tests |

The HTTP layer (routing, middleware chain, CORS, request validation, and centralized error handling) is a small in-house module under `src/shared/http/`, built only on `node:http` and standard Web APIs (`URL`, `Headers`, `Response`) — there is no third-party web framework dependency. Runtime: Node.js (typed against `@types/node` ^24). Dev via `tsx watch`; production via `node dist/src/server.js` (`http.createServer`); also deployable as a Vercel serverless function via the same request listener. `jsonwebtoken` ^9.0.2 is a declared dependency but is **not** used — token validation is delegated entirely to Supabase.

### Shared contracts (`apps/contracts`)

| Technology | Version | Notes |
|---|---|---|
| `@case-sistema/contracts` | 0.1.0 (private, ESM) | Single source of truth for the NFS-e fiscal domain |
| zod | ^3.25.76 | Sole runtime dependency |
| TypeScript | ^5.9.2 | Emits `.js` + `.d.ts`; consumers type-check against raw TS source |

Provides enum value tuples, Zod schemas + inferred types, CPF/CNPJ check-digit validators (module-private), and pure readiness functions, consumed by both web and api via a `*` workspace dependency.

### Database

| Technology | Notes |
|---|---|
| PostgreSQL on Supabase | Multi-tenant schema; UUID PKs (`pgcrypto`), UTC `timestamptz`, JSONB snapshots, PostgreSQL enums |
| Supabase Auth | Integrates with `auth.users`; membership via `user_memberships` |
| Row Level Security | Enabled on essentially all public tables; tenant scoping via `is_member_of(organization_id)` |
| Migrations | 5 ordered SQL migrations under `supabase/migrations/` |

No traditional ORM; the API uses the Supabase PostgREST query builder. SECURITY DEFINER helpers `current_organization_ids()`, `is_member_of(org)`, and `has_any_role(org, roles[])` drive isolation; `reserve_nfse_sequence()` atomically reserves NFS-e numbers.

### Infrastructure / Tooling

| Technology | Version | Notes |
|---|---|---|
| Turborepo | ^2.6.3 | Task orchestration via `turbo.json` |
| npm workspaces | npm@10.8.1 (pinned) | Workspaces glob `apps/*`; `package-lock.json` committed |
| Vercel | — | `apps/api/vercel.json` (v2): function `api/index.ts`, runtime `nodejs22.x`, `maxDuration` 10s |

No Dockerfile, no CI configuration, and no `engines`/`.nvmrc`/`.node-version` files are committed. No `supabase/config.toml` and no `.env` files are committed (env files are gitignored).

## Architecture

### Frontend structure

`apps/web` is a Next.js App Router application following domain-oriented componentization.

- **`src/app`** — the App Router tree: root `layout.tsx` (Geist fonts, metadata), `globals.css`, and all route segments (`financeiro/*`, `operacional/*`, `processos/[id]`, `admin/rbac`).
- **`src/components`** — shared UI primitives: `dashboard-shell`, `finance-section-nav`, `operational-section-nav`, `form-primitives` (Field/Input/Select/TextArea), `page-toolbar`, `section-card`, `kpi-card`, `status-pill`, `empty-state-panel`, `loading-skeleton-panel`.
- **`src/lib`** — `demo-data.ts` (static/mock content for non-NFS-e screens), `nfse-api.ts` (the NFS-e REST client), and `nfse-form-state.ts` (default fiscal payloads + Zod-based readiness/validation helpers).

Almost all screens are React Server Components rendering static content from `demo-data.ts`. The single stateful, interactive feature is the NFS-e workbench (`"use client"`), which uses local `useState`/`useMemo` only.

### Backend structure

`apps/api` is a plain Node.js application organized along Clean Architecture lines: `modules/{finance,operations,reference,reports,admin}` plus `shared/{auth,config,context,http,supabase,...}`.

- **`src/server.ts`** — Node entry point (`http.createServer(app.requestListener)` listening on `env.PORT`).
- **`src/app.ts`** — `createApp()`: builds the in-house `Router`, wires middleware (logger, services injection, CORS, auth), registers the central error handler, exposes `/health`, and mounts `/v1/*` routes.
- **`src/shared/http/`** — the framework-free HTTP layer: `router.ts` (route matching, middleware composition, `node:http` listener + a Fetch-style `request()` for tests), `context.ts` (request/response context), `validation.ts` (Zod validator middleware), `cors.ts`, `logger.ts`, and `middleware.ts` (auth).
- **`api/index.ts`** — Vercel serverless handler (Node `(req, res)` signature delegating to the same request listener).
- **`src/modules/finance/`** — routes, contracts, the Supabase-backed `fiscal-service.ts`, the `nfse-national-adapter.ts` (signs + transmits DPS), the NFS-e event support matrix, and the lifecycle state machine.
- **`src/modules/{operations,reference,reports,admin}/`** — their respective routes and contracts.
- **`src/shared/`** — `auth` (context service, RBAC, token extraction), `config/env.ts` (Zod-validated env), `context/tenant.ts` (roles, permission catalog, types), `services/` (service container + default wiring), `supabase/` (user-scoped and service-role client factories), `audit/`, `errors/`, and `fixtures/` (demo data).

`process.env` is read only in `env.ts`, where it is Zod-validated at startup. There is no DB-level permission table — the role-to-permission mapping is hard-coded in `shared/auth/rbac.ts` from a 20-entry permission catalog.

### Database structure

The schema is multi-tenant: every business table carries an `organization_id` FK to `organizations`, and membership is modeled via `user_memberships` (`user_id` + `organization_id` + `app_role`). Major table groups:

- **Platform:** `organizations`, `user_profiles`, `user_memberships`, `audit_logs`, `integrations`, `webhooks`, `async_jobs`.
- **Cadastros:** `clients`, `carriers`, `agents`, `ports`, `airports`, `currencies`, `cost_centers`.
- **Operacional:** `processes`, `process_events`, `awbs`, `documents`, `document_versions`, `tasks`.
- **Financeiro:** `fx_rate_tables`, `fx_quotes`, `service_invoices`, `charges`, `payment_events`, `email_templates`, `email_messages`.
- **Fiscal / NFS-e:** `nfse_fiscal_settings`, `organization_fiscal_profiles`, `client_fiscal_profiles`, `taxable_services`, `taxable_service_versions`, `service_invoice_events`, `nfse_document_rejections`, `nfse_document_files`, `nfse_document_remote_events`, `nfse_document_reconciliations`.

The migrations build up the schema across phases: an initial foundational schema, phase-1 security/RLS hardening, and phases 2–4 for the fiscal base, NFS-e emission/transmission, and post-emission lifecycle.

### API flow

```
Users  ->  apps/web  ->  apps/api  ->  Supabase (PostgreSQL + Auth + Storage)
                              |
                              +->  Integration Adapters  ->  National NFS-e (SEFIN/ADN homologation)
```

The API is REST under `/v1`, JSON, authenticated with `Authorization: Bearer <access-token>` and an optional `x-organization-id` tenant header. On every `/v1/*` request the auth middleware (1) extracts the Bearer token, (2) validates it via Supabase `auth.getUser`, (3) resolves the tenant from `user_memberships`, and (4) builds the `AuthContext`. Each handler then calls `requirePermission(c, '<permission>')`; denials are audited and rejected with 403. Tenant filtering is enforced at three levels: UI (menu/actions by profile), API (tenant middleware + RBAC), and DB (Supabase RLS).

## Installation

### Prerequisites

- **Node.js** — no `engines` field is committed. The Vercel function targets `nodejs22.x`, and the API is typed against Node 24 types; Node 22 or newer is recommended.
- **npm** — `npm@10.8.1` is pinned via the root `packageManager` field. The repo uses npm workspaces (no pnpm/yarn).
- **Supabase** — a Supabase project (PostgreSQL + Auth + Storage) is required for live authentication and data. Apply the SQL migrations under `supabase/migrations/` to a Supabase/Postgres database. Note that no `supabase/config.toml` is committed, so the Supabase CLI must be initialized/linked separately if used.

### Steps

1. **Clone and install** (installs all workspaces):

   ```bash
   git clone <repository-url>
   cd "Case Sistema"
   npm install
   ```

2. **Configure environment variables.** Create the appropriate `.env` files for the API (`apps/api`) and the web app (`apps/web`). See [Environment Variables](#environment-variables). Env files are gitignored and must be created manually.

3. **Apply the database migrations** to your Supabase/Postgres instance, in order:

   ```text
   supabase/migrations/202605240001_initial_schema.sql
   supabase/migrations/202605250002_phase1_security_rls.sql
   supabase/migrations/202605250003_phase2_fiscal_base.sql
   supabase/migrations/202605250004_phase3_nfse_emission.sql
   supabase/migrations/202605260005_phase4_nfse_lifecycle.sql
   ```

4. **Run everything in development** (Turborepo runs all workspaces in parallel):

   ```bash
   npm run dev
   ```

   Or run apps individually:

   ```bash
   npm run dev:web   # Next.js dev server (default http://localhost:3000)
   npm run dev:api   # Node.js API via tsx watch (default http://localhost:3001)
   ```

5. **Build for production:**

   ```bash
   npm run build
   ```

> The web frontend defaults to reaching the API at `http://localhost:3001`. The NFS-e workbench also lets you override the API base URL at runtime in its session form.

## Environment Variables

All variables are optional in their schemas but, as noted, several are required at runtime for auth, DB, and NFS-e signing. The API validates its variables with Zod at startup (`apps/api/src/shared/config/env.ts`); the web app reads exactly one public variable.

| Variable | Description | Scope |
|---|---|---|
| `NODE_ENV` | Runtime mode enum `development \| test \| production` (default `development`). | API |
| `PORT` | HTTP listen port for the Node server (default `3001`). | API |
| `ALLOWED_ORIGINS` | Comma-separated CORS allow-list (default `http://localhost:3000`). | API |
| `SUPABASE_URL` | Supabase project URL for the user and service-role clients (required at runtime for auth/DB). | API |
| `SUPABASE_ANON_KEY` | Supabase anon key used by the per-request user-scoped client (`auth.getUser` + RLS queries). | API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key for the privileged internal client (present but not referenced in request modules). | API |
| `NFSE_CERTIFICATE_STORE_JSON` | JSON map of digital certificate entries (PFX base64/passphrase or PEMs + caPem) keyed by certificate reference, used to sign the NFS-e DPS. | API |
| `NFSE_CREDENTIAL_STORE_JSON` | JSON map of credential entries (custom HTTP headers) keyed by credential reference for NFS-e API calls. | API |
| `NFSE_NATIONAL_HTTP_TIMEOUT_MS` | HTTPS request timeout to the national NFS-e API (default `15000`). | API |
| `NFSE_NATIONAL_HOMOLOGATION_SEFIN_BASE_URL` | Base URL for SEFIN Nacional homologation endpoints (default `https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional`). | API |
| `NFSE_NATIONAL_HOMOLOGATION_PARAMS_BASE_URL` | Base URL for municipal parametrization homologation endpoints (default `https://adn.producaorestrita.nfse.gov.br/parametrizacao`). | API |
| `NFSE_NATIONAL_HOMOLOGATION_ADN_BASE_URL` | Base URL for ADN (events/distribution) homologation endpoints (default `https://adn.producaorestrita.nfse.gov.br/contribuintes`). | API |
| `NFSE_NATIONAL_HOMOLOGATION_DANFSE_BASE_URL` | Base URL for DANFSE (PDF) retrieval homologation endpoint (optional, default `null`). | API |
| `NFSE_NATIONAL_HOMOLOGATION_DANFSE_PATH_TEMPLATE` | Path template for building the DANFSE retrieval URL (optional). | API |
| `NEXT_PUBLIC_NFSE_API_BASE_URL` | Browser-exposed default base URL for the NFS-e API; falls back to `http://localhost:3001` when unset. The only `process.env` reference in the frontend. | Web |

## Scripts

### Root (`package.json`)

| Command | Description |
|---|---|
| `npm run dev` | `turbo run dev --parallel` — run all workspaces in dev mode. |
| `npm run build` | `turbo run build` — build all workspaces. |
| `npm run lint` | `turbo run lint` — lint all workspaces. |
| `npm run typecheck` | `turbo run typecheck` — typecheck all workspaces. |
| `npm run test` | `npm run test --workspace api` — run the API test suite. |
| `npm run dev:web` | `npm run dev --workspace web`. |
| `npm run build:web` | `npm run build --workspace web`. |
| `npm run lint:web` | `npm run lint --workspace web`. |
| `npm run dev:api` | `npm run dev --workspace api`. |
| `npm run build:api` | `npm run build --workspace api`. |
| `npm run typecheck:api` | `npm run typecheck --workspace api`. |
| `npm run test:api` | `npm run test --workspace api`. |

### API (`apps/api`)

| Command | Description |
|---|---|
| `dev` | `tsx watch src/server.ts` — watch-mode dev server. |
| `build` | `tsc -p tsconfig.json` — compile TypeScript to `dist/`. |
| `start` | `node dist/src/server.js` — run the compiled server. |
| `lint` | `tsc --noEmit`. |
| `typecheck` | `tsc --noEmit`. |
| `test` | `node --import tsx --test src/test/app.test.ts` — `node:test` suite with fake service implementations. |

### Web (`apps/web`)

| Command | Description |
|---|---|
| `dev` | `next dev --webpack`. |
| `build` | `next build`. |
| `start` | `next start`. |
| `lint` | `eslint`. |

### Contracts (`apps/contracts`, `@case-sistema/contracts`)

| Command | Description |
|---|---|
| `build` | `tsc -p tsconfig.json`. |
| `lint` | `tsc --noEmit`. |
| `typecheck` | `tsc --noEmit`. |

## Deployment

Deployment targets are documented in `docs/` and partly configured in the repository. Be aware of the distinction between what is configured versus what is documented as the intended topology.

- **Web (`apps/web`) — Vercel (documented).** The frontend is intended to run on Vercel. No `vercel.json` is committed for the web app, so it relies on Vercel's default Next.js detection. Build via `next build`. Set `NEXT_PUBLIC_NFSE_API_BASE_URL` to point at the deployed API.

- **API (`apps/api`) — Vercel Functions (configured).** A `vercel.json` (version 2) is committed for the API: it declares a serverless function `api/index.ts` with runtime `nodejs22.x` and `maxDuration` 10s, and a catch-all route `/(.*) -> /api/index.ts`. The same application also runs as a long-running Node server (`server.ts`), so it can alternatively be hosted on any Node-capable platform. Configure all API environment variables in the host.

- **Database / Auth / Storage — Supabase (documented + migrations committed).** PostgreSQL, Auth, and Storage are provided by Supabase. The five ordered migrations under `supabase/migrations/` define the full schema and RLS policies and must be applied to the target project. No `supabase/config.toml` is committed, so CLI-based migration management must be initialized separately.

- **Environments.** The documentation references `development`, `staging`, and `production` environments. Note that NFS-e **production emission is hard-blocked in code** for this phase regardless of configuration (see [Roadmap](#roadmap) and [Security](#security)).

> **Honesty note:** There is no committed CI configuration, no Dockerfile, and no `engines`/`.nvmrc` pinning. The Vercel API function is the only fully committed deployment artifact; web-on-Vercel and Supabase hosting are documented decisions and standard platform defaults.

## Folder Structure

```text
case-sistema/
├── apps/
│   ├── api/                         # Node.js backend (native http, ESM, TypeScript)
│   │   ├── api/
│   │   │   └── index.ts             # Vercel serverless handler (Node req/res)
│   │   ├── src/
│   │   │   ├── server.ts            # Node entry point (http.createServer)
│   │   │   ├── app.ts               # createApp(): middleware + routes + /health
│   │   │   ├── modules/
│   │   │   │   ├── admin/           # RBAC matrix, audit list, membership role update
│   │   │   │   ├── finance/         # charges + full NFS-e (fiscal service, national adapter,
│   │   │   │   │                    #   event matrix, state machine)
│   │   │   │   ├── operations/      # overview, processes, AWBs
│   │   │   │   ├── reference/       # clients, fx-rates
│   │   │   │   └── reports/         # summary
│   │   │   ├── shared/
│   │   │   │   ├── auth/            # context-service, rbac, token
│   │   │   │   ├── config/          # env.ts (Zod-validated)
│   │   │   │   ├── context/         # tenant roles, permission catalog, types
│   │   │   │   ├── http/            # in-house http layer: router, context, validation, cors, logger, auth
│   │   │   │   ├── services/        # service container + default wiring
│   │   │   │   ├── supabase/        # user-client + service-role-client
│   │   │   │   ├── admin/           # membership service
│   │   │   │   ├── audit/           # audit log service
│   │   │   │   ├── errors/          # AppError + typed errors
│   │   │   │   └── fixtures/        # demo data
│   │   │   └── test/                # node:test suite
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vercel.json
│   ├── web/                         # Next.js 16 frontend (App Router)
│   │   ├── src/
│   │   │   ├── app/                 # routes: financeiro/*, operacional/*,
│   │   │   │                        #   processos/[id], admin/rbac, layout, globals.css
│   │   │   ├── components/          # shared UI primitives (10 components)
│   │   │   └── lib/                 # demo-data, nfse-api, nfse-form-state
│   │   ├── public/                  # static SVGs
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── tsconfig.json
│   │   ├── postcss.config.mjs
│   │   └── eslint.config.mjs
│   └── contracts/                   # @case-sistema/contracts (shared Zod schemas/types)
│       ├── src/
│       │   ├── nfse.ts              # entire NFS-e domain library
│       │   └── index.ts            # barrel re-export
│       ├── package.json
│       └── tsconfig.json
├── supabase/
│   └── migrations/                  # 5 ordered SQL migrations (initial + phases 1–4)
├── docs/                            # architecture, api, database, integrations, nfse, etc.
├── package.json                     # root workspaces + Turborepo scripts
├── turbo.json
├── package-lock.json
└── README.md
```

## API Documentation

The API is served under `/v1`, returns JSON, and (except for `/health`) requires `Authorization: Bearer <token>` plus permission checks. An optional `x-organization-id` header selects the tenant. Many read endpoints currently return demo fixture data; the NFS-e endpoints are backed by the real Supabase-backed fiscal service.

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/health` | Health check (`{status:'ok', service, time}`). | None (public) |
| GET | `/v1/finance/overview` | Finance dashboard overview (demo fixture). | Bearer + `finance.view` |
| GET | `/v1/finance/charges` | List charges (demo fixture). | Bearer + `finance.view` |
| POST | `/v1/finance/charges` | Create a charge (simulated; returns 201). | Bearer + `finance.charge.manage` |
| GET | `/v1/finance/nfse/settings` | Get organization NFS-e fiscal settings. | Bearer + `fiscal.settings.view` |
| PUT | `/v1/finance/nfse/settings` | Save NFS-e fiscal settings (audited). | Bearer + `fiscal.settings.manage` |
| GET | `/v1/finance/nfse/provider-profile` | Get provider (emitter) fiscal profile. | Bearer + `fiscal.settings.view` |
| PUT | `/v1/finance/nfse/provider-profile` | Save provider fiscal profile (audited). | Bearer + `fiscal.settings.manage` |
| GET | `/v1/finance/nfse/clients/:clientId/fiscal-profile` | Get a client's (taker) fiscal profile. | Bearer + `fiscal.settings.view` |
| PUT | `/v1/finance/nfse/clients/:clientId/fiscal-profile` | Save a client's fiscal profile (audited). | Bearer + `fiscal.settings.manage` |
| GET | `/v1/finance/nfse/services` | List taxable services catalog. | Bearer + `fiscal.settings.view` |
| POST | `/v1/finance/nfse/services` | Create a taxable service (versioned; 201, audited). | Bearer + `fiscal.settings.manage` |
| PATCH | `/v1/finance/nfse/services/:serviceId` | Update a taxable service (new version; audited). | Bearer + `fiscal.settings.manage` |
| GET | `/v1/finance/nfse/documents` | List NFS-e service-invoice documents. | Bearer + `fiscal.document.view` |
| GET | `/v1/finance/nfse/documents/:documentId` | Get a single NFS-e document. | Bearer + `fiscal.document.view` |
| POST | `/v1/finance/nfse/documents` | Create an NFS-e draft document (201, audited). | Bearer + `fiscal.document.prepare` |
| PATCH | `/v1/finance/nfse/documents/:documentId` | Update an NFS-e draft document (audited). | Bearer + `fiscal.document.prepare` |
| POST | `/v1/finance/nfse/documents/:documentId/issue` | Issue/transmit the document to the national API (audited; 200/202/422). | Bearer + `fiscal.document.issue` |
| POST | `/v1/finance/nfse/documents/:documentId/sync` | Sync lifecycle/status with the national API (audited; 200/202/422). | Bearer + `fiscal.document.issue` |
| POST | `/v1/finance/nfse/documents/:documentId/reconcile` | Reconcile the document against charge/process (audited). | Bearer + `fiscal.document.reconcile` |
| GET | `/v1/finance/nfse/documents/:documentId/remote-events` | List remote (official) events for a document. | Bearer + `fiscal.document.view` |
| GET | `/v1/finance/nfse/documents/:documentId/events` | List local lifecycle events for a document. | Bearer + `fiscal.document.view` |
| GET | `/v1/finance/nfse/documents/:documentId/rejections` | List rejection records for a document. | Bearer + `fiscal.document.view` |
| GET | `/v1/finance/nfse/documents/:documentId/files` | List generated files (XML/PDF) for a document. | Bearer + `fiscal.document.view` |
| GET | `/v1/finance/nfse/documents/:documentId/files/:fileId/download` | Download a document file (binary, `Content-Disposition` attachment). | Bearer + `fiscal.document.view` |
| POST | `/v1/finance/nfse/jobs/process` | Process pending fiscal async jobs (status checks); returns `{processed}`. | Bearer + `fiscal.document.issue` |
| GET | `/v1/finance/nfse/history` | NFS-e history (document list). | Bearer + `fiscal.document.view` |
| GET | `/v1/finance/nfse/event-matrix` | National NFS-e event support matrix. | Bearer + `fiscal.document.view` |
| GET | `/v1/operations/overview` | Operations dashboard overview (demo fixture). | Bearer + `operations.view` |
| GET | `/v1/operations/processes` | List operational processes (demo fixture). | Bearer + `operations.view` |
| GET | `/v1/operations/awbs` | List AWBs (demo fixture). | Bearer + `operations.view` |
| POST | `/v1/operations/awbs` | Create AWB (simulated; 201). | Bearer + `operations.awb.manage` |
| GET | `/v1/reference/clients` | List reference clients (demo fixture). | Bearer + `reference.view` |
| GET | `/v1/reference/fx-rates` | List FX rates (demo fixture). | Bearer + `reference.view` |
| GET | `/v1/reports/summary` | Reports summary (demo fixture). | Bearer + `reports.view` |
| GET | `/v1/admin/rbac/matrix` | Return the role → permission map. | Bearer + `admin.view` |
| GET | `/v1/admin/audit` | List audit logs for the organization. | Bearer + `admin.audit.view` |
| PATCH | `/v1/admin/memberships/:membershipId/role` | Update a user membership's role (audited). | Bearer + `admin.users.manage` |

> Pagination, period/client/status filters, signed webhooks, and idempotency on charges are documented as recommended evolution and are **not** yet implemented.

## Security

### Authentication

- Every `/v1/*` request must carry a Bearer JWT in the `Authorization` header. The token is extracted via a strict `Bearer <token>` pattern; a missing or malformed token yields `401`.
- Tokens are validated by Supabase Auth: the middleware builds a per-request, user-scoped Supabase client (using `SUPABASE_ANON_KEY`) and calls `supabase.auth.getUser(accessToken)`. Invalid or expired tokens yield `401`.
- Token validation is delegated entirely to Supabase; the declared `jsonwebtoken` dependency is unused in the request path.

### Authorization / RBAC

- Roles (`AppRole`) are one of `administrator | financeiro | operacional | comercial | diretor`.
- A static `rolePermissionMap` maps each role to permissions drawn from a 20-entry permission catalog. The mapping is hard-coded in code; there is no DB-level permission table.
- Every protected handler calls `requirePermission(c, '<permission>')`. If the resolved permissions do not include the required one, the system logs an `authorization.denied` audit entry and throws `403`.
- The documented separation-of-duties model scopes Financeiro to financial endpoints + consolidated reports, Operacional to processes/documents/AWB/agenda, Comercial to a commercial view + clients (no financial maintenance), and Diretor/administrador to cross-cutting views.

### Data protection

- **Row Level Security (RLS).** RLS is enabled on essentially all public tables. The default pattern grants tenant-scoped CRUD via `is_member_of(organization_id)`, with stricter role-gated policies for sensitive tables (e.g., `user_memberships` writes restricted to `administrator`/`diretor`).
- **Multi-tenant isolation.** Tenant boundaries are enforced at three levels: UI (menu/actions by profile), API (tenant middleware + RBAC), and DB (RLS). Every downstream query runs through the user-scoped Supabase client so RLS applies server-side, and service code additionally filters by `auth.organizationId`. A privileged service-role client exists but is not referenced by the request-handling modules.
- **Audit trail.** An append-only `audit_logs` table records actor, module/action, entity type/id, trace id, IP address, user agent, and a JSONB payload. Reads are restricted to `administrator`/`diretor`; inserts require the actor to be the authenticated tenant member. The audit service sanitizes metadata, stripping keys matching token/authorization/password/secret/certificate/private key/service-role/anon-key and truncating long values. Authorization denials are themselves audited.
- **LGPD.** The platform is designed with LGPD-minded data handling: tenant isolation, append-only audit trails for sensitive actions (NFS-e emit/cancel, charges, status changes, exports, permission changes), and metadata sanitization.
- **Fiscal credential handling.** NFS-e digital certificates and credentials are referenced abstractly (`certificate_reference` / `credential_reference`) and stored outside the database in `NFSE_CERTIFICATE_STORE_JSON` / `NFSE_CREDENTIAL_STORE_JSON`; tokens and certificates are never sent to the frontend.
- **Production hard-block.** NFS-e production emission is deliberately blocked in code for this phase: the environment configuration and issue-prerequisite checks throw if `environment === 'production'`. Authorized/cancelled NFS-e documents are immutable for direct edit, governed by the lifecycle state machine.

## Roadmap

The documented evolution proceeds from the current MVP through V1 and Scale phases.

**Current (MVP).** Authentication & RBAC, basic multiempresa, main cadastros, import/export processes, AWB, documents & versioning, charges, NFS-e (homologation), financial + operational dashboards, and audit & logs.

**V1 (planned).**

- Documental OCR.
- Email automation.
- Exportable reports.
- External ERP integration.
- Signed webhooks.
- Advanced operational agenda & SLA.
- FX with per-client rules.

**Scale (planned).**

- Dedicated processing queues.
- Full observability.
- Analytics data mart.
- Per-tenant rule automations.
- Omnichannel notifications.
- A more granular permission engine.

**Fiscal / NFS-e roadmap.**

- Lift the production hard-block once the production environment is validated.
- Enable officially supported but not-yet-configured events for sending: Cancelamento, Substituicao, and cancellation request via fiscal analysis (cancellation/substitution are currently implemented only for query in homologation).

**Architecture roadmap.**

- Introduce a `packages/` directory to share TypeScript contracts, design tokens, pure domain rules, and lint/tsconfig configuration across frontend and backend.
- Adopt standard pagination and period/client/status filters, signed upload for documents, and idempotency in fiscal issuance and charges.

## License

This project is released under the MIT License. Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files, to deal in the software without restriction, subject to the inclusion of the above copyright notice and this permission notice in all copies. The software is provided "as is", without warranty of any kind.
