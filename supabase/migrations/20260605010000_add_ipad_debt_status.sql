-- Track whether the borrowed money for each iPad purchase has been repaid
alter table public.ipad_transactions
  add column if not exists loan_amount numeric(14, 2),
  add column if not exists debt_paid boolean not null default false,
  add column if not exists debt_paid_at timestamptz;

update public.ipad_transactions
set loan_amount = total_cost
where loan_amount is null;

alter table public.ipad_transactions
  alter column loan_amount set default 0,
  alter column loan_amount set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ipad_transactions_loan_amount_check'
  ) then
    alter table public.ipad_transactions
      add constraint ipad_transactions_loan_amount_check
      check (loan_amount >= 0);
  end if;
end $$;

create index if not exists idx_ipad_transactions_debt_paid
  on public.ipad_transactions(debt_paid);
