import type { Post, PostImage } from "../types";

export const POST_SELECT =
  "*, user:users(*), location:locations(*), images:post_images(*)";

export function sortedImages(post: Post): PostImage[] {
  return [...(post.images ?? [])].sort((a, b) => a.position - b.position);
}
