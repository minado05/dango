# Dango (Supabase rebuild)

A rebuild of [Dango](https://dangoapp.netlify.app/) on Supabase/Postgres instead of Firebase, so posts can be
queried relationally (by caption keyword, city, tags, etc.) instead of denormalized Firestore documents.

## Tech Stack

Frontend: React + Vite, TypeScript
Backend: Supabase (Postgres, Auth, Storage)

## Setup

1. Create a project at [supabase.com](https://supabase.com/dashboard).
2. In the project's SQL editor, run `supabase/schema.sql`, then `supabase/seed.sql`. See
   `supabase/SCHEMA.md` for what each table does and how they relate.
3. In Project Settings → API, copy the Project URL and anon public key.
4. Create `.env` from `.env` (already present) and fill in:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
5. `npm install && npm run dev`

## What's built

Full feature parity with the live Firebase app, on Supabase instead:

- **Auth** — sign up / sign in via Supabase Auth. A database trigger (`handle_new_user`) auto-creates
  the matching `public.users` profile row on signup, reading the display name from signup metadata.
- **Search** — combined search bar (keyword + region → country → city cascading filter, matching the
  live app's UX) that filters `posts` by caption keyword, city, and/or country. The bar also re-reads
  its state from the URL on mount so it doesn't reset blank after a search.
- **Home feed** — Following/Trending toggle (styled as a pill box matching the nav color). Trending
  excludes your own posts; Following pulls posts from users you follow via the `follows` table.
- **Post cards / detail page** — saving is the "like" action (`saved_posts` table). Saving your own post
  is blocked both in the UI (button disabled) and at the database level (RLS policy), while still allowing
  you to remove an already-existing save. `posts.save_count` is kept in sync automatically by a database
  trigger instead of client-side increment calls.
- **Add Post** — multi-image upload to the `post-images` storage bucket, city select, caption.
- **Account page** — profile banner, follow button, sign out (only shown on your own profile), My
  Posts vs Saved toggle (same pill-box styling as Following/Trending).
- **Update Profile** — avatar upload to the `avatars` storage bucket, bio update.

## Not yet built

The AI search-summary feature (the `search_cache` table already anticipates this) — summarizing top
restaurants mentioned across search results via an LLM, likely as a Supabase Edge Function.
