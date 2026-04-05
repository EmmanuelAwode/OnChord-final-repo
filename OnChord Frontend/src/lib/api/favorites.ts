// src/lib/api/favorites.ts
import { supabase } from "../supabaseClient";

export interface Favorite {
  id: string;
  user_id: string;
  item_id: string;
  item_type: "album" | "song" | "artist";
  item_title?: string;
  item_artist?: string;
  item_cover?: string;
  added_at: string;
}

/**
 * Add item to favorites
 */
export async function addFavorite(
  itemId: string,
  itemType: "album" | "song" | "artist",
  metadata?: {
    title?: string;
    artist?: string;
    cover?: string;
  }
): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error("Not authenticated");

  console.log(`[addFavorite] Adding: itemId="${itemId}", itemType="${itemType}", title="${metadata?.title}"`);

  const { error, data } = await supabase.from("favorites").insert({
    user_id: session.session.user.id,
    item_id: itemId,
    item_type: itemType,
    item_title: metadata?.title,
    item_artist: metadata?.artist,
    item_cover: metadata?.cover,
  }).select();

  if (error) {
    console.error(`[addFavorite] Error inserting:`, error);
    throw error;
  }

  console.log(`[addFavorite] Successfully inserted favorite:`, data?.[0]);
}

/**
 * Remove item from favorites
 */
export async function removeFavorite(
  itemId: string,
  itemType: "album" | "song" | "artist"
): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error("Not authenticated");

  console.log(`[removeFavorite] Deleting: itemId="${itemId}", itemType="${itemType}", userId=${session.session.user.id.slice(0, 8)}...`);

  const { error, data } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", session.session.user.id)
    .eq("item_id", itemId)
    .eq("item_type", itemType)
    .select();

  if (error) {
    console.error(`[removeFavorite] Error deleting:`, error);
    throw error;
  }

  console.log(`[removeFavorite] Successfully deleted ${data?.length || 0} favorite(s)`);
}

/**
 * Check if item is favorited
 */
export async function isFavorited(
  itemId: string,
  itemType: "album" | "song" | "artist"
): Promise<boolean> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return false;

  const { data, error } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", session.session.user.id)
    .eq("item_id", itemId)
    .eq("item_type", itemType)
    .maybeSingle();

  if (error) {
    console.error("Error checking favorite status:", error);
    return false;
  }

  return !!data;
}

/**
 * Get all favorites for current user
 */
export async function getFavorites(
  itemType?: "album" | "song" | "artist"
): Promise<Favorite[]> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return [];

  let query = supabase
    .from("favorites")
    .select("*")
    .eq("user_id", session.session.user.id)
    .order("added_at", { ascending: false });

  if (itemType) {
    query = query.eq("item_type", itemType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching favorites:", error);
    return [];
  }

  return data;
}
