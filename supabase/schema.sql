-- Dango schema
create extension if not exists "pgcrypto";

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  bio text not null default '',
  avatar_url text not null default '',
  created_at timestamptz not null default now()
);

create table public.locations (
  id bigint generated always as identity primary key,
  city text not null,
  country text not null,
  region text not null,
  unique (city, country)
);

create table public.tags (
  id bigint generated always as identity primary key,
  name text not null unique,
  category text not null check (category in ('cuisine', 'price'))
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  location_id bigint not null references public.locations(id),
  caption text not null default '',
  like_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  url text not null,
  position integer not null default 0
);

create table public.post_tags (
  post_id uuid not null references public.posts(id) on delete cascade,
  tag_id bigint not null references public.tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

create table public.search_cache (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  summary text not null,
  post_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index posts_location_id_idx on public.posts (location_id);
create index posts_caption_search_idx on public.posts using gin (to_tsvector('english', caption));
create index post_images_post_id_idx on public.post_images (post_id);
create index post_tags_tag_id_idx on public.post_tags (tag_id);

alter table public.users enable row level security;
alter table public.locations enable row level security;
alter table public.tags enable row level security;
alter table public.posts enable row level security;
alter table public.post_images enable row level security;
alter table public.post_tags enable row level security;
alter table public.search_cache enable row level security;

create policy "Public read access" on public.users for select using (true);
create policy "Public read access" on public.locations for select using (true);
create policy "Public read access" on public.tags for select using (true);
create policy "Public read access" on public.posts for select using (true);
create policy "Public read access" on public.post_images for select using (true);
create policy "Public read access" on public.post_tags for select using (true);
create policy "Public read access" on public.search_cache for select using (true);

create policy "Users can insert own profile" on public.users
  for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

create policy "Users can insert own posts" on public.posts
  for insert with check (auth.uid() = user_id);
create policy "Users can update own posts" on public.posts
  for update using (auth.uid() = user_id);
create policy "Users can delete own posts" on public.posts
  for delete using (auth.uid() = user_id);

create policy "Users can manage images on own posts" on public.post_images
  for all using (
    exists (
      select 1 from public.posts
      where posts.id = post_images.post_id and posts.user_id = auth.uid()
    )
  );

create policy "Users can manage tags on own posts" on public.post_tags
  for all using (
    exists (
      select 1 from public.posts
      where posts.id = post_tags.post_id and posts.user_id = auth.uid()
    )
  );
