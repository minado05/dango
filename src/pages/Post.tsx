import { useNavigate, useParams } from "react-router-dom";
import NavBar from "../components/NavBar";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { POST_SELECT, sortedImages } from "../lib/posts";
import { useAuth } from "../lib/auth";
import { FaHeart } from "react-icons/fa";
import { FiHeart } from "react-icons/fi";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import type { Post as PostType } from "../types";

function Post() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams<{ postId: string }>();
  const postId = params.postId;

  const [post, setPost] = useState<PostType | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!postId) return;
    const getPost = async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(POST_SELECT)
        .eq("id", postId)
        .maybeSingle();
      if (error) {
        console.error("Failed to load post:", error);
        return;
      }
      setPost((data as unknown as PostType) ?? null);
    };
    getPost();
  }, [postId]);

  useEffect(() => {
    if (user == null || post === null) {
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
  }, [user, post]);

  const isOwnPost = user != null && post != null && post.user_id === user.id;
  const images = post ? sortedImages(post) : [];

  const toggleSaved = async () => {
    if (post == null) return;
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
        setPost((prev) => (prev ? { ...prev, save_count: prev.save_count + 1 } : prev));
      } else {
        const { error } = await supabase
          .from("saved_posts")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", post.id);
        if (error) throw error;
        setPost((prev) => (prev ? { ...prev, save_count: prev.save_count - 1 } : prev));
      }
      setSaved(!saved);
    } catch (error) {
      console.error("Failed to save post:", error);
      alert("Couldn't save this post right now — please try again.");
    }
  };

  const forward = () => {
    if (imageIndex === images.length - 1) return;
    setImageIndex(imageIndex + 1);
  };

  const backward = () => {
    if (imageIndex === 0) return;
    setImageIndex(imageIndex - 1);
  };

  return (
    <>
      <NavBar />
      <div>
        {post ? (
          <div className="post-page-container">
            <div className="post-side left">
              <div id="image-index">
                {images.length > 0 ? imageIndex + 1 : 0}/{images.length}
              </div>
              <div id="back-button" onClick={backward}>
                <IoIosArrowBack className="img-nav-icon" />
              </div>
              <div id="forward-button" onClick={forward}>
                <IoIosArrowForward className="img-nav-icon" />
              </div>
              {images[imageIndex] && <img src={images[imageIndex].url} alt={post.caption} />}
            </div>
            <div className="post-side right">
              <div className="user-info">
                <img
                  src={post.user?.avatar_url}
                  className="post-profile-circle"
                  onClick={() => navigate(`/account/${post.user_id}`)}
                />
                <div>{post.user?.display_name}</div>
              </div>
              <div className="caption">{post.caption}</div>
              <div>{new Date(post.created_at).toLocaleString()}</div>
              <div>{post.location?.city}</div>
              <div className="saves">
                <button
                  className="save-button"
                  onClick={toggleSaved}
                  disabled={isOwnPost && !saved}
                  title={isOwnPost && !saved ? "You can't save your own post" : undefined}
                >
                  {saved ? <FaHeart color="red" /> : <FiHeart />}
                </button>
                <div>{post.save_count}</div>
              </div>
            </div>
          </div>
        ) : (
          <div>Loading...</div>
        )}
      </div>
    </>
  );
}

export default Post;
