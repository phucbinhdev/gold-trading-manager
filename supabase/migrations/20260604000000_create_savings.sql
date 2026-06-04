-- Create savings table for tracking goals/entries
create table if not exists public.savings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  label text not null,
  period_amount int not null,
  periods_left int not null default 0,
  remaining_amount int not null default 0,
  closed boolean not null default false,
  month_cells jsonb not null default '{}'::jsonb,
  closed_count int not null default 0
);

alter table public.savings enable row level security;

create policy "Allow public read savings"
  on public.savings for select
  to anon
  using (true);

create policy "Allow public insert savings"
  on public.savings for insert
  to anon
  with check (true);

create policy "Allow public update savings"
  on public.savings for update
  to anon
  using (true);

create policy "Allow public delete savings"
  on public.savings for delete
  to anon
  using (true);
