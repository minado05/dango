# Dango (Supabase rebuild)

A rebuild of [Dango](https://dangoapp.netlify.app/) on Supabase/Postgres instead of Firebase, so posts can be
queried relationally (by caption keyword, city, tags, etc.) instead of denormalized Firestore documents.

## Tech Stack

Frontend: React + Vite, TypeScript
Backend: Supabase (Postgres, Auth, Storage)

## Setup

1. Create a project at [supabase.com](https://supabase.com/dashboard).
2. In the project's SQL editor, run `supabase/schema.sql`, then `supabase/seed.sql`.
3. In Project Settings → API, copy the Project URL and anon public key.
4. Create `.env` from `.env` (already present) and fill in:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
5. `npm install && npm run dev`

## What's built so far

- **Search** — a combined search bar (keyword + region → country → city cascading filter, preserving the
  old app's dropdown UX) that queries `posts` by caption keyword and/or city, joined against `locations`,
  `users`, and `post_images`. Lives at `src/components/SearchBar.tsx` and `src/pages/Search.tsx`.

## Not yet built

Auth, post creation, image upload/storage, likes/saves, profile pages — this only covers the search flow
so far as a first look at what the Supabase migration involves.
