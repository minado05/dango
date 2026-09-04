import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { POST_SELECT } from "../lib/posts";
import PostCard from "./PostCard";
import type { Post } from "../types";

interface Props {
  profileId: string;
}

function MyPosts({ profileId }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (!profileId) return;
    const getPosts = async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(POST_SELECT)
        .eq("user_id", profileId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Failed to load posts:", error);
        return;
      }
      setPosts((data as unknown as Post[]) ?? []);
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

export default MyPosts;
