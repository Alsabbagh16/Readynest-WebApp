alter table public.purchases
  add column if not exists agreement_document_path text,
  add column if not exists agreement_signed_at timestamp with time zone,
  add column if not exists agreement_file_name text;

insert into storage.buckets (id, name, public)
values ('purchase-agreements', 'purchase-agreements', false)
on conflict (id) do nothing;

drop policy if exists "Authenticated users read purchase agreements" on storage.objects;
drop policy if exists "Authenticated users upload purchase agreements" on storage.objects;
drop policy if exists "Authenticated users update purchase agreements" on storage.objects;
drop policy if exists "Authenticated users delete purchase agreements" on storage.objects;

create policy "Authenticated users read purchase agreements" on storage.objects for select to authenticated
  using (bucket_id = 'purchase-agreements');

create policy "Authenticated users upload purchase agreements" on storage.objects for insert to authenticated
  with check (bucket_id = 'purchase-agreements');

create policy "Authenticated users update purchase agreements" on storage.objects for update to authenticated
  using (bucket_id = 'purchase-agreements')
  with check (bucket_id = 'purchase-agreements');

create policy "Authenticated users delete purchase agreements" on storage.objects for delete to authenticated
  using (bucket_id = 'purchase-agreements');
