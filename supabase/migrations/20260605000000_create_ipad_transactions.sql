-- Create iPad trading table for purchase/sale profit tracking
create table if not exists public.ipad_transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  purchase_date date not null default current_date,
  device_name text not null,
  storage text,
  color text,
  serial_number text,
  purchase_price numeric(14, 2) not null check (purchase_price >= 0),
  extra_cost numeric(14, 2) not null default 0 check (extra_cost >= 0),
  selling_price numeric(14, 2) check (selling_price is null or selling_price >= 0),
  sale_date date,
  note text,
  total_cost numeric(14, 2) generated always as (purchase_price + extra_cost) stored,
  profit_amount numeric(14, 2) generated always as (
    case
      when selling_price is null then null
      else selling_price - purchase_price - extra_cost
    end
  ) stored,
  status text generated always as (
    case
      when selling_price is null then 'selling'
      else 'sold'
    end
  ) stored,
  constraint ipad_transactions_sale_date_required
    check (selling_price is null or sale_date is not null)
);

create index if not exists idx_ipad_transactions_purchase_date
  on public.ipad_transactions(purchase_date desc);

create index if not exists idx_ipad_transactions_status
  on public.ipad_transactions(status);

alter table public.ipad_transactions enable row level security;

grant select, insert, update, delete on public.ipad_transactions to anon;
grant select, insert, update, delete on public.ipad_transactions to authenticated;

create policy "Allow anon read ipad transactions"
  on public.ipad_transactions for select
  to anon
  using (true);

create policy "Allow anon insert ipad transactions"
  on public.ipad_transactions for insert
  to anon
  with check (true);

create policy "Allow anon update ipad transactions"
  on public.ipad_transactions for update
  to anon
  using (true)
  with check (true);

create policy "Allow anon delete ipad transactions"
  on public.ipad_transactions for delete
  to anon
  using (true);

create policy "Allow authenticated read ipad transactions"
  on public.ipad_transactions for select
  to authenticated
  using (true);

create policy "Allow authenticated insert ipad transactions"
  on public.ipad_transactions for insert
  to authenticated
  with check (true);

create policy "Allow authenticated update ipad transactions"
  on public.ipad_transactions for update
  to authenticated
  using (true)
  with check (true);

create policy "Allow authenticated delete ipad transactions"
  on public.ipad_transactions for delete
  to authenticated
  using (true);
