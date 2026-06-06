alter table public.budget_expenses
  add column if not exists record_type text not null default 'expense';

update public.budget_expenses
set record_type = 'expense'
where record_type is null;

alter table public.budget_expenses
  drop constraint if exists budget_expenses_record_type_check;

alter table public.budget_expenses
  add constraint budget_expenses_record_type_check
  check (record_type in ('expense', 'income'));

create index if not exists idx_budget_expenses_budget_record_type
  on public.budget_expenses(budget_id, record_type);
