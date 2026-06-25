alter table public.employees
  add column if not exists internal_notes jsonb not null default '[]'::jsonb;
