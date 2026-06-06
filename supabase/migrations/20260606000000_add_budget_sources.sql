-- Add multiple budget sources so each month can have separate income/expense tabs.

create table if not exists public.budget_sources (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true
);

alter table public.budget_sources enable row level security;

grant select, insert, update, delete on public.budget_sources to anon;
grant select, insert, update, delete on public.budget_sources to authenticated;

drop policy if exists "Allow anon read budget sources" on public.budget_sources;
drop policy if exists "Allow anon insert budget sources" on public.budget_sources;
drop policy if exists "Allow anon update budget sources" on public.budget_sources;
drop policy if exists "Allow anon delete budget sources" on public.budget_sources;
drop policy if exists "Allow authenticated read budget sources" on public.budget_sources;
drop policy if exists "Allow authenticated insert budget sources" on public.budget_sources;
drop policy if exists "Allow authenticated update budget sources" on public.budget_sources;
drop policy if exists "Allow authenticated delete budget sources" on public.budget_sources;

create policy "Allow anon read budget sources"
  on public.budget_sources for select
  to anon
  using (true);

create policy "Allow anon insert budget sources"
  on public.budget_sources for insert
  to anon
  with check (true);

create policy "Allow anon update budget sources"
  on public.budget_sources for update
  to anon
  using (true)
  with check (true);

create policy "Allow anon delete budget sources"
  on public.budget_sources for delete
  to anon
  using (true);

create policy "Allow authenticated read budget sources"
  on public.budget_sources for select
  to authenticated
  using (true);

create policy "Allow authenticated insert budget sources"
  on public.budget_sources for insert
  to authenticated
  with check (true);

create policy "Allow authenticated update budget sources"
  on public.budget_sources for update
  to authenticated
  using (true)
  with check (true);

create policy "Allow authenticated delete budget sources"
  on public.budget_sources for delete
  to authenticated
  using (true);

insert into public.budget_sources (id, name, sort_order, is_active)
values ('00000000-0000-0000-0000-000000000001', 'Nguồn chính', 0, true)
on conflict (id) do nothing;

alter table public.budget_months
  add column if not exists source_id uuid;

update public.budget_months
set source_id = '00000000-0000-0000-0000-000000000001'
where source_id is null;

alter table public.budget_months
  alter column source_id set not null;

alter table public.budget_months
  drop constraint if exists budget_months_source_id_fkey;

alter table public.budget_months
  add constraint budget_months_source_id_fkey
  foreign key (source_id)
  references public.budget_sources(id)
  on delete restrict;

alter table public.budget_months
  drop constraint if exists budget_months_month_key_key;

drop index if exists public.budget_months_month_key_key;
drop index if exists public.idx_budget_months_month_key;
drop index if exists public.idx_budget_months_source_month;

create unique index if not exists idx_budget_months_source_month
  on public.budget_months(source_id, month_key);

create index if not exists idx_budget_sources_active_order
  on public.budget_sources(is_active, sort_order, created_at);
