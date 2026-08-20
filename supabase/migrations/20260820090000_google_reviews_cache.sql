create table if not exists public.google_reviews_cache (
  place_id text primary key,
  reviews jsonb not null default '[]'::jsonb,
  rating numeric,
  user_rating_count integer,
  google_maps_uri text,
  fetched_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.google_reviews_cache enable row level security;

drop policy if exists "Service role manages google reviews cache" on public.google_reviews_cache;
create policy "Service role manages google reviews cache"
  on public.google_reviews_cache
  for all
  to service_role
  using (true)
  with check (true);
