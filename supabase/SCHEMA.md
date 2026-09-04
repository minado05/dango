# Database Schema

How the tables in `schema.sql` fit together and what each one is for.

## Diagram

```mermaid
erDiagram
    auth_users["auth.users (Supabase Auth)"] ||--|| users : "1 profile per account"
    users ||--o{ posts : "writes"
    users ||--o{ follows : "follows (follower_id)"
    users ||--o{ follows : "is followed (followed_id)"
    users ||--o{ saved_posts : "saves"
    locations ||--o{ posts : "posted in"
    posts ||--o{ post_images : "has"
    posts ||--o{ post_tags : "tagged"
    tags ||--o{ post_tags : "applied to posts"
    posts ||--o{ saved_posts : "saved by users"
```

## Tables

### `auth.users` (built into Supabase, not in `schema.sql`)
The actual login accounts — email, hashed password, session tokens. Managed entirely by Supabase Auth.
You never query this directly from the app. Every other user-related table hangs off this one via `id`.

### `users` (public profile)
One row per account, created **automatically** the moment someone signs up — a database trigger
(`handle_new_user`) fires on every `auth.users` insert and creates the matching row here, pulling
`display_name` out of the signup form data. This is the table the app actually reads/writes for profile
info (name, bio, avatar).

| column | meaning |
|---|---|
| `id` | same UUID as the matching `auth.users` row |
| `display_name` | shown throughout the app |
| `bio` | free text, editable via Update Profile |
| `avatar_url` | points at a file in the `avatars` storage bucket |

### `locations`
A flat lookup table of cities: `Tokyo / Japan / Asia`, `London / UK / Europe`, etc. Seeded once from
`seed.sql`. Every post points at exactly one row here (`posts.location_id`) — this is what powers the
region → country → city search dropdowns and the city/country search filters.

### `posts`
The core content. One row per post.

| column | meaning |
|---|---|
| `user_id` | who posted it (→ `users`) |
| `location_id` | which city it's about (→ `locations`) |
| `caption` | the post text — this is what keyword search matches against |
| `save_count` | how many people have saved/liked it — **not** set manually; a trigger keeps it in sync (see below) |

### `post_images`
A post can have multiple photos. Each row is one image: which post it belongs to, its URL (in the
`post-images` storage bucket), and `position` (its order in the carousel — 0 is the cover photo).

### `tags` / `post_tags`
`tags` is a lookup table (e.g. "sushi", "$$"), categorized as `cuisine` or `price`. `post_tags` is the
join table connecting posts to tags — a post can have many tags, a tag can apply to many posts.
**Not wired up in the UI yet** — the schema supports it for a future filter-by-cuisine/price feature.

### `follows`
Who follows whom. Each row is one directed relationship: `follower_id` follows `followed_id`. This is
what the Following feed queries — "give me posts from everyone I follow."

### `saved_posts`
The "like"/"save" action (same thing in this app — one row means "this user saved this post"). Each row
is `user_id` + `post_id`. This table is also what drives `posts.save_count`:

- A **trigger** (`saved_posts_save_count`) fires on every insert/delete here and automatically bumps
  `posts.save_count` up or down. The app never sets `save_count` directly — it just inserts/deletes rows
  in `saved_posts`, and the count stays correct on its own. This avoids the race-condition risk of doing
  manual `+1`/`-1` calls from the client.
- A **security rule** on this table blocks you from inserting a row where `post_id` belongs to a post you
  own — i.e. you can't save your own post, enforced by the database itself, not just hidden buttons in
  the UI.

### `search_cache`
Not used yet — reserved for the planned AI search-summary feature. The idea: cache an LLM-generated
summary per search query (`query` → `summary`, plus which `post_ids` it covered) so repeated searches
don't re-call the AI every time, with `expires_at` to invalidate stale summaries.

## How a few real actions flow through these tables

- **Signing up** → `auth.users` insert → trigger → `users` row created automatically.
- **Adding a post** → insert into `posts`, then one insert per photo into `post_images`.
- **Saving a post** → insert into `saved_posts` → trigger → `posts.save_count` goes up by 1.
- **Following someone** → insert into `follows`.
- **Home → Following tab** → look up your `follows` rows → fetch `posts` where `user_id` is one of those.
- **Home → Trending tab** → `posts` ordered by `save_count` descending, your own posts filtered out.
- **Search** → `posts` filtered by `location_id` (via `locations`) and/or a caption keyword match.
