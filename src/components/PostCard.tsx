import { useEffect, useState } from "react";
import { FiHeart } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { sortedImages } from "../lib/posts";
import type { Post } from "../types";

function PostCard({ post }: { post: Post }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saves, setSaves] = useState(post.save_count);
  const isOwnPost = user != null && post.user_id === user.id;
  const coverImage = sortedImages(post)[0]?.url;

  useEffect(() => {
    if (user == null) {
      setSaved(false);
      return;
    }
    const checkSaved = async () => {
      const { data } = await supabase
        .from("saved_posts")
        .select("post_id")
        .eq("user_id", user.id)
        .eq("post_id", post.id)
        .maybeSingle();
      setSaved(data != null);
    };
    checkSaved();
  }, [post.id, user]);

  const toggleSaved = async () => {
    if (user == null) {
      alert("Please sign in to save!");
      return;
    }
    try {
      if (!saved) {
        const { error } = await supabase
          .from("saved_posts")
          .insert({ user_id: user.id, post_id: post.id });
        if (error) throw error;
        setSaves((prev) => prev + 1);
      } else {
        const { error } = await supabase
          .from("saved_posts")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", post.id);
        if (error) throw error;
        setSaves((prev) => prev - 1);
      }
      setSaved(!saved);
    } catch (error) {
      console.error("Failed to save post:", error);
      alert("Couldn't save this post right now — please try again.");
    }
  };

  return (
    <div className="post-container">
      <div className="post-top-bar">
        <div className="user-info">
          <img
            src={post.user?.avatar_url}
            className="post-profile-circle"
            onClick={() => navigate(`/account/${post.user_id}`)}
          />
          <div>{post.user?.display_name}</div>
        </div>
        <div className="saves">
          <button
            className="save-button"
            onClick={toggleSaved}
            disabled={isOwnPost && !saved}
            title={isOwnPost && !saved ? "You can't save your own post" : undefined}
          >
            {saved ? <FaHeart color="red" /> : <FiHeart />}
          </button>
          <div>{saves}</div>
        </div>
      </div>
      <div className="post-bottom-bar" onClick={() => navigate(`/post/${post.id}`)}>
        {coverImage && <img className="post-image" src={coverImage} alt="cover picture" />}
        <div>{post.caption}</div>
        <div>{new Date(post.created_at).toLocaleString()}</div>
        <div>{post.location?.city}</div>
      </div>
    </div>
  );
}

export default PostCard;
