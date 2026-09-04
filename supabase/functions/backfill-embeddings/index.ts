// One-time utility: embeds every post that was created before semantic
// search existed (posts.embedding is null). Safe to call more than once —
// it only ever processes posts that still have no embedding. Not linked
// from the app UI; call it directly once via curl or the dashboard's
// function invoker, then it can be ignored/deleted.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

// Keep this in sync with embed-text/index.ts.
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
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const admin = ctx.supabaseAdmin;

    const { data: posts, error } = await admin
      .from("posts")
      .select("id, caption")
      .is("embedding", null);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const results: { id: string; ok: boolean; error?: string }[] = [];

    for (const post of posts ?? []) {
      if (!post.caption?.trim()) {
        results.push({ id: post.id, ok: false, error: "empty caption, skipped" });
        continue;
      }
      try {
        const embedding = await embedText(post.caption);
        const { error: updateError } = await admin
          .from("posts")
          .update({ embedding })
          .eq("id", post.id);
        if (updateError) throw updateError;
        results.push({ id: post.id, ok: true });
      } catch (err) {
        results.push({
          id: post.id,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return Response.json({ processed: results.length, results });
  }),
};

/* To run this backfill once your embed-text function is confirmed working:

  curl -i --location --request POST \
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/backfill-embeddings' \
    --header 'Authorization: Bearer YOUR_PUBLISHABLE_KEY' \
    --header 'apiKey: YOUR_PUBLISHABLE_KEY'

*/
