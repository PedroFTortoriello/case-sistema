do $$
begin
  if not exists (select 1 from pg_type where typname = 'nfse_environment') then
    create type public.nfse_environment as enum ('homologation', 'production');
  end if;

  if not exists (select 1 from pg_type where typname = 'nfse_validation_status') then
    create type public.nfse_validation_status as enum ('pending', 'valid', 'invalid');
  end if;

  if not exists (select 1 from pg_type where typname = 'fiscal_person_type') then
    create type public.fiscal_person_type as enum ('legal_entity', 'individual', 'foreign');
  end if;

  if not exists (select 1 from pg_type where typname = 'tax_rule_origin') then
    create type public.tax_rule_origin as enum ('catalog', 'manual', 'pending');
  end if;
end $$;

alter type public.invoice_status add value if not exists 'ready_for_issue';

create table public.nfse_fiscal_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  municipality_code text not null,
  municipality_name text not null,
  state_code text not null,
  provider_type text not null,
  adapter_type text not null,
  environment public.nfse_environment not null default 'homologation',
  layout_version text not null,
  documentation_reference text not null,
  document_series text not null,
  next_number_preview text not null,
  is_active boolean not null default false,
  validation_status public.nfse_validation_status not null default 'pending',
  credential_reference text,
  certificate_reference text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id)
);

create table public.organization_fiscal_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  legal_name text not null,
  trade_name text not null,
  document_number text not null,
  municipal_registration text not null,
  tax_regime text not null,
  simple_national_opt_in boolean not null default false,
  cnae_code text not null,
  tax_incentive_code text,
  email text not null,
  phone text not null,
  postal_code text not null,
  street text not null,
  number text not null,
  neighborhood text not null,
  complement text,
  municipality_code text not null,
  municipality_name text not null,
  state_code text not null,
  country_code text not null default 'BR',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id)
);

create table public.client_fiscal_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  person_type public.fiscal_person_type not null,
  legal_name text not null,
  trade_name text,
  document_number text not null,
  municipal_registration text,
  state_registration text,
  email text not null,
  phone text not null,
  postal_code text,
  street text,
  number text,
  neighborhood text,
  complement text,
  municipality_code text,
  municipality_name text not null,
  state_code text,
  country_code text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (client_id),
  unique (organization_id, client_id)
);

create table public.taxable_services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  default_description text not null,
  list_service_item text not null,
  municipal_service_code text not null,
  national_taxation_code text not null,
  cnae_code text,
  incidence_municipality_code text not null,
  incidence_municipality_name text not null,
  incidence_state_code text not null,
  iss_rate numeric(10,4) not null,
  iss_rate_origin public.tax_rule_origin not null default 'pending',
  taxation_nature text not null,
  iss_exigibility text not null,
  is_iss_withheld_by_default boolean not null default false,
  allows_deductions boolean not null default false,
  version integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create table public.taxable_service_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  taxable_service_id uuid not null references public.taxable_services (id) on delete cascade,
  version integer not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default timezone('utc', now()),
  unique (taxable_service_id, version)
);

alter table public.service_invoices
  add column if not exists client_fiscal_profile_id uuid references public.client_fiscal_profiles (id) on delete set null,
  add column if not exists charge_id uuid references public.charges (id) on delete set null,
  add column if not exists fiscal_settings_id uuid references public.nfse_fiscal_settings (id) on delete set null,
  add column if not exists taxable_service_id uuid references public.taxable_services (id) on delete set null,
  add column if not exists competence_date date,
  add column if not exists service_date date,
  add column if not exists intended_issue_date date,
  add column if not exists layout_version text,
  add column if not exists documentation_reference text,
  add column if not exists validation_status public.nfse_validation_status not null default 'pending',
  add column if not exists readiness_issues jsonb not null default '[]'::jsonb,
  add column if not exists provider_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists taker_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists service_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists amounts_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists taxes_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists prepared_by uuid references auth.users (id) on delete set null,
  add column if not exists ready_for_issue_at timestamptz,
  add column if not exists currency_code text references public.currencies (code) not null default 'BRL',
  add column if not exists service_amount numeric(14,2) not null default 0,
  add column if not exists discount_amount numeric(14,2) not null default 0,
  add column if not exists conditional_discount_amount numeric(14,2) not null default 0,
  add column if not exists deduction_amount numeric(14,2) not null default 0,
  add column if not exists taxable_amount numeric(14,2) not null default 0,
  add column if not exists iss_amount numeric(14,2) not null default 0,
  add column if not exists retained_amount numeric(14,2) not null default 0,
  add column if not exists nfse_number text,
  add column if not exists nfse_verification_code text,
  add column if not exists integration_protocol text,
  add column if not exists xml_storage_path text,
  add column if not exists pdf_storage_path text;

update public.service_invoices
set
  service_amount = coalesce(amount, 0),
  taxable_amount = greatest(coalesce(amount, 0) - coalesce(discount_amount, 0) - coalesce(deduction_amount, 0), 0),
  competence_date = coalesce(competence_date, (issued_at at time zone 'utc')::date, current_date),
  service_date = coalesce(service_date, (issued_at at time zone 'utc')::date, current_date),
  intended_issue_date = coalesce(intended_issue_date, (issued_at at time zone 'utc')::date, current_date),
  layout_version = coalesce(layout_version, 'phase2-draft'),
  documentation_reference = coalesce(documentation_reference, 'internal-draft-preparation'),
  amounts_snapshot = case
    when amounts_snapshot = '{}'::jsonb then jsonb_build_object(
      'currencyCode', coalesce(currency_code, 'BRL'),
      'serviceAmount', to_char(coalesce(amount, 0), 'FM999999999999990.00'),
      'discountAmount', to_char(coalesce(discount_amount, 0), 'FM999999999999990.00'),
      'conditionalDiscountAmount', to_char(coalesce(conditional_discount_amount, 0), 'FM999999999999990.00'),
      'deductionAmount', to_char(coalesce(deduction_amount, 0), 'FM999999999999990.00')
    )
    else amounts_snapshot
  end,
  taxes_snapshot = case
    when taxes_snapshot = '{}'::jsonb then coalesce(taxes, '{}'::jsonb)
    else taxes_snapshot
  end,
  provider_snapshot = case
    when provider_snapshot = '{}'::jsonb then jsonb_build_object('providerLabel', provider)
    else provider_snapshot
  end,
  taker_snapshot = case
    when taker_snapshot = '{}'::jsonb then jsonb_build_object('clientId', client_id)
    else taker_snapshot
  end,
  service_snapshot = case
    when service_snapshot = '{}'::jsonb then jsonb_build_object(
      'serviceCode', service_code,
      'serviceDescription', service_description
    )
    else service_snapshot
  end;

alter table public.service_invoices
  add constraint service_invoices_ready_has_no_issues
  check (
    status <> 'ready_for_issue'
    or (
      jsonb_typeof(readiness_issues) = 'array'
      and jsonb_array_length(readiness_issues) = 0
    )
  );

create table public.service_invoice_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  service_invoice_id uuid not null references public.service_invoices (id) on delete cascade,
  actor_user_id uuid references auth.users (id),
  event_type text not null,
  status_from public.invoice_status,
  status_to public.invoice_status,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index idx_nfse_fiscal_settings_org on public.nfse_fiscal_settings (organization_id, is_active);
create index idx_org_fiscal_profiles_org on public.organization_fiscal_profiles (organization_id);
create index idx_client_fiscal_profiles_org_doc on public.client_fiscal_profiles (organization_id, document_number);
create index idx_taxable_services_org_active on public.taxable_services (organization_id, is_active);
create index idx_taxable_service_versions_service on public.taxable_service_versions (taxable_service_id, version desc);
create index idx_service_invoices_org_validation on public.service_invoices (organization_id, status, validation_status);
create index idx_service_invoice_events_invoice on public.service_invoice_events (service_invoice_id, created_at desc);

create trigger set_nfse_fiscal_settings_updated_at
before update on public.nfse_fiscal_settings
for each row execute function public.set_updated_at();

create trigger set_organization_fiscal_profiles_updated_at
before update on public.organization_fiscal_profiles
for each row execute function public.set_updated_at();

create trigger set_client_fiscal_profiles_updated_at
before update on public.client_fiscal_profiles
for each row execute function public.set_updated_at();

create trigger set_taxable_services_updated_at
before update on public.taxable_services
for each row execute function public.set_updated_at();

alter table public.nfse_fiscal_settings enable row level security;
alter table public.organization_fiscal_profiles enable row level security;
alter table public.client_fiscal_profiles enable row level security;
alter table public.taxable_services enable row level security;
alter table public.taxable_service_versions enable row level security;
alter table public.service_invoice_events enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'nfse_fiscal_settings',
    'organization_fiscal_profiles',
    'client_fiscal_profiles',
    'taxable_services'
  ]
  loop
    execute format(
      'create policy "tenant select %1$s" on public.%1$s for select using (public.is_member_of(organization_id));',
      table_name
    );
    execute format(
      'create policy "tenant insert %1$s" on public.%1$s for insert with check (public.is_member_of(organization_id));',
      table_name
    );
    execute format(
      'create policy "tenant update %1$s" on public.%1$s for update using (public.is_member_of(organization_id)) with check (public.is_member_of(organization_id));',
      table_name
    );
    execute format(
      'create policy "tenant delete %1$s" on public.%1$s for delete using (public.is_member_of(organization_id));',
      table_name
    );
  end loop;
end $$;

create policy "tenant select taxable_service_versions"
on public.taxable_service_versions
for select
using (public.is_member_of(organization_id));

create policy "tenant insert taxable_service_versions"
on public.taxable_service_versions
for insert
with check (public.is_member_of(organization_id));

create policy "tenant select service_invoice_events"
on public.service_invoice_events
for select
using (public.is_member_of(organization_id));

create policy "tenant insert service_invoice_events"
on public.service_invoice_events
for insert
with check (public.is_member_of(organization_id));
