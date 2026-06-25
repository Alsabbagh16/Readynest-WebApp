alter table public.part_time_applications
  add column if not exists admin_hidden_at timestamp with time zone;

create index if not exists part_time_applications_admin_hidden_idx
  on public.part_time_applications (job_ref_id, admin_hidden_at);

create or replace function public.hide_declined_part_time_application(p_application_id bigint)
returns table (
  id bigint,
  job_ref_id text,
  status text,
  admin_hidden_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.part_time_applications applications
  set admin_hidden_at = now()
  where applications.id = p_application_id
    and applications.status = 'declined'
  returning
    applications.id,
    applications.job_ref_id,
    applications.status,
    applications.admin_hidden_at;
end;
$$;

grant execute on function public.hide_declined_part_time_application(bigint) to authenticated;
