// src/lib/api/homeData.ts
// Fetches personalized new releases and concerts based on user's music preferences

import { getUserTopArtists, isSpotifyConnected, getSpotifyAccessToken } from "./spotify";
import { getArtistEvents, TicketmasterEvent } from "./ticketmaster";
import { supabase } from "../supabaseClient";

export interface PersonalizedRelease {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  cover: string;
  releaseDate: string;
  releaseDateISO: string;
  type: "Album" | "Single" | "EP";
  trackCount: number;
  duration: string;
  previewUrl?: string;
  spotifyUrl?: string;
}

export interface PersonalizedEvent {
  id: string;
  artistName: string;
  venue: string;
  city: string;
  date: string;
  dateISO: string;
  time?: string;
  price?: string;
  description?: string;
  thumbnail?: string;
  ticketLink?: string;
}

// Cache for personalized releases to prevent excessive API calls
const releasesCache: { data: PersonalizedRelease[] | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Spotify API helper for fetching with token
async function spotifyFetch(url: string): Promise<Response> {
  const token = await getSpotifyAccessToken();
  return fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Rate limiting helper - add delay between requests
async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Track ongoing requests to prevent duplicate calls
let isLoadingReleases = false;

/**
 * Get new releases from the user's top artists
 * Fetches each artist's latest albums and returns the most recent ones
 */
export async function getPersonalizedNewReleases(limit: number = 4): Promise<PersonalizedRelease[]> {
  try {
    // Prevent duplicate simultaneous calls
    if (isLoadingReleases) {
      // Wait for existing request to complete
      await delay(100);
      if (releasesCache.data) {
        return releasesCache.data.slice(0, limit);
      }
    }

    // Check cache first
    const now = Date.now();
    if (releasesCache.data && (now - releasesCache.timestamp) < CACHE_DURATION) {
      return releasesCache.data.slice(0, limit);
    }

    isLoadingReleases = true;

    // Check if Spotify is connected
    if (!await isSpotifyConnected()) {
      isLoadingReleases = false;
      return getFallbackReleases();
    }

    // Get user's top artists
    const topArtistsResponse = await getUserTopArtists("medium_term", 10);
    const topArtists = topArtistsResponse?.items || [];

    if (topArtists.length === 0) {
      isLoadingReleases = false;
      return getFallbackReleases();
    }

    // Fetch latest albums for each artist sequentially with rate limiting
    // Only fetch from top 3 artists to reduce API calls
    const allAlbums: any[] = [];
    for (const artist of topArtists.slice(0, 3)) {
      try {
        const response = await spotifyFetch(
          `https://api.spotify.com/v1/artists/${artist.id}/albums?include_groups=album,single&market=US&limit=3`
        );
        if (response.ok) {
          const data = await response.json();
          const albums = (data.items || []).map((album: any) => ({
            ...album,
            artistName: artist.name,
            artistId: artist.id,
          }));
          allAlbums.push(...albums);
        } else if (response.status === 429) {
          // Rate limited - stop making more requests and use what we have
          console.log("Spotify rate limited, using cached/partial data");
          break;
        }
        // Add longer delay between requests to avoid rate limiting (300ms)
        await delay(300);
      } catch (err) {
        // Silently continue with other artists
      }
    }

    // Sort by release date (newest first)
    allAlbums.sort((a, b) => {
      const dateA = new Date(a.release_date || "1970-01-01").getTime();
      const dateB = new Date(b.release_date || "1970-01-01").getTime();
      return dateB - dateA;
    });

    // Transform to our format and take top releases (cache more than needed)
    const releases: PersonalizedRelease[] = allAlbums.slice(0, 15).map((album: any) => {
      const releaseDate = new Date(album.release_date);
      const now = new Date();
      const diffTime = now.getTime() - releaseDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      let formattedDate: string;
      if (diffDays === 0) formattedDate = "Today";
      else if (diffDays === 1) formattedDate = "Yesterday";
      else if (diffDays < 7) formattedDate = `${diffDays} days ago`;
      else if (diffDays < 30) formattedDate = `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? "s" : ""} ago`;
      else if (diffDays < 365) formattedDate = `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? "s" : ""} ago`;
      else formattedDate = releaseDate.toLocaleDateString();

      // Determine album type
      let type: "Album" | "Single" | "EP" = "Album";
      if (album.album_type === "single") type = "Single";
      else if (album.album_type === "compilation") type = "Album";
      else if (album.total_tracks <= 4) type = "EP";

      return {
        id: album.id,
        title: album.name,
        artist: album.artistName || album.artists?.[0]?.name || "Unknown Artist",
        artistId: album.artistId || album.artists?.[0]?.id || "",
        cover: album.images?.[0]?.url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400",
        releaseDate: formattedDate,
        releaseDateISO: album.release_date,
        type,
        trackCount: album.total_tracks || 0,
        duration: estimateDuration(album.total_tracks || 0),
        spotifyUrl: album.external_urls?.spotify,
      };
    });

    // Cache the results
    releasesCache.data = releases;
    releasesCache.timestamp = Date.now();
    isLoadingReleases = false;

    return releases.slice(0, limit);
  } catch (error) {
    isLoadingReleases = false;
    return getFallbackReleases();
  }
}

/**
 * Estimate album duration based on track count
 */
function estimateDuration(trackCount: number): string {
  // Average track is about 3.5 minutes
  const totalMinutes = Math.round(trackCount * 3.5);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:00`;
  }
  return `${totalMinutes}:00`;
}

/**
 * Get fallback releases using user's reviews/favorites or generic releases
 */
async function getFallbackReleases(): Promise<PersonalizedRelease[]> {
  // Try to get releases based on user's reviewed/favorited artists
  try {
    const { data: session } = await supabase.auth.getSession();
    if (session.session?.user?.id) {
      // Get artists from user's favorites
      const { data: favorites } = await supabase
        .from("favorites")
        .select("item_artist")
        .eq("user_id", session.session.user.id)
        .not("item_artist", "is", null)
        .limit(5);

      const artistNames = [...new Set(
        (favorites || [])
          .map(f => f.item_artist)
          .filter(Boolean)
      )];

      if (artistNames.length > 0) {
        // Search Spotify for these artists' latest releases
        // This would require Spotify connection, so fall back to static data
      }
    }
  } catch (err) {
    console.error("Fallback releases error:", err);
  }

  // Return static fallback data
  return [
    {
      id: "fallback-1",
      title: "Connect Spotify",
      artist: "to see personalized releases",
      artistId: "",
      cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400",
      releaseDate: "Now",
      releaseDateISO: new Date().toISOString(),
      type: "Album",
      trackCount: 0,
      duration: "--:--",
    },
  ];
}

/**
 * Get concerts for artists the user listens to
 */
export async function getPersonalizedConcerts(limit: number = 4): Promise<PersonalizedEvent[]> {
  try {
    // Get artist names from multiple sources
    const artistNames: string[] = [];

    // 1. Try to get from Spotify top artists
    if (await isSpotifyConnected()) {
      try {
        const topArtistsResponse = await getUserTopArtists("medium_term", 15);
        const topArtists = topArtistsResponse?.items || [];
        artistNames.push(...topArtists.map((a: any) => a.name));
      } catch (err) {
        console.error("Failed to get Spotify top artists:", err);
      }
    }

    // 2. Also check user's reviews and favorites for artist names
    try {
      const { data: session } = await supabase.auth.getSession();
      if (session.session?.user?.id) {
        const userId = session.session.user.id;

        // Get artists from favorites
        const { data: favorites } = await supabase
          .from("favorites")
          .select("item_artist")
          .eq("user_id", userId)
          .not("item_artist", "is", null)
          .limit(20);

        // Get artists from reviews
        const { data: reviews } = await supabase
          .from("reviews")
          .select("album_artist")
          .eq("uid", userId)
          .not("album_artist", "is", null)
          .limit(20);

        const favArtists = (favorites || []).map(f => f.item_artist).filter(Boolean);
        const revArtists = (reviews || []).map(r => r.album_artist).filter(Boolean);

        artistNames.push(...favArtists, ...revArtists);
      }
    } catch (err) {
      console.error("Failed to get artists from reviews/favorites:", err);
    }

    // Deduplicate artist names
    const uniqueArtists = [...new Set(artistNames)].slice(0, 10);

    if (uniqueArtists.length === 0) {
      return getFallbackConcerts();
    }

    // Search for events for these artists
    const events = await getArtistEvents(uniqueArtists, { size: 5 });

    // Transform to our format
    const personalizedEvents: PersonalizedEvent[] = events.slice(0, limit).map(event => ({
      id: event.id,
      artistName: event.artistName,
      venue: event.venue,
      city: event.city,
      date: event.date,
      dateISO: event.dateISO,
      time: event.time,
      price: event.price,
      description: event.description,
      thumbnail: event.thumbnail,
      ticketLink: event.ticketLink,
    }));

    if (personalizedEvents.length === 0) {
      return getFallbackConcerts();
    }

    return personalizedEvents;
  } catch (error) {
    console.error("Failed to get personalized concerts:", error);
    return getFallbackConcerts();
  }
}

/**
 * Fallback concerts when no personalized data available
 */
function getFallbackConcerts(): PersonalizedEvent[] {
  return [
    {
      id: "fallback-concert-1",
      artistName: "No upcoming concerts",
      venue: "Connect Spotify to see personalized events",
      city: "",
      date: "",
      dateISO: "",
    },
  ];
}
