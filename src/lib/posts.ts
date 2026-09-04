import type { Post, PostImage } from "../types";

// The !column hints pin each embed to a specific foreign key, avoiding
// PostgREST's "more than one relationship was found" ambiguity error.
export const POST_SELECT =
  "*, user:users!user_id(*), location:locations!location_id(*), images:post_images!post_id(*)";

export function sortedImages(post: Post): PostImage[] {
  return [...(post.images ?? [])].sort((a, b) => a.position - b.position);
}
