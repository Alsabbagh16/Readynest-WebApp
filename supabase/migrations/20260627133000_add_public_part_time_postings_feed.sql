create or replace function public.get_active_part_time_postings()
returns table (
  job_ref_id text,
  status text,
  preferred_date text,
  user_address jsonb,
  product_name text,
  is_shared_to_part_time boolean,
  slots_available integer,
  hours_needed numeric,
  hourly_pay numeric,
  transport_included boolean,
  shared_at timestamp with time zone
)
language sql
security definer
set search_path = public
as $$
  select
    jobs.job_ref_id,
    jobs.status,
    jobs.preferred_date::text,
    to_jsonb(jobs.user_address),
    coalesce(purchases.product_name, 'ReadyNest Service Job'),
    jobs.is_shared_to_part_time,
    jobs.slots_available,
    jobs.hours_needed::numeric,
    jobs.hourly_pay::numeric,
    jobs.transport_included,
    jobs.shared_at
  from public.jobs jobs
  left join public.purchases purchases
    on purchases.purchase_ref_id::text = jobs.purchase_ref_id::text
  where jobs.is_shared_to_part_time = true
    and jobs.slots_available > 0
  order by jobs.shared_at desc;
$$;

grant execute on function public.get_active_part_time_postings() to anon, authenticated;
