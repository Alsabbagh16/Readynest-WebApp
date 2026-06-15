alter table public.employees
  add column if not exists visible_in_job_assignment boolean not null default true,
  add column if not exists is_part_timer boolean not null default false;

update public.employees
set visible_in_job_assignment = true
where visible_in_job_assignment is null;

update public.employees
set is_part_timer = true
where position = 'Part Timer'
  and is_part_timer is distinct from true;
