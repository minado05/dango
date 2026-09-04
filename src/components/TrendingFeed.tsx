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
      const { data, error } = await supabase
        .from("posts")
        .select(POST_SELECT)
        .order("save_count", { ascending: false })
        .limit(10);
      if (error) {
        console.error("Failed to load trending posts:", error);
        return;
      }
      const posts = (data as unknown as Post[]) ?? [];
      setTrendingList(posts.filter((post) => post.user_id !== user?.id));
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
