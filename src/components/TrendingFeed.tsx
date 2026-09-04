import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { POST_SELECT } from "../lib/posts";
import { useAuth } from "../lib/auth";
import PostCard from "./PostCard";
import type { Post } from "../types";

function TrendingFeed() {
  const { user } = useAuth();
  const [trendingList, setTrendingList] = useState<Post[]>([]);

  useEffect(() => {
    const getTrendingList = async () => {
      let query = supabase
        .from("posts")
        .select(POST_SELECT)
        .order("save_count", { ascending: false })
        .limit(10);

      // Exclude your own posts before the limit, not after, so the list
      // always backfills to a full 10 instead of coming up short whenever
      // one of your own posts would otherwise have placed in the top 10.
      if (user) query = query.neq("user_id", user.id);

      const { data, error } = await query;
      if (error) {
        console.error("Failed to load trending posts:", error);
        return;
      }
      setTrendingList((data as unknown as Post[]) ?? []);
    };
    getTrendingList();
  }, [user]);

  return (
    <div className="post-grid">
      {trendingList.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

export default TrendingFeed;
