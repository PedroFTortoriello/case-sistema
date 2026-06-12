alter table public.nfse_fiscal_settings
  add column if not exists next_number_value bigint not null default 1;

update public.nfse_fiscal_settings
set next_number_value = greatest(
  coalesce(nullif(regexp_replace(next_number_preview, '\D', '', 'g'), '')::bigint, 1),
  1
);

create or replace function public.reserve_nfse_sequence(target_setting uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  reserved_number bigint;
begin
  update public.nfse_fiscal_settings
  set
    next_number_value = next_number_value + 1,
    next_number_preview = lpad((next_number_value + 1)::text, 15, '0'),
    updated_at = timezone('utc', now())
  where id = target_setting
  returning next_number_value - 1 into reserved_number;

  if reserved_number is null then
    raise exception 'NFSE_SETTINGS_NOT_FOUND';
  end if;

  return reserved_number;
end;
$$;

grant execute on function public.reserve_nfse_sequence(uuid) to authenticated;

alter table public.service_invoices
  add column if not exists transmission_state text not null default 'idle',
  add column if not exists transmission_requested_at timestamptz,
  add column if not exists authorized_at timestamptz,
  add column if not exists last_synced_at timestamptz,
  add column if not exists idempotency_key text,
  add column if not exists dps_number bigint,
  add column if not exists dps_identifier text,
  add column if not exists access_key text,
  add column if not exists verification_code text,
  add column if not exists issue_attempts integer not null default 0,
  add column if not exists status_check_required boolean not null default false;

update public.service_invoices
set
  transmission_state = case
    when status = 'authorized' then 'authorized'
    when status = 'queued' then 'processing'
    when status = 'failed' then 'rejected'
    else 'idle'
  end,
  authorized_at = case when status = 'authorized' then coalesce(authorized_at, issued_at) else authorized_at end
where transmission_state = 'idle';

alter table public.service_invoices
  add constraint service_invoices_transmission_state_check
  check (transmission_state in ('idle', 'requested', 'processing', 'authorized', 'rejected', 'timeout_pending_query'));

create table if not exists public.nfse_document_rejections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  service_invoice_id uuid not null references public.service_invoices (id) on delete cascade,
  event_id uuid references public.service_invoice_events (id) on delete set null,
  attempt integer not null default 1,
  code text not null,
  message text not null,
  field text,
  detail jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id),
  resolution_note text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.nfse_document_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  service_invoice_id uuid not null references public.service_invoices (id) on delete cascade,
  event_id uuid references public.service_invoice_events (id) on delete set null,
  file_role text not null,
  environment public.nfse_environment not null,
  mime_type text not null,
  sha256_hash text not null,
  byte_size integer not null,
  content_text text,
  content_base64 text,
  is_locked boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  constraint nfse_document_files_content_check
    check ((content_text is not null and content_base64 is null) or (content_text is null and content_base64 is not null)),
  constraint nfse_document_files_role_check
    check (file_role in ('request_xml', 'response_xml', 'authorized_xml', 'danfse_pdf'))
);

create unique index if not exists idx_service_invoices_org_idempotency
  on public.service_invoices (organization_id, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists idx_service_invoices_org_dps_identifier
  on public.service_invoices (organization_id, dps_identifier)
  where dps_identifier is not null;

create unique index if not exists idx_service_invoices_org_access_key
  on public.service_invoices (organization_id, access_key)
  where access_key is not null;

create index if not exists idx_service_invoices_org_transmission
  on public.service_invoices (organization_id, status, transmission_state, status_check_required);

create index if not exists idx_nfse_document_rejections_invoice
  on public.nfse_document_rejections (service_invoice_id, created_at desc);

create index if not exists idx_nfse_document_files_invoice
  on public.nfse_document_files (service_invoice_id, created_at desc);

alter table public.nfse_document_rejections enable row level security;
alter table public.nfse_document_files enable row level security;

create policy "tenant select nfse_document_rejections"
on public.nfse_document_rejections
for select
using (public.is_member_of(organization_id));

create policy "tenant insert nfse_document_rejections"
on public.nfse_document_rejections
for insert
with check (public.is_member_of(organization_id));

create policy "tenant update nfse_document_rejections"
on public.nfse_document_rejections
for update
using (public.is_member_of(organization_id))
with check (public.is_member_of(organization_id));

create policy "tenant select nfse_document_files"
on public.nfse_document_files
for select
using (public.is_member_of(organization_id));

create policy "tenant insert nfse_document_files"
on public.nfse_document_files
for insert
with check (public.is_member_of(organization_id));
