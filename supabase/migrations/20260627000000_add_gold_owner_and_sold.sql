-- Quản lý vàng theo từng người (Bình / Tú) và đánh dấu đã bán.
-- An toàn chạy lại nhiều lần (idempotent), kể cả khi đã chạy bản cũ có 'chung'.
alter table public.transactions
  add column if not exists owner text not null default 'binh',
  add column if not exists is_sold boolean not null default false,
  add column if not exists sold_date date,
  add column if not exists sold_price_per_chi numeric(14, 2);

-- Đảm bảo default đúng kể cả khi cột đã tạo từ phiên bản trước.
alter table public.transactions alter column owner set default 'binh';

-- Chuyển mọi giá trị không hợp lệ (vd 'chung' của bản cũ) về 'binh'.
update public.transactions
set owner = 'binh'
where owner is null or owner not in ('binh', 'tu');

-- Tạo lại ràng buộc cho đúng tập giá trị hiện tại.
alter table public.transactions drop constraint if exists transactions_owner_check;
alter table public.transactions
  add constraint transactions_owner_check check (owner in ('binh', 'tu'));

create index if not exists idx_transactions_owner on public.transactions(owner);
create index if not exists idx_transactions_is_sold on public.transactions(is_sold);
