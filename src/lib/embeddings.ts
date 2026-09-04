import { supabase } from "./supabase";

export async function embedText(text: string): Promise<number[] | null> {
  const { data, error } = await supabase.functions.invoke("embed-text", {
    body: { text },
  });
  if (error) {
    console.error("Failed to get embedding:", error);
    return null;
  }
  if (!data?.embedding) {
    console.error("embed-text returned no embedding:", data);
    return null;
  }
  return data.embedding as number[];
}
