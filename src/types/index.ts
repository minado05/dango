export interface User {
  id: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  created_at: string;
}

export interface Location {
  id: number;
  city: string;
  country: string;
  region: string;
}

export interface Tag {
  id: number;
  name: string;
  category: "cuisine" | "price";
}

export interface Post {
  id: string;
  user_id: string;
  location_id: number;
  caption: string;
  save_count: number;
  created_at: string;
  location?: Location;
  images?: PostImage[];
  tags?: Tag[];
  user?: User;
}

export interface PostImage {
  id: string;
  post_id: string;
  url: string;
  position: number;
}

export interface SearchCache {
  id: string;
  query: string;
  summary: string;
  post_ids: string[];
  created_at: string;
  expires_at: string;
}
