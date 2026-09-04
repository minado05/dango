import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { POST_SELECT } from "../lib/posts";
import { useAuth } from "../lib/auth";
import PostCard from "./PostCard";
import type { Post } from "../types";

function FollowingFeed() {
  const { user } = useAuth();
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (!user) {
      setFollowingPosts([]);
      return;
    }
    const getFollowingPosts = async () => {
      const { data: follows, error: followsError } = await supabase
        .from("follows")
        .select("followed_id")
        .eq("follower_id", user.id);
      if (followsError) {
        console.error("Failed to load following list:", followsError);
        return;
      }
      const followedIds = (follows ?? []).map((f) => f.followed_id);
      if (followedIds.length === 0) {
        setFollowingPosts([]);
        return;
      }
      const { data, error } = await supabase
        .from("posts")
        .select(POST_SELECT)
        .in("user_id", followedIds)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Failed to load following posts:", error);
        return;
      }
      setFollowingPosts((data as unknown as Post[]) ?? []);
    };
    getFollowingPosts();
  }, [user]);

  if (!user) {
    return <p className="signin-notice">Please sign in to access this feature.</p>;
  }

  return (
    <div className="post-grid">
      {followingPosts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

export default FollowingFeed;
