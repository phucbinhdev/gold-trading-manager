-- Align an existing savings table with the app's Tích góp UI schema.
-- Some projects may already have a different public.savings table; keep extra
-- columns nullable and add the columns the Next.js page reads/writes.

alter table public.savings
  add column if not exists label text not null default 'Dây tích góp',
  add column if not exists period_amount int not null default 0,
  add column if not exists periods_left int not null default 0,
  add column if not exists remaining_amount int not null default 0,
  add column if not exists closed boolean not null default false,
  add column if not exists month_cells jsonb not null default '{}'::jsonb,
  add column if not exists cell_paid_at jsonb not null default '{}'::jsonb,
  add column if not exists cell_notes jsonb not null default '{}'::jsonb,
  add column if not exists closed_count int not null default 0;

-- The app does not send these older columns when creating a row. If they exist
-- from an earlier schema, make them optional so inserts from the app succeed.
alter table public.savings
  alter column user_id drop not null,
  alter column amount drop not null;

alter table public.savings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'savings' and policyname = 'Allow public read savings'
  ) then
    create policy "Allow public read savings" on public.savings for select to anon using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'savings' and policyname = 'Allow public insert savings'
  ) then
    create policy "Allow public insert savings" on public.savings for insert to anon with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'savings' and policyname = 'Allow public update savings'
  ) then
    create policy "Allow public update savings" on public.savings for update to anon using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'savings' and policyname = 'Allow public delete savings'
  ) then
    create policy "Allow public delete savings" on public.savings for delete to anon using (true);
  end if;
end $$;
