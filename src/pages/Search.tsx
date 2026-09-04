import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { embedText } from "../lib/embeddings";
import NavBar from "../components/NavBar";
import PostCard from "../components/PostCard";
import type { Post } from "../types";

interface SearchSummary {
  summary: string;
  restaurants: { name: string; mentions: string }[];
}

const POST_JOIN_SELECT =
  "*, user:users!user_id(*), location:locations!location_id!inner(*), images:post_images!post_id(*)";

function Search() {
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get("keyword") ?? "";
  const city = searchParams.get("city") ?? "";
  const country = searchParams.get("country") ?? "";
  const region = searchParams.get("region") ?? "";

  const [results, setResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [summary, setSummary] = useState<SearchSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    // Plain keyword/location query — substring match on caption, used
    // whenever there's no keyword, or as a fallback if semantic search
    // can't run (embedding failed) or comes up empty (e.g. the post
    // predates semantic search and was never backfilled with an embedding).
    const runPlainQuery = async () => {
      let query = supabase.from("posts").select(POST_JOIN_SELECT).order("created_at", {
        ascending: false,
      });

      if (keyword) query = query.ilike("caption", `%${keyword}%`);
      if (city) query = query.eq("location.city", city);
      else if (country) query = query.eq("location.country", country);
      else if (region) query = query.eq("location.region", region);

      return query;
    };

    const runSearch = async () => {
      setLoading(true);
      setError("");
      setSummary(null);

      let posts: Post[] = [];

      if (keyword) {
        const embedding = await embedText(keyword);
        if (embedding) {
          const { data, error: rpcError } = await supabase
            .rpc("match_posts", {
              query_embedding: embedding,
              match_count: 30,
              filter_city: city || null,
              filter_country: !city && country ? country : null,
              filter_region: !city && !country && region ? region : null,
            })
            .select(POST_JOIN_SELECT);

          if (rpcError) {
            console.error("Semantic search failed, falling back to keyword match:", rpcError);
          } else {
            posts = (data as unknown as Post[]) ?? [];
          }
        }
      }

      // Fall back to a plain substring/location query if there was no
      // keyword to embed, the embedding call failed, or semantic search
      // came back empty (likely an un-backfilled older post).
      if (posts.length === 0) {
        const { data, error: queryError } = await runPlainQuery();
        if (queryError) {
          setError(queryError.message);
          setResults([]);
          setLoading(false);
          return;
        }
        posts = (data as unknown as Post[]) ?? [];
      }

      setResults(posts);
      setLoading(false);

      if (posts.length === 0) return;

      const cacheKey = [keyword, city, country, region].filter(Boolean).join(" | ") || "all posts";
      // Cap what gets sent to the summarizer at the top 20 most-saved posts,
      // regardless of how many results the search itself returned — keeps
      // the AI call fast, cheap, and focused instead of diluted across
      // potentially hundreds of captions on a broad search.
      const postsForSummary = [...posts]
        .sort((a, b) => b.save_count - a.save_count)
        .slice(0, 20);

      setSummaryLoading(true);
      const { data: summaryData, error: summaryError } = await supabase.functions.invoke(
        "summarize-search",
        {
          body: {
            query: cacheKey,
            posts: postsForSummary.map((post) => ({ id: post.id, caption: post.caption })),
          },
        }
      );
      setSummaryLoading(false);

      if (summaryError) {
        console.error("Failed to get AI summary:", summaryError);
        return;
      }
      if (summaryData?.summary) {
        try {
          setSummary(JSON.parse(summaryData.summary) as SearchSummary);
        } catch (parseError) {
          console.error("Failed to parse AI summary:", parseError);
        }
      }
    };

    runSearch();
  }, [keyword, city, country, region]);

  return (
    <>
      <NavBar />
      <section id="search-page">
        {summaryLoading && <p className="ai-summary">Summarizing...</p>}
        {summary && (
          <div className="ai-summary">
            <p className="ai-summary-label">✦ AI Summary:</p>
            <p>{summary.summary}</p>
            {summary.restaurants.length > 0 && (
              <ol>
                {summary.restaurants.map((restaurant) => (
                  <li key={restaurant.name}>
                    <strong>{restaurant.name}</strong> — {restaurant.mentions}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
        <div className="post-grid">
          {loading && <p>Searching...</p>}
          {error && <p className="error">{error}</p>}
          {!loading && !error && results.length === 0 && <p>No posts found.</p>}
          {results.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </section>
    </>
  );
}

export default Search;
