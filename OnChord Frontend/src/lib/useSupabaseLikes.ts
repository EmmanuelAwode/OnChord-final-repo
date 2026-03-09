// src/lib/useSupabaseLikes.ts
import { useState, useEffect } from "react";
import {
  likeReview as likeReviewApi,
  unlikeReview as unlikeReviewApi,
  getLikedReviews as getLikedReviewsApi,
  getReviewLikeCount,
} from "./api/likes";

/**
 * React hook for managing review likes with Supabase
 * Replaces the old localStorage-based useReviewLikes hook
 */
export function useSupabaseLikes() {
  const [likedReviews, setLikedReviews] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load liked reviews on mount
  useEffect(() => {
    loadLikedReviews();
  }, []);

  async function loadLikedReviews() {
    try {
      setIsLoading(true);
      const liked = await getLikedReviewsApi();
      setLikedReviews(new Set(liked));
      setError(null);
    } catch (err) {
      console.error("Failed to load liked reviews:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleReviewLike(reviewId: string) {
    const wasLiked = likedReviews.has(reviewId);
    const currentCount = likeCounts[reviewId] || 0;

    // Optimistic update
    setLikedReviews((prev) => {
      const newSet = new Set(prev);
      if (wasLiked) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });

    setLikeCounts((prev) => ({
      ...prev,
      [reviewId]: wasLiked ? currentCount - 1 : currentCount + 1,
    }));

    try {
      if (wasLiked) {
        await unlikeReviewApi(reviewId);
      } else {
        await likeReviewApi(reviewId);
      }

      // Refresh like count from server
      const newCount = await getReviewLikeCount(reviewId);
      setLikeCounts((prev) => ({ ...prev, [reviewId]: newCount }));
      setError(null);
    } catch (err) {
      console.error("Failed to toggle like:", err);
      setError(err as Error);
      // Revert optimistic update
      setLikedReviews((prev) => {
        const newSet = new Set(prev);
        if (wasLiked) {
          newSet.add(reviewId);
        } else {
          newSet.delete(reviewId);
        }
        return newSet;
      });
      setLikeCounts((prev) => ({ ...prev, [reviewId]: currentCount }));
    }
  }

  const isReviewLiked = (reviewId: string) => likedReviews.has(reviewId);

  const getReviewLikes = (reviewId: string) => likeCounts[reviewId] || 0;

  // Load like count for a specific review
  async function loadLikeCount(reviewId: string) {
    try {
      const count = await getReviewLikeCount(reviewId);
      setLikeCounts((prev) => ({ ...prev, [reviewId]: count }));
    } catch (err) {
      console.error("Failed to load like count:", err);
    }
  }

  return {
    likedReviews,
    isReviewLiked,
    toggleReviewLike,
    getReviewLikes,
    loadLikeCount,
    isLoading,
    error,
    reload: loadLikedReviews,
  };
}
