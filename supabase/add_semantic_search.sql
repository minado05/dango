-- Run this once in the SQL Editor to add semantic search to an existing
-- database that was already set up before this feature existed. Safe to
-- re-run — every statement here is idempotent.

create extension if not exists "vector";

alter table public.posts
  add column if not exists embedding vector(768);

create or replace function public.match_posts(
  query_embedding vector(768),
  match_count int default 10,
  filter_city text default null,
  filter_country text default null,
  filter_region text default null
)
returns setof public.posts
language sql
stable
as $$
  select p.*
  from public.posts p
  left join public.locations l on l.id = p.location_id
  where p.embedding is not null
    and (filter_city is null or l.city = filter_city)
    and (filter_country is null or l.country = filter_country)
    and (filter_region is null or l.region = filter_region)
  order by p.embedding <=> query_embedding
  limit match_count;
$$;
