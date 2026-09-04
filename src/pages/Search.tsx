import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import PostCard from "../components/PostCard";
import SearchBar from "../components/SearchBar";
import type { Post } from "../types";

function Search() {
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get("keyword") ?? "";
  const city = searchParams.get("city") ?? "";

  const [results, setResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const runSearch = async () => {
      setLoading(true);
      setError("");

      let query = supabase
        .from("posts")
        .select(
          "*, user:users(*), location:locations!inner(*), images:post_images(*)"
        )
        .order("created_at", { ascending: false });

      if (keyword) query = query.ilike("caption", `%${keyword}%`);
      if (city) query = query.eq("location.city", city);

      const { data, error: queryError } = await query;

      if (queryError) {
        setError(queryError.message);
        setResults([]);
      } else {
        setResults((data as unknown as Post[]) ?? []);
      }
      setLoading(false);
    };

    runSearch();
  }, [keyword, city]);

  return (
    <section id="search-page">
      <SearchBar />
      <div className="post-grid">
        {loading && <p>Searching...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && results.length === 0 && <p>No posts found.</p>}
        {results.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}

export default Search;
