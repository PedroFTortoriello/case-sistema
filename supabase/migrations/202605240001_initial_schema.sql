create extension if not exists pgcrypto;

create type public.app_role as enum (
  'administrator',
  'financeiro',
  'operacional',
  'comercial',
  'diretor'
);

create type public.process_direction as enum ('import', 'export');
create type public.shipment_mode as enum ('air', 'sea', 'road', 'multimodal');
create type public.process_status as enum ('opening', 'documentation', 'in_transit', 'customs', 'finished');
create type public.awb_status as enum ('draft', 'issued', 'in_transit', 'delivered', 'closed');
create type public.document_type as enum ('awb', 'invoice', 'packing_list', 'di', 'bl', 'contract', 'other');
create type public.charge_status as enum ('open', 'paid', 'overdue', 'cancelled');
create type public.payment_method as enum ('boleto', 'pix', 'payment_link', 'international');
create type public.invoice_status as enum ('draft', 'queued', 'authorized', 'cancelled', 'failed');
create type public.email_status as enum ('draft', 'queued', 'sent', 'failed');
create type public.integration_kind as enum ('nfse', 'fx', 'email', 'erp', 'whatsapp', 'webhook');
create type public.job_status as enum ('pending', 'processing', 'completed', 'failed');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.current_organization_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(organization_id), '{}'::uuid[])
  from public.user_memberships
  where user_id = auth.uid();
$$;

create or replace function public.is_member_of(target_organization uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_organization = any(public.current_organization_ids());
$$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  trade_name text not null,
  document_number text not null unique,
  timezone text not null default 'America/Sao_Paulo',
  nfse_provider text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  job_title text,
  phone text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.user_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, user_id)
);

create table public.cost_centers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code text not null,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  legal_name text not null,
  trade_name text,
  document_number text not null,
  email text,
  phone text,
  default_currency_code text not null default 'USD',
  default_spread numeric(10,4) not null default 0,
  billing_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, document_number)
);

create table public.carriers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  mode public.shipment_mode not null,
  contact_email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  country_code text,
  email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.ports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code text not null,
  name text not null,
  country_code text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create table public.airports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code text not null,
  name text not null,
  country_code text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create table public.currencies (
  code text primary key,
  name text not null,
  symbol text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.processes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code text not null,
  client_id uuid not null references public.clients (id) on delete restrict,
  direction public.process_direction not null,
  shipment_mode public.shipment_mode not null,
  status public.process_status not null default 'opening',
  incoterm text not null,
  origin_code text not null,
  destination_code text not null,
  commercial_owner_id uuid references auth.users (id),
  operational_owner_id uuid references auth.users (id),
  financial_owner_id uuid references auth.users (id),
  expected_departure_date date,
  expected_arrival_date date,
  opened_at timestamptz not null default timezone('utc', now()),
  closed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create table public.process_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  process_id uuid not null references public.processes (id) on delete cascade,
  event_type text not null,
  title text not null,
  description text,
  happened_at timestamptz not null default timezone('utc', now()),
  actor_user_id uuid references auth.users (id),
  metadata jsonb not null default '{}'::jsonb
);

create table public.awbs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  process_id uuid not null references public.processes (id) on delete cascade,
  number text not null,
  airline_name text not null,
  status public.awb_status not null default 'draft',
  origin_code text not null,
  destination_code text not null,
  weight_kg numeric(14,3),
  volume_m3 numeric(14,3),
  cargo_value numeric(14,2),
  issued_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, number)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  process_id uuid not null references public.processes (id) on delete cascade,
  type public.document_type not null,
  title text not null,
  current_version integer not null default 1,
  storage_bucket text not null,
  storage_path text not null,
  ocr_status text,
  signed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  version_number integer not null,
  storage_path text not null,
  checksum text,
  uploaded_by uuid references auth.users (id),
  uploaded_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  unique (document_id, version_number)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  process_id uuid not null references public.processes (id) on delete cascade,
  title text not null,
  due_at timestamptz,
  completed_at timestamptz,
  assignee_user_id uuid references auth.users (id),
  sla_minutes integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.fx_rate_tables (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  currency_code text not null references public.currencies (code),
  spread numeric(10,4) not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.fx_quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  currency_code text not null references public.currencies (code),
  source text not null,
  official_rate numeric(14,6) not null,
  client_rate numeric(14,6),
  quoted_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.service_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  process_id uuid references public.processes (id) on delete set null,
  client_id uuid not null references public.clients (id) on delete restrict,
  cost_center_id uuid references public.cost_centers (id) on delete set null,
  provider text not null,
  external_reference text,
  status public.invoice_status not null default 'draft',
  service_description text not null,
  service_code text not null,
  amount numeric(14,2) not null,
  taxes jsonb not null default '{}'::jsonb,
  xml_path text,
  pdf_path text,
  issued_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.charges (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  process_id uuid references public.processes (id) on delete set null,
  client_id uuid not null references public.clients (id) on delete restrict,
  service_invoice_id uuid references public.service_invoices (id) on delete set null,
  currency_code text not null references public.currencies (code),
  payment_method public.payment_method not null,
  status public.charge_status not null default 'open',
  gross_amount numeric(14,2) not null,
  net_amount numeric(14,2),
  locked_fx_rate numeric(14,6),
  due_date date not null,
  paid_at timestamptz,
  installments integer not null default 1,
  external_reference text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  charge_id uuid not null references public.charges (id) on delete cascade,
  event_type text not null,
  amount numeric(14,2),
  payload jsonb not null default '{}'::jsonb,
  happened_at timestamptz not null default timezone('utc', now())
);

create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  module text not null,
  subject_template text not null,
  body_template text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, name)
);

create table public.email_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  process_id uuid references public.processes (id) on delete set null,
  template_id uuid references public.email_templates (id) on delete set null,
  status public.email_status not null default 'draft',
  subject text not null,
  to_list text[] not null default '{}',
  cc_list text[] not null default '{}',
  body text not null,
  sent_at timestamptz,
  provider_message_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind public.integration_kind not null,
  provider text not null,
  status text not null default 'inactive',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, kind, provider)
);

create table public.webhooks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  event_name text not null,
  target_url text not null,
  secret text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.async_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  job_type text not null,
  status public.job_status not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  attempts integer not null default 0,
  last_error text,
  available_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_user_id uuid references auth.users (id),
  module text not null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  trace_id text,
  ip_address inet,
  user_agent text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

insert into public.currencies (code, name, symbol)
values
  ('BRL', 'Real brasileiro', 'R$'),
  ('USD', 'Dolar americano', '$'),
  ('EUR', 'Euro', 'EUR')
on conflict (code) do nothing;

create index idx_processes_org_status on public.processes (organization_id, status);
create index idx_process_events_process on public.process_events (process_id, happened_at desc);
create index idx_awbs_process on public.awbs (process_id);
create index idx_documents_process on public.documents (process_id);
create index idx_tasks_process on public.tasks (process_id, due_at);
create index idx_fx_quotes_org_currency on public.fx_quotes (organization_id, currency_code, quoted_at desc);
create index idx_service_invoices_org_status on public.service_invoices (organization_id, status);
create index idx_charges_org_status_due on public.charges (organization_id, status, due_date);
create index idx_payment_events_charge on public.payment_events (charge_id, happened_at desc);
create index idx_email_messages_process on public.email_messages (process_id, created_at desc);
create index idx_async_jobs_status_available on public.async_jobs (status, available_at);
create index idx_audit_logs_org_created on public.audit_logs (organization_id, created_at desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'organizations',
    'user_profiles',
    'user_memberships',
    'cost_centers',
    'clients',
    'carriers',
    'agents',
    'ports',
    'airports',
    'processes',
    'awbs',
    'documents',
    'tasks',
    'fx_rate_tables',
    'service_invoices',
    'charges',
    'email_templates',
    'email_messages',
    'integrations',
    'webhooks',
    'async_jobs'
  ]
  loop
    execute format(
      'create trigger set_%1$s_updated_at before update on public.%1$s for each row execute function public.set_updated_at();',
      table_name
    );
  end loop;
end $$;

alter table public.organizations enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_memberships enable row level security;
alter table public.cost_centers enable row level security;
alter table public.clients enable row level security;
alter table public.carriers enable row level security;
alter table public.agents enable row level security;
alter table public.ports enable row level security;
alter table public.airports enable row level security;
alter table public.processes enable row level security;
alter table public.process_events enable row level security;
alter table public.awbs enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.tasks enable row level security;
alter table public.fx_rate_tables enable row level security;
alter table public.fx_quotes enable row level security;
alter table public.service_invoices enable row level security;
alter table public.charges enable row level security;
alter table public.payment_events enable row level security;
alter table public.email_templates enable row level security;
alter table public.email_messages enable row level security;
alter table public.integrations enable row level security;
alter table public.webhooks enable row level security;
alter table public.async_jobs enable row level security;
alter table public.audit_logs enable row level security;

create policy "user can read own profile"
on public.user_profiles
for select
using (user_id = auth.uid());

create policy "user can read memberships"
on public.user_memberships
for select
using (user_id = auth.uid() or public.is_member_of(organization_id));

create policy "member can read organization"
on public.organizations
for select
using (public.is_member_of(id));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'cost_centers',
    'clients',
    'carriers',
    'agents',
    'ports',
    'airports',
    'processes',
    'process_events',
    'awbs',
    'documents',
    'document_versions',
    'tasks',
    'fx_rate_tables',
    'fx_quotes',
    'service_invoices',
    'charges',
    'payment_events',
    'email_templates',
    'email_messages',
    'integrations',
    'webhooks',
    'async_jobs',
    'audit_logs'
  ]
  loop
    execute format(
      'create policy "tenant access %1$s" on public.%1$s for select using (public.is_member_of(organization_id));',
      table_name
    );
  end loop;
end $$;
