// src/lib/api/likes.ts
import { supabase } from "../supabaseClient";

/**
 * Like a review
 */
export async function likeReview(reviewId: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error("Not authenticated");

  const { error } = await supabase.from("review_likes").insert({
    user_id: session.session.user.id,
    review_id: reviewId,
  });

  if (error) throw error;
}

/**
 * Unlike a review
 */
export async function unlikeReview(reviewId: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("review_likes")
    .delete()
    .eq("user_id", session.session.user.id)
    .eq("review_id", reviewId);

  if (error) throw error;
}

/**
 * Check if current user has liked a review
 */
export async function isReviewLiked(reviewId: string): Promise<boolean> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return false;

  const { data, error } = await supabase
    .from("review_likes")
    .select("id")
    .eq("user_id", session.session.user.id)
    .eq("review_id", reviewId)
    .maybeSingle();

  if (error) {
    console.error("Error checking like status:", error);
    return false;
  }

  return !!data;
}

/**
 * Get like count for a review
 */
export async function getReviewLikeCount(reviewId: string): Promise<number> {
  const { data, error } = await supabase.rpc("get_review_like_count", {
    target_review_id: reviewId,
  });

  if (error) {
    console.error("Error getting like count:", error);
    return 0;
  }

  return data || 0;
}

/**
 * Get all reviews liked by current user
 */
export async function getLikedReviews(): Promise<string[]> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return [];

  const { data, error } = await supabase
    .from("review_likes")
    .select("review_id")
    .eq("user_id", session.session.user.id);

  if (error) {
    console.error("Error fetching liked reviews:", error);
    return [];
  }

  return data.map((like) => like.review_id);
}
