alter table public.service_invoices
  add column if not exists cancel_event_id uuid references public.service_invoice_events (id) on delete set null,
  add column if not exists cancelled_reason_code text,
  add column if not exists cancelled_reason_text text,
  add column if not exists lifecycle_synced_at timestamptz,
  add column if not exists replaced_by_service_invoice_id uuid references public.service_invoices (id) on delete set null,
  add column if not exists replaces_service_invoice_id uuid references public.service_invoices (id) on delete set null;

alter table public.service_invoices
  drop constraint if exists service_invoices_transmission_state_check;

alter table public.service_invoices
  add constraint service_invoices_transmission_state_check
  check (
    transmission_state in (
      'idle',
      'requested',
      'processing',
      'authorized',
      'cancel_requested',
      'cancelled',
      'rejected',
      'timeout_pending_query'
    )
  );

alter table public.nfse_document_files
  drop constraint if exists nfse_document_files_role_check;

alter table public.nfse_document_files
  add constraint nfse_document_files_role_check
  check (file_role in ('request_xml', 'response_xml', 'authorized_xml', 'danfse_pdf', 'event_xml'));

create table if not exists public.nfse_document_remote_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  service_invoice_id uuid not null references public.service_invoices (id) on delete cascade,
  source text not null default 'adn',
  access_key text not null,
  event_type_code integer,
  event_name text,
  event_sequence integer not null default 1,
  effect text not null default 'none',
  occurred_at timestamptz,
  detail jsonb not null default '{}'::jsonb,
  file_id uuid references public.nfse_document_files (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint nfse_document_remote_events_effect_check
    check (effect in ('none', 'cancelled'))
);

create table if not exists public.nfse_document_reconciliations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  service_invoice_id uuid not null references public.service_invoices (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  charge_id uuid references public.charges (id) on delete set null,
  process_id uuid references public.processes (id) on delete set null,
  status text not null default 'pending',
  issues jsonb not null default '[]'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint nfse_document_reconciliations_status_check
    check (status in ('pending', 'aligned', 'attention', 'divergent'))
);

create unique index if not exists idx_nfse_document_remote_events_invoice_type_seq
  on public.nfse_document_remote_events (service_invoice_id, coalesce(event_type_code, 0), event_sequence);

create index if not exists idx_nfse_document_remote_events_invoice
  on public.nfse_document_remote_events (service_invoice_id, created_at desc);

create index if not exists idx_nfse_document_reconciliations_invoice
  on public.nfse_document_reconciliations (service_invoice_id, created_at desc);

create index if not exists idx_service_invoices_org_lifecycle
  on public.service_invoices (organization_id, status, transmission_state, lifecycle_synced_at desc);

alter table public.nfse_document_remote_events enable row level security;
alter table public.nfse_document_reconciliations enable row level security;

create policy "tenant select nfse_document_remote_events"
on public.nfse_document_remote_events
for select
using (public.is_member_of(organization_id));

create policy "tenant insert nfse_document_remote_events"
on public.nfse_document_remote_events
for insert
with check (public.is_member_of(organization_id));

create policy "tenant update nfse_document_remote_events"
on public.nfse_document_remote_events
for update
using (public.is_member_of(organization_id))
with check (public.is_member_of(organization_id));

create policy "tenant select nfse_document_reconciliations"
on public.nfse_document_reconciliations
for select
using (public.is_member_of(organization_id));

create policy "tenant insert nfse_document_reconciliations"
on public.nfse_document_reconciliations
for insert
with check (public.is_member_of(organization_id));
