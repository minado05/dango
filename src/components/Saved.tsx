import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { POST_SELECT } from "../lib/posts";
import PostCard from "./PostCard";
import type { Post } from "../types";

interface Props {
  profileId: string;
}

function Saved({ profileId }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (!profileId) return;
    const getPosts = async () => {
      const { data, error } = await supabase
        .from("saved_posts")
        .select(`post:posts(${POST_SELECT})`)
        .eq("user_id", profileId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Failed to load saved posts:", error);
        return;
      }
      const rows = (data as unknown as { post: Post | null }[]) ?? [];
      setPosts(rows.map((row) => row.post).filter((post): post is Post => post != null));
    };
    getPosts();
  }, [profileId]);

  return (
    <div className="post-grid">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

export default Saved;
