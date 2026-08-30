create table if not exists public.blogs (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  image_url text,
  body_html text not null check (length(trim(body_html)) > 0),
  author text not null check (length(trim(author)) > 0),
  published_at timestamptz not null,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blogs_published_at_idx on public.blogs (published_at desc);

insert into public.ui_permissions (key, description, module)
values
  ('tab.blog_management.view', 'View Blog Management', 'settings'),
  ('blogs.manage', 'Create, edit, and delete blog posts', 'settings')
on conflict (key) do update set
  description = excluded.description,
  module = excluded.module;

create or replace function public.has_blog_permission(p_permission text, p_allow_legacy_admin boolean default false)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees employee
    where employee.id = auth.uid()
      and employee.role in ('admin', 'superadmin', 'staff')
      and (
        employee.role = 'superadmin'
        or employee.is_superadmin = true
        or (
          p_allow_legacy_admin
          and employee.role = 'admin'
          and not exists (
            select 1 from public.ui_employee_roles employee_roles
            where employee_roles.employee_id = employee.id
          )
        )
        or exists (
          select 1
          from public.ui_employee_roles employee_roles
          join public.ui_role_permissions role_permissions on role_permissions.role_id = employee_roles.role_id
          join public.ui_permissions permissions on permissions.id = role_permissions.permission_id
          where employee_roles.employee_id = employee.id
            and permissions.key = p_permission
        )
      )
  );
$$;

revoke all on function public.has_blog_permission(text, boolean) from public, anon;
grant execute on function public.has_blog_permission(text, boolean) to authenticated;

alter table public.blogs enable row level security;

create policy "Public reads published blogs" on public.blogs
for select to anon, authenticated
using (published_at <= now());

create policy "Blog viewers read all blogs" on public.blogs
for select to authenticated
using (public.has_blog_permission('tab.blog_management.view', true));

create policy "Blog managers create blogs" on public.blogs
for insert to authenticated
with check (public.has_blog_permission('blogs.manage', true));

create policy "Blog managers update blogs" on public.blogs
for update to authenticated
using (public.has_blog_permission('blogs.manage', true))
with check (public.has_blog_permission('blogs.manage', true));

create policy "Blog managers delete blogs" on public.blogs
for delete to authenticated
using (public.has_blog_permission('blogs.manage', true));
