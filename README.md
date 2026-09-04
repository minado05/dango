# Dango 🍡 (Supabase rebuild)

A rebuild of [Dango](https://dangoapp.netlify.app/) on Supabase/Postgres instead of Firebase, so posts can be
queried relationally (by caption keyword, city, tags, etc.) instead of denormalized Firestore documents.

## Features

- Create posts - share restaurant and food itineraries with multiple images
- User interactions - save posts (combined like/save) and follow/unfollow users
- Location-based & keyword search - filter by region, country, city, and/or caption keyword; the search bar
  remembers your last search instead of resetting
- AI search summaries - a Gemini-generated summary and top-restaurant list for your search results, cached
  to avoid repeat AI calls on the same search
- Custom feeds - Following, Explore (tailored to the locations you save from most, falling back to Trending
  logic for new users), and Trending (most-saved posts, excluding your own)
- Profile pages - following/followers/saves-received stats with clickable following/followers lists, bio &
  avatar management
- Dynamic post and profile pages

## Tech Stack

Frontend: React + Vite, TypeScript
Backend: Supabase (Postgres, Auth, Storage, Edge Functions)

## Setup

1. Create a project at [supabase.com](https://supabase.com/dashboard).
2. In the project's SQL editor, run `supabase/schema.sql`, then `supabase/seed.sql`. See
   `supabase/SCHEMA.md` for what each table does and how they relate.
3. In Project Settings → API, copy the Project URL and anon public key.
4. Fill in `.env`:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
5. `npm install && npm run dev`

### AI search summaries (optional)

The search summary feature needs a deployed Supabase Edge Function and a free Gemini API key:

1. Get a key at [aistudio.google.com](https://aistudio.google.com/)
2. Install the Supabase CLI, then `supabase login` and `supabase link`
3. `supabase secrets set GEMINI_API_KEY=your_key`
4. `supabase functions deploy summarize-search`

## Not yet built

Cuisine/price tag filtering — the `tags`/`post_tags` tables exist in the schema but aren't wired into the
Add Post form or search UI yet.
