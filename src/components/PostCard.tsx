import type { Post } from "../types";

function PostCard({ post }: { post: Post }) {
  const coverImage = post.images?.[0]?.url;

  return (
    <div className="post-card">
      {coverImage && <img className="post-image" src={coverImage} alt="" />}
      <div className="post-caption">{post.caption}</div>
      {post.location && (
        <div className="post-location">
          {post.location.city}, {post.location.country}
        </div>
      )}
      <div className="post-likes">{post.like_count} likes</div>
    </div>
  );
}

export default PostCard;
