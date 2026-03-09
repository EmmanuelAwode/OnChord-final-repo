// src/lib/api/tasteMatching.ts
// Fetches user music data from reviews and favorites for taste matching

import { supabase } from "../supabaseClient";

export interface UserMusicData {
  userId: string;
  trackIds: string[];      // Spotify track IDs from reviews/favorites
  albumIds: string[];      // Spotify album IDs
  artistNames: string[];   // Artist names (lowercased for comparison)
  totalItems: number;      // Total music items
}

export interface TasteComparisonResult {
  similarity: number;           // 0-100 overall similarity
  sharedTrackIds: string[];     // Exact same tracks
  sharedAlbumIds: string[];     // Exact same albums
  sharedArtists: string[];      // Same artists (different songs)
  user1Data: UserMusicData;
  user2Data: UserMusicData;
  breakdown: {
    trackBonus: number;         // Bonus from shared tracks
    albumBonus: number;         // Bonus from shared albums
    artistBonus: number;        // Bonus from shared artists
  };
}

/**
 * Fetch music data for a specific user from their reviews and favorites
 */
export async function getUserMusicData(userId: string): Promise<UserMusicData> {
  const trackIds: Set<string> = new Set();
  const albumIds: Set<string> = new Set();
  const artistNames: Set<string> = new Set();

  // Fetch reviews for this user (public ones or all if it's current user)
  const { data: reviews, error: reviewError } = await supabase
    .from("reviews")
    .select("album_id, album_artist, review_type")
    .eq("uid", userId);

  if (!reviewError && reviews) {
    for (const review of reviews) {
      if (review.album_id) {
        if (review.review_type === "track") {
          trackIds.add(review.album_id);
        } else {
          albumIds.add(review.album_id);
        }
      }
      if (review.album_artist) {
        // Store lowercase for case-insensitive comparison
        artistNames.add(review.album_artist.toLowerCase().trim());
      }
    }
  }

  // Fetch favorites for this user
  const { data: favorites, error: favError } = await supabase
    .from("favorites")
    .select("item_id, item_type, item_artist")
    .eq("user_id", userId);

  if (!favError && favorites) {
    for (const fav of favorites) {
      if (fav.item_id) {
        if (fav.item_type === "song") {
          trackIds.add(fav.item_id);
        } else if (fav.item_type === "album") {
          albumIds.add(fav.item_id);
        }
      }
      if (fav.item_artist) {
        artistNames.add(fav.item_artist.toLowerCase().trim());
      }
    }
  }

  return {
    userId,
    trackIds: Array.from(trackIds),
    albumIds: Array.from(albumIds),
    artistNames: Array.from(artistNames),
    totalItems: trackIds.size + albumIds.size,
  };
}

/**
 * Compare music taste between two users
 * Returns detailed comparison including shared tracks, albums, artists
 */
export function compareMusicTaste(
  user1Data: UserMusicData,
  user2Data: UserMusicData
): TasteComparisonResult {
  // Find shared items
  const sharedTrackIds = user1Data.trackIds.filter(id => 
    user2Data.trackIds.includes(id)
  );
  
  const sharedAlbumIds = user1Data.albumIds.filter(id => 
    user2Data.albumIds.includes(id)
  );
  
  const sharedArtists = user1Data.artistNames.filter(artist => 
    user2Data.artistNames.includes(artist)
  );

  // Calculate similarity score
  // Base: Jaccard similarity for all items
  const allUser1Items = [...user1Data.trackIds, ...user1Data.albumIds, ...user1Data.artistNames];
  const allUser2Items = [...user2Data.trackIds, ...user2Data.albumIds, ...user2Data.artistNames];
  
  const intersection = new Set([...allUser1Items].filter(x => allUser2Items.includes(x)));
  const union = new Set([...allUser1Items, ...allUser2Items]);
  
  let baseSimilarity = union.size > 0 ? (intersection.size / union.size) * 100 : 0;

  // Bonuses for different types of matches
  // Shared tracks are most valuable (same exact song taste)
  const trackBonus = Math.min(sharedTrackIds.length * 5, 25); // Max 25% bonus
  
  // Shared albums show similar album taste
  const albumBonus = Math.min(sharedAlbumIds.length * 3, 15); // Max 15% bonus
  
  // Shared artists show genre overlap
  const artistBonus = Math.min(sharedArtists.length * 2, 20); // Max 20% bonus

  // Calculate final similarity (capped at 100)
  let similarity = Math.min(100, baseSimilarity + trackBonus + albumBonus + artistBonus);
  
  // If no data for either user, return low similarity
  if (user1Data.totalItems === 0 || user2Data.totalItems === 0) {
    similarity = 0;
  }

  return {
    similarity: Math.round(similarity),
    sharedTrackIds,
    sharedAlbumIds,
    sharedArtists,
    user1Data,
    user2Data,
    breakdown: {
      trackBonus,
      albumBonus,
      artistBonus,
    },
  };
}

/**
 * Get all users with music data for taste matching
 */
export async function getUsersWithMusicData(): Promise<string[]> {
  // Get unique user IDs who have reviews
  const { data: reviewUsers } = await supabase
    .from("reviews")
    .select("uid")
    .not("uid", "is", null);

  // Get unique user IDs who have favorites
  const { data: favUsers } = await supabase
    .from("favorites")
    .select("user_id")
    .not("user_id", "is", null);

  const userIds = new Set<string>();
  
  if (reviewUsers) {
    reviewUsers.forEach(r => r.uid && userIds.add(r.uid));
  }
  if (favUsers) {
    favUsers.forEach(f => f.user_id && userIds.add(f.user_id));
  }

  return Array.from(userIds);
}

/**
 * Compute taste matches for current user against all other users
 */
export async function computeTasteMatches(
  currentUserId: string
): Promise<Array<TasteComparisonResult & { targetUserId: string }>> {
  // Get current user's music data
  const myData = await getUserMusicData(currentUserId);
  
  // Get all users with music activity
  const allUsers = await getUsersWithMusicData();
  const otherUsers = allUsers.filter(id => id !== currentUserId);

  // Compare with each user
  const results: Array<TasteComparisonResult & { targetUserId: string }> = [];
  
  for (const userId of otherUsers) {
    const theirData = await getUserMusicData(userId);
    const comparison = compareMusicTaste(myData, theirData);
    results.push({
      ...comparison,
      targetUserId: userId,
    });
  }

  // Sort by similarity descending
  results.sort((a, b) => b.similarity - a.similarity);

  return results;
}
