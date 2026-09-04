// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const GEMINI_MODEL = "gemini-3.6-flash";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface PostInput {
  id: string;
  caption: string;
}

interface SearchSummary {
  summary: string;
  restaurants: { name: string; mentions: string }[];
}

async function summarizeWithGemini(query: string, posts: PostInput[]): Promise<SearchSummary> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const captionsList = posts.map((post, i) => `${i + 1}. ${post.caption}`).join("\n");

  const prompt = `You are summarizing restaurant posts from a food-itinerary app for someone who searched "${query}".

Here are the matching post captions:
${captionsList}

Respond with ONLY raw JSON — no markdown, no code fences, no commentary before or after — matching this exact shape:
{
  "summary": "a brief 1-2 sentence overview of what's being talked about",
  "restaurants": [
    { "name": "Restaurant Name", "mentions": "what the captions say about it" }
  ]
}

Rules:
- List at most the top 5 restaurants, ranked by how much they're mentioned or praised.
- Only include restaurant names that are actually named in the captions above — never invent names.
- If fewer than 5 distinct restaurants are named, only include the ones that are actually there.
- If no specific restaurant names appear at all, return an empty "restaurants" array and use "summary" to describe the general themes instead.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no summary text");

  return parseSummaryResponse(text);
}

// Gemini doesn't always honor responseMimeType and can reply with prose, or
// JSON wrapped in a markdown code fence, instead of raw JSON. This tries a
// few ways to extract the structured shape before giving up and falling
// back to treating the raw text as the summary, so a formatting slip never
// turns into a hard failure for the user.
function parseSummaryResponse(text: string): SearchSummary {
  const attempts = [text, text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim()];

  const braceStart = text.indexOf("{");
  const braceEnd = text.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    attempts.push(text.slice(braceStart, braceEnd + 1));
  }

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt);
      if (typeof parsed.summary === "string" && Array.isArray(parsed.restaurants)) {
        return parsed as SearchSummary;
      }
    } catch {
      // try the next attempt
    }
  }

  console.error("Gemini did not return parseable JSON, falling back to raw text:", text);
  return { summary: text.trim(), restaurants: [] };
}

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const { query, posts } = (await req.json()) as {
      query?: string;
      posts?: PostInput[];
    };

    if (!query || !posts || posts.length === 0) {
      return Response.json({ summary: null });
    }

    // search_cache is a shared/internal table, not user-owned data, so this
    // uses the admin client to bypass RLS regardless of which auth mode
    // (publishable or secret) the caller reached this function with.
    const admin = ctx.supabaseAdmin;

    const { data: cached } = await admin
      .from("search_cache")
      .select("summary, expires_at")
      .eq("query", query)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached) {
      // Guard against stale rows written before the response format last
      // changed — treat anything that isn't parseable JSON as a cache miss
      // instead of handing the client a value it can't parse.
      try {
        JSON.parse(cached.summary);
        return Response.json({ summary: cached.summary, cached: true });
      } catch {
        console.error("Cached summary isn't valid JSON, ignoring and regenerating.");
      }
    }

    let result: SearchSummary;
    try {
      result = await summarizeWithGemini(query, posts);
    } catch (error) {
      console.error("Gemini summarization failed:", error);
      // TEMPORARY debug field again since this is a new code path (JSON
      // parsing) — remove once the structured format is confirmed working.
      return Response.json({
        summary: null,
        error: "Summary unavailable right now",
        debug: error instanceof Error ? error.message : String(error),
      });
    }

    const summaryJson = JSON.stringify(result);

    await admin.from("search_cache").insert({
      query,
      summary: summaryJson,
      post_ids: posts.map((post) => post.id),
      expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
    });

    return Response.json({ summary: summaryJson, cached: false });
  }),
};

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/summarize-search' \
    --header 'apiKey: YOUR_PUBLISHABLE_KEY' \
    --header 'Content-Type: application/json' \
    --data '{"query":"ramen","posts":[{"id":"...","caption":"Best ramen ever at Ippudo!"}]}'

*/
