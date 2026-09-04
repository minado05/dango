import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import NavBar from "../components/NavBar";
import PostCard from "../components/PostCard";
import type { Post } from "../types";

interface SearchSummary {
  summary: string;
  restaurants: { name: string; mentions: string }[];
}

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
    const runSearch = async () => {
      setLoading(true);
      setError("");
      setSummary(null);

      let query = supabase
        .from("posts")
        .select(
          "*, user:users!user_id(*), location:locations!location_id!inner(*), images:post_images!post_id(*)"
        )
        .order("created_at", { ascending: false });

      if (keyword) query = query.ilike("caption", `%${keyword}%`);
      if (city) query = query.eq("location.city", city);
      else if (country) query = query.eq("location.country", country);
      else if (region) query = query.eq("location.region", region);

      const { data, error: queryError } = await query;

      if (queryError) {
        setError(queryError.message);
        setResults([]);
        setLoading(false);
        return;
      }

      const posts = (data as unknown as Post[]) ?? [];
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
            <p className="ai-summary-label">AI Summary:</p>
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
