// src/lib/useSupabaseFollows.ts
import { useState, useEffect } from "react";
import {
  followUser as followUserApi,
  unfollowUser as unfollowUserApi,
  isFollowing as isFollowingApi,
  getFollowing as getFollowingApi,
} from "./api/follows";

/**
 * React hook for managing follows with Supabase
 * Replaces the old localStorage-based useFollowing hook
 */
export function useSupabaseFollows() {
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load following list on mount
  useEffect(() => {
    loadFollowing();
  }, []);

  async function loadFollowing() {
    try {
      setIsLoading(true);
      const followingList = await getFollowingApi();
      setFollowing(new Set(followingList));
      setError(null);
    } catch (err) {
      console.error("Failed to load following:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleFollow(userId: string) {
    const wasFollowing = following.has(userId);

    // Optimistic update
    setFollowing((prev) => {
      const newSet = new Set(prev);
      if (wasFollowing) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });

    try {
      if (wasFollowing) {
        await unfollowUserApi(userId);
      } else {
        await followUserApi(userId);
      }
      setError(null);
    } catch (err) {
      setError(err as Error);
      // Revert optimistic update
      setFollowing((prev) => {
        const newSet = new Set(prev);
        if (wasFollowing) {
          newSet.add(userId);
        } else {
          newSet.delete(userId);
        }
        return newSet;
      });
    }
  }

  const isFollowing = (userId: string) => following.has(userId);

  return {
    following,
    isFollowing,
    toggleFollow,
    isLoading,
    error,
    reload: loadFollowing,
  };
}
