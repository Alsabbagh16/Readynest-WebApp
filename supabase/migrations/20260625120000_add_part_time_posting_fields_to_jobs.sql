alter table public.jobs
  add column if not exists is_shared_to_part_time boolean not null default false,
  add column if not exists slots_available integer,
  add column if not exists hours_needed numeric,
  add column if not exists hourly_pay numeric,
  add column if not exists transport_included boolean not null default false,
  add column if not exists shared_at timestamp with time zone;

create index if not exists jobs_part_time_postings_idx
  on public.jobs (is_shared_to_part_time, slots_available, shared_at desc)
  where is_shared_to_part_time = true;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'jobs'
      and policyname = 'Public can read active part time postings'
  ) then
    create policy "Public can read active part time postings"
      on public.jobs
      for select
      to anon, authenticated
      using (
        is_shared_to_part_time = true
        and slots_available > 0
      );
  end if;
end $$;
