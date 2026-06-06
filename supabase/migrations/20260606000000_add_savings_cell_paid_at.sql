-- Store the timestamp for each paid savings cell.
-- Keys are cell numbers as strings, values are ISO timestamptz strings.

alter table public.savings
  add column if not exists cell_paid_at jsonb not null default '{}'::jsonb;
