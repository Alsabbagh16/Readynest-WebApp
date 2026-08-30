alter table public.blogs
  add column if not exists slug text,
  add column if not exists seo_title text,
  add column if not exists seo_description text;

update public.blogs
set slug = 'blog-' || id::text
where slug is null or trim(slug) = '';

alter table public.blogs
  alter column slug set not null;

alter table public.blogs
  drop constraint if exists blogs_slug_format_check;

alter table public.blogs
  add constraint blogs_slug_format_check
  check (length(slug) between 3 and 100 and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

alter table public.blogs
  drop constraint if exists blogs_seo_title_length_check,
  drop constraint if exists blogs_seo_description_length_check;

alter table public.blogs
  add constraint blogs_seo_title_length_check check (seo_title is null or length(seo_title) <= 70),
  add constraint blogs_seo_description_length_check check (seo_description is null or length(seo_description) <= 180);

create unique index if not exists blogs_slug_unique_idx on public.blogs (slug);
