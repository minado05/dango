-- Dango schema
create extension if not exists "pgcrypto";

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
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
  save_count integer not null default 0,
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

create table public.follows (
  follower_id uuid not null references public.users(id) on delete cascade,
  followed_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id != followed_id)
);

create table public.saved_posts (
  user_id uuid not null references public.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
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
create index posts_user_id_idx on public.posts (user_id);
create index posts_caption_search_idx on public.posts using gin (to_tsvector('english', caption));
create index post_images_post_id_idx on public.post_images (post_id);
create index post_tags_tag_id_idx on public.post_tags (tag_id);
create index follows_followed_id_idx on public.follows (followed_id);
create index saved_posts_post_id_idx on public.saved_posts (post_id);

-- Keep posts.save_count in sync with saved_posts automatically,
-- instead of relying on client-side increment/decrement calls.
create or replace function public.update_post_save_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set save_count = save_count + 1 where id = new.post_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.posts set save_count = save_count - 1 where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger saved_posts_save_count
after insert or delete on public.saved_posts
for each row execute function public.update_post_save_count();

-- Auto-create a profile row whenever someone signs up via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    '/defaultprofilepic.png'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.users enable row level security;
alter table public.locations enable row level security;
alter table public.tags enable row level security;
alter table public.posts enable row level security;
alter table public.post_images enable row level security;
alter table public.post_tags enable row level security;
alter table public.follows enable row level security;
alter table public.saved_posts enable row level security;
alter table public.search_cache enable row level security;

create policy "Public read access" on public.users for select using (true);
create policy "Public read access" on public.locations for select using (true);
create policy "Public read access" on public.tags for select using (true);
create policy "Public read access" on public.posts for select using (true);
create policy "Public read access" on public.post_images for select using (true);
create policy "Public read access" on public.post_tags for select using (true);
create policy "Public read access" on public.follows for select using (true);
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

create policy "Users can follow" on public.follows
  for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow" on public.follows
  for delete using (auth.uid() = follower_id);

-- Only the saver can see which posts they've saved.
create policy "Users can view own saved posts" on public.saved_posts
  for select using (auth.uid() = user_id);

-- Enforced at the database level, not just the UI: can't save your own post.
create policy "Users can save posts" on public.saved_posts
  for insert with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.posts where posts.id = post_id and posts.user_id = auth.uid()
    )
  );
create policy "Users can unsave own saved posts" on public.saved_posts
  for delete using (auth.uid() = user_id);

-- Storage buckets for post images and profile avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

create policy "Avatar images are publicly accessible"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update their own avatar"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Post images are publicly accessible"
on storage.objects for select
using (bucket_id = 'post-images');

create policy "Users can upload their own post images"
on storage.objects for insert
with check (
  bucket_id = 'post-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);
