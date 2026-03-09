// src/lib/api/reviews.ts
import { supabase } from "../supabaseClient";
import type { Review } from "../useUserInteractions";
import { fixSpotifyImageUrl } from "../../components/ui/utils";

type DbReview = {
  id: string;
  uid: string;
  user_name: string | null;
  user_avatar: string | null;

  album_id: string | null;
  album_title: string | null;
  album_artist: string | null;
  album_cover: string | null;
  album_url: string | null;
  preview_url: string | null;
  spotify_url: string | null;

  rating: number | null;
  review_type: "album" | "track" | string | null;

  content: string | null;
  tags: any; // jsonb

  is_public: boolean | null;

  mood: string | null;
  where_listened: string | null;
  when_listened: string | null;
  favorite_track: string | null;

  created_at: string;
  updated_at: string;
};

function mapDbToUi(r: DbReview): Review {
  const created = r.created_at ?? new Date().toISOString();
  const updated = r.updated_at ?? created;

  return {
    id: r.id,
    userId: r.uid,
    userName: r.user_name ?? "Unknown",
    userAvatar: r.user_avatar ?? "",

    albumId: r.album_id ?? "",
    albumTitle: r.album_title ?? "",
    albumArtist: r.album_artist ?? "",
    albumCover: fixSpotifyImageUrl(r.album_cover),
    albumUrl: r.album_url ?? undefined,
    previewUrl: r.preview_url ?? undefined,
    spotifyUrl: r.spotify_url ?? undefined,

    rating: Number(r.rating ?? 0),
    type: (r.review_type === "track" ? "track" : "album") as "album" | "track",
    content: r.content ?? "",

    timestamp: getRelativeTime(new Date(created)),
    date: created,
    likes: 0,
    comments: 0,

    tags: Array.isArray(r.tags) ? r.tags : [],

    mood: r.mood ?? undefined,
    whereListened: r.where_listened ?? undefined,
    whenListened: r.when_listened ?? undefined,
    favoriteTrack: r.favorite_track ?? undefined,

    isPublic: !!r.is_public,
    isEdited: updated !== created,
    editedAt: updated !== created ? updated : undefined,
  };
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Get current user's reviews
 */
export async function getReviews(): Promise<Review[]> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return [];

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("uid", session.session.user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as DbReview[]).map(mapDbToUi);
}

/**
 * Get all public reviews (feed)
 */
export async function getPublicReviews(limit = 50): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as DbReview[]).map(mapDbToUi);
}

/**
 * Get public reviews from users the current user follows
 */
export async function getFriendsReviews(): Promise<Review[]> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return [];

  // Get followed user IDs
  const { data: follows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", session.session.user.id);

  const followedIds = follows?.map(f => f.following_id) || [];
  if (followedIds.length === 0) return [];

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .in("uid", followedIds)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data as DbReview[]).map(mapDbToUi);
}

/**
 * Get reviews by a specific user
 */
export async function getUserReviews(userId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("uid", userId)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as DbReview[]).map(mapDbToUi);
}

/**
 * Get all public reviews for a specific album/track by its ID.
 * Also includes the current user's private reviews for this album.
 */
export async function getAlbumReviews(albumId: string): Promise<Review[]> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user?.id;

  // Fetch all public reviews for this album
  const { data: publicData, error: pubErr } = await supabase
    .from("reviews")
    .select("*")
    .eq("album_id", albumId)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (pubErr) throw pubErr;

  let allReviews = (publicData as DbReview[]).map(mapDbToUi);

  // Also fetch the current user's private reviews for this album
  if (userId) {
    const { data: privateData } = await supabase
      .from("reviews")
      .select("*")
      .eq("album_id", albumId)
      .eq("uid", userId)
      .eq("is_public", false);

    if (privateData && privateData.length > 0) {
      const privateReviews = (privateData as DbReview[]).map(mapDbToUi);
      // Merge, avoiding duplicates
      const existingIds = new Set(allReviews.map((r) => r.id));
      for (const r of privateReviews) {
        if (!existingIds.has(r.id)) allReviews.push(r);
      }
    }
  }

  return allReviews;
}

export async function createReview(
  review: Omit<Review, "id" | "timestamp" | "date" | "likes" | "comments">
): Promise<Review> {
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) throw sessionErr;

  const uid = sessionData.session?.user?.id;
  if (!uid) throw new Error("Auth session missing. Please log in again.");

  // Get real profile data for the review
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, avatar_url")
    .eq("id", uid)
    .single();

  const userName = profile?.display_name || profile?.username || review.userName || "Unknown";
  const userAvatar = profile?.avatar_url || review.userAvatar || null;

  const payload = {
    uid,
    user_name: userName,
    user_avatar: userAvatar,

    album_id: review.albumId ?? null,
    album_title: review.albumTitle ?? null,
    album_artist: review.albumArtist ?? null,
    album_cover: review.albumCover ?? null,

    rating: review.rating,
    review_type: review.type,
    content: review.content ?? null,
    tags: review.tags ?? [],

    is_public: review.isPublic,

    mood: review.mood ?? null,
    where_listened: review.whereListened ?? null,
    when_listened: review.whenListened ?? null,
    favorite_track: review.favoriteTrack ?? null,
  };

  const { data, error } = await supabase
    .from("reviews")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return mapDbToUi(data as DbReview);
}

export async function updateReviewApi(
  reviewId: string,
  updates: Partial<Review>
): Promise<Review> {
  const patch: any = {};

  if (updates.userName !== undefined) patch.user_name = updates.userName;
  if (updates.userAvatar !== undefined) patch.user_avatar = updates.userAvatar;

  if (updates.albumId !== undefined) patch.album_id = updates.albumId;
  if (updates.albumTitle !== undefined) patch.album_title = updates.albumTitle;
  if (updates.albumArtist !== undefined) patch.album_artist = updates.albumArtist;
  if (updates.albumCover !== undefined) patch.album_cover = updates.albumCover;

  if (updates.rating !== undefined) patch.rating = updates.rating;
  if (updates.type !== undefined) patch.review_type = updates.type;
  if (updates.content !== undefined) patch.content = updates.content;
  if (updates.tags !== undefined) patch.tags = updates.tags;

  if (updates.isPublic !== undefined) patch.is_public = updates.isPublic;

  if (updates.mood !== undefined) patch.mood = updates.mood ?? null;
  if (updates.whereListened !== undefined) patch.where_listened = updates.whereListened ?? null;
  if (updates.whenListened !== undefined) patch.when_listened = updates.whenListened ?? null;
  if (updates.favoriteTrack !== undefined) patch.favorite_track = updates.favoriteTrack ?? null;

  const { data, error } = await supabase
    .from("reviews")
    .update(patch)
    .eq("id", reviewId)
    .select("*")
    .single();

  if (error) throw error;
  return mapDbToUi(data as DbReview);
}

export async function deleteReviewApi(reviewId: string): Promise<void> {
  const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
  if (error) throw error;
}
