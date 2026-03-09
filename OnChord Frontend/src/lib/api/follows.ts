// src/lib/api/follows.ts
import { supabase } from "../supabaseClient";

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

/**
 * Follow a user
 */
export async function followUser(userId: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error("Not authenticated");

  const { error } = await supabase.from("follows").insert({
    follower_id: session.session.user.id,
    following_id: userId,
  });

  if (error) throw error;
}

/**
 * Unfollow a user
 */
export async function unfollowUser(userId: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", session.session.user.id)
    .eq("following_id", userId);

  if (error) throw error;
}

/**
 * Check if current user follows another user
 */
export async function isFollowing(userId: string): Promise<boolean> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return false;

  const { data, error } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", session.session.user.id)
    .eq("following_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error checking follow status:", error);
    return false;
  }

  return !!data;
}

/**
 * Get list of users that current user follows
 */
export async function getFollowing(): Promise<string[]> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return [];

  const { data, error } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", session.session.user.id);

  if (error) {
    console.error("Error fetching following:", error);
    return [];
  }

  return data.map((f) => f.following_id);
}

/**
 * Get list of users following the current user
 */
export async function getFollowers(): Promise<string[]> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return [];

  const { data, error } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("following_id", session.session.user.id);

  if (error) {
    console.error("Error fetching followers:", error);
    return [];
  }

  return data.map((f) => f.follower_id);
}

/**
 * Get follower count for a user
 */
export async function getFollowerCount(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc("get_follower_count", {
    target_user_id: userId,
  });

  if (error) {
    console.error("Error getting follower count:", error);
    return 0;
  }

  return data || 0;
}

/**
 * Get following count for a user
 */
export async function getFollowingCount(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc("get_following_count", {
    target_user_id: userId,
  });

  if (error) {
    console.error("Error getting following count:", error);
    return 0;
  }

  return data || 0;
}
