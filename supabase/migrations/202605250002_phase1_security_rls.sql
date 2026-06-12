create or replace function public.has_any_role(
  target_organization uuid,
  allowed_roles public.app_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_memberships
    where user_id = auth.uid()
      and organization_id = target_organization
      and role = any(allowed_roles)
  );
$$;

create index if not exists idx_user_memberships_user_org
  on public.user_memberships (user_id, organization_id);

create index if not exists idx_user_memberships_org_role
  on public.user_memberships (organization_id, role);

create index if not exists idx_documents_org_created
  on public.documents (organization_id, created_at desc);

create index if not exists idx_payment_events_org_happened
  on public.payment_events (organization_id, happened_at desc);

drop policy if exists "user can read memberships" on public.user_memberships;
drop policy if exists "member can read organization" on public.organizations;

create policy "organization read by member"
on public.organizations
for select
using (public.is_member_of(id));

create policy "membership read own or org admin"
on public.user_memberships
for select
using (
  user_id = auth.uid()
  or public.has_any_role(
    organization_id,
    array['administrator', 'diretor']::public.app_role[]
  )
);

create policy "membership insert by org admin"
on public.user_memberships
for insert
with check (
  public.has_any_role(
    organization_id,
    array['administrator', 'diretor']::public.app_role[]
  )
);

create policy "membership update by org admin"
on public.user_memberships
for update
using (
  public.has_any_role(
    organization_id,
    array['administrator', 'diretor']::public.app_role[]
  )
)
with check (
  public.has_any_role(
    organization_id,
    array['administrator', 'diretor']::public.app_role[]
  )
);

create policy "membership delete by org admin"
on public.user_memberships
for delete
using (
  public.has_any_role(
    organization_id,
    array['administrator', 'diretor']::public.app_role[]
  )
);

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
    'async_jobs'
  ]
  loop
    execute format('drop policy if exists "tenant access %1$s" on public.%1$s;', table_name);
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

drop policy if exists "tenant access audit_logs" on public.audit_logs;

create policy "audit select by org admin"
on public.audit_logs
for select
using (
  public.has_any_role(
    organization_id,
    array['administrator', 'diretor']::public.app_role[]
  )
);

create policy "audit insert by tenant actor"
on public.audit_logs
for insert
with check (
  public.is_member_of(organization_id)
  and actor_user_id = auth.uid()
);
