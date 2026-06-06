-- Make iPad status editable with inventory workflow states.
drop index if exists public.idx_ipad_transactions_status;

alter table public.ipad_transactions
  drop column if exists status;

alter table public.ipad_transactions
  add column status text not null default 'in_stock';

update public.ipad_transactions
set status = case
  when selling_price is not null then 'sold'
  else 'in_stock'
end;

alter table public.ipad_transactions
  add constraint ipad_transactions_status_check
  check (status in ('importing', 'in_stock', 'sold'));

create index if not exists idx_ipad_transactions_status
  on public.ipad_transactions(status);
