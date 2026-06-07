-- Store optional notes for each paid savings cell.
-- Keys are cell numbers as strings, values are short user-entered notes.

alter table public.savings
  add column if not exists cell_notes jsonb not null default '{}'::jsonb;
