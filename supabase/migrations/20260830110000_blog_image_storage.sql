alter table public.blogs
  add column if not exists image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-images',
  'blog-images',
  true,
  5242880,
  array['image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public reads blog images" on storage.objects
for select to public
using (bucket_id = 'blog-images');

create policy "Blog managers upload blog images" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'blog-images'
  and public.has_blog_permission('blogs.manage', true)
);

create policy "Blog managers update blog images" on storage.objects
for update to authenticated
using (
  bucket_id = 'blog-images'
  and public.has_blog_permission('blogs.manage', true)
)
with check (
  bucket_id = 'blog-images'
  and public.has_blog_permission('blogs.manage', true)
);

create policy "Blog managers delete blog images" on storage.objects
for delete to authenticated
using (
  bucket_id = 'blog-images'
  and public.has_blog_permission('blogs.manage', true)
);

