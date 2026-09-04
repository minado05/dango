import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { POST_SELECT } from "../lib/posts";
import { useAuth } from "../lib/auth";
import PostCard from "./PostCard";
import type { Post } from "../types";

function ExploreFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    const getExplorePosts = async () => {
      let locationIds: number[] = [];
      let savedPostIds: string[] = [];

      if (user) {
        // Use the locations of posts you've saved before as your "interest"
        // signal, so Explore leans toward places you already like — and
        // track which posts those are so we can exclude them, since seeing
        // your own saves again isn't "exploring."
        const { data: saved, error: savedError } = await supabase
          .from("saved_posts")
          .select("post_id, post:posts!post_id(location_id)")
          .eq("user_id", user.id);

        if (!savedError && saved) {
          const rows = saved as unknown as {
            post_id: string;
            post: { location_id: number } | null;
          }[];
          savedPostIds = rows.map((row) => row.post_id);

          const counts = new Map<number, number>();
          for (const row of rows) {
            const locationId = row.post?.location_id;
            if (locationId == null) continue;
            counts.set(locationId, (counts.get(locationId) ?? 0) + 1);
          }
          locationIds = [...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([id]) => id);
        }
      }

      // No saved posts yet (or not signed in) — fall back to the same
      // "most-saved overall" logic Trending uses, as a cold-start default.
      let query = supabase
        .from("posts")
        .select(POST_SELECT)
        .order("save_count", { ascending: false })
        .limit(10);

      if (user) query = query.neq("user_id", user.id);
      if (locationIds.length > 0) query = query.in("location_id", locationIds);
      if (savedPostIds.length > 0) query = query.not("id", "in", `(${savedPostIds.join(",")})`);

      const { data, error } = await query;
      if (error) {
        console.error("Failed to load explore posts:", error);
        return;
      }
      setPosts((data as unknown as Post[]) ?? []);
    };

    getExplorePosts();
  }, [user]);

  return (
    <div className="post-grid">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

export default ExploreFeed;
