// src/lib/api/follows.ts
import { supabase } from "../supabaseClient";

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

const FOLLOW_PAGE_SIZE = 1000;

async function fetchAllFollowIds(
  currentUserId: string,
  mode: "following" | "followers",
  limit = 200
): Promise<string[]> {
  const results: string[] = [];
  let offset = 0;
  const cappedLimit = Math.max(1, limit);

  while (results.length < cappedLimit) {
    const remaining = cappedLimit - results.length;
    const pageSize = Math.min(FOLLOW_PAGE_SIZE, remaining);

    const query =
      mode === "following"
        ? supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", currentUserId)
            .order("created_at", { ascending: false })
        : supabase
            .from("follows")
            .select("follower_id")
            .eq("following_id", currentUserId)
            .order("created_at", { ascending: false });

    const { data, error } = await query.range(offset, offset + pageSize - 1);

    if (error) {
      throw error;
    }

    const rows = data || [];
    if (rows.length === 0) break;

    if (mode === "following") {
      results.push(...rows.map((row: any) => String(row.following_id || "")).filter(Boolean));
    } else {
      results.push(...rows.map((row: any) => String(row.follower_id || "")).filter(Boolean));
    }

    if (rows.length < pageSize) break;
    offset += rows.length;
  }

  return results;
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
 * Get list of users that current user follows with pagination
 */
export async function getFollowing(limit = 20, offset = 0): Promise<string[]> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return [];

  const { data, error } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", session.session.user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching following:", error);
    return [];
  }

  return data.map((f) => f.following_id);
}

/**
 * Get list of users following the current user with pagination
 */
export async function getFollowers(limit = 20, offset = 0): Promise<string[]> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return [];

  const { data, error } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("following_id", session.session.user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching followers:", error);
    return [];
  }

  return data.map((f) => f.follower_id);
}

/**
 * Get list of users that both follow the current user and are followed by the current user.
 */
export async function getMutualFollows(limit = 200, offset = 0): Promise<string[]> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return [];

  const currentUserId = session.session.user.id;

  try {
    const [followingIds, followerIds] = await Promise.all([
      fetchAllFollowIds(currentUserId, "following", offset + limit),
      fetchAllFollowIds(currentUserId, "followers", offset + limit),
    ]);

    const followerSet = new Set(followerIds.map((id) => id.trim()).filter(Boolean));
    const mutualIds = followingIds.filter((id) => followerSet.has(id.trim()));

    const deduped = Array.from(new Set(mutualIds));
    return deduped.slice(offset, offset + limit);
  } catch (error) {
    console.error("Error fetching mutual follows:", error);
    return [];
  }
}

/**
 * Check if another user has a mutual follow relationship with the current user.
 */
export async function isMutualFollow(userId: string): Promise<boolean> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return false;

  const currentUserId = session.session.user.id;

  const [{ data: followsThem, error: followsError }, { data: followsMe, error: followedByError }] =
    await Promise.all([
      supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUserId)
        .eq("following_id", userId)
        .maybeSingle(),
      supabase
        .from("follows")
        .select("id")
        .eq("follower_id", userId)
        .eq("following_id", currentUserId)
        .maybeSingle(),
    ]);

  if (followsError || followedByError) {
    console.error("Error checking mutual follow status:", followsError || followedByError);
    return false;
  }

  return !!followsThem && !!followsMe;
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

/**
 * Block a user
 */
export async function blockUser(userId: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error("Not authenticated");

  const { error } = await supabase.from("blocks").insert({
    blocker_id: session.session.user.id,
    blocked_id: userId,
  });

  if (error) throw error;
}

/**
 * Unblock a user
 */
export async function unblockUser(userId: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", session.session.user.id)
    .eq("blocked_id", userId);

  if (error) throw error;
}

/**
 * Check if current user has blocked another user
 */
export async function isBlocked(userId: string): Promise<boolean> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return false;

  const { data, error } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", session.session.user.id)
    .eq("blocked_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error checking block status:", error);
    return false;
  }

  return !!data;
}

/**
 * Check if current user is blocked by another user (they blocked you)
 */
export async function isBlockedBy(userId: string): Promise<boolean> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return false;

  const { data, error } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", userId)
    .eq("blocked_id", session.session.user.id)
    .maybeSingle();

  if (error) {
    console.error("Error checking if blocked by user:", error);
    return false;
  }

  return !!data;
}

/**
 * Check if there is any block relationship in either direction
 */
export async function hasBlockingRelationship(userId: string): Promise<boolean> {
  const [iBlockedThem, theyBlockedMe] = await Promise.all([
    isBlocked(userId),
    isBlockedBy(userId),
  ]);

  return iBlockedThem || theyBlockedMe;
}
