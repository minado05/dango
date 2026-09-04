// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

// NOTE: like the generateContent model used in summarize-search, this name
// may be outdated by the time this runs — if it 404s, check the error
// message or https://ai.google.dev/gemini-api/docs/models for the current
// embedding model name, and update EMBEDDING_DIMENSIONS to match (must also
// match the `vector(N)` column size in the posts table).
const EMBEDDING_MODEL = "gemini-embedding-2";
const EMBEDDING_DIMENSIONS = 768;

async function embedText(text: string): Promise<number[]> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini embedding API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const values = data?.embedding?.values;
  if (!Array.isArray(values) || values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Gemini returned an unexpected embedding shape (length ${values?.length ?? "unknown"}, expected ${EMBEDDING_DIMENSIONS})`
    );
  }
  return values;
}

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req) => {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const { text } = (await req.json()) as { text?: string };
    if (!text || !text.trim()) {
      return Response.json({ error: "text is required" }, { status: 400 });
    }

    try {
      const embedding = await embedText(text);
      return Response.json({ embedding });
    } catch (error) {
      console.error("Embedding failed:", error);
      return Response.json(
        {
          embedding: null,
          error: "Couldn't generate embedding right now",
          debug: error instanceof Error ? error.message : String(error),
        },
        { status: 200 }
      );
    }
  }),
};

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/embed-text' \
    --header 'apiKey: YOUR_PUBLISHABLE_KEY' \
    --header 'Content-Type: application/json' \
    --data '{"text":"amazing ramen at Ippudo"}'

*/
