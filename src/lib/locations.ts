import { supabase } from "./supabase";
import type { Location } from "../types";

export async function fetchLocations(): Promise<Location[]> {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .order("region")
    .order("country")
    .order("city");

  if (error) throw error;
  return data ?? [];
}
