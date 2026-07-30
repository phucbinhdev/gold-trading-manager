-- Lưu lịch sử giá vàng mỗi ngày để vẽ biểu đồ xu hướng trên app iOS.
-- Mỗi ngày một dòng (price_date là khóa chính) để upsert gọn.
create table if not exists public.gold_price_history (
  price_date date primary key,
  price numeric(14, 2) not null,
  created_at timestamptz not null default now()
);

alter table public.gold_price_history enable row level security;

-- Idempotent: gỡ policy cũ trước khi tạo lại (Postgres không có "create policy if not exists").
drop policy if exists "Allow public read gold_price_history" on public.gold_price_history;
create policy "Allow public read gold_price_history"
  on public.gold_price_history for select
  to anon
  using (true);

drop policy if exists "Allow public insert gold_price_history" on public.gold_price_history;
create policy "Allow public insert gold_price_history"
  on public.gold_price_history for insert
  to anon
  with check (true);

drop policy if exists "Allow public update gold_price_history" on public.gold_price_history;
create policy "Allow public update gold_price_history"
  on public.gold_price_history for update
  to anon
  using (true);
