// src/lib/useSpotify.ts
// Hook for managing Spotify connection state and API calls across components

import { useState, useEffect, useCallback } from "react";
import {
  isSpotifyConnected,
  getSpotifyConnection,
  getUserTopTracks,
  getUserTopArtists,
  getRecentlyPlayed,
  getTrackAudioFeatures,
  getMultipleTrackAudioFeatures,
  getRecommendations,
  spotifySearch,
} from "./api/spotify";

export interface SpotifyTrackItem {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    id: string;
    name: string;
    images: { url: string; width: number; height: number }[];
  };
  popularity: number;
  external_urls: { spotify: string };
  preview_url: string | null;
  duration_ms: number;
}

export interface SpotifyArtistItem {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  images: { url: string; width: number; height: number }[];
  external_urls: { spotify: string };
}

export interface AudioFeatures {
  danceability: number;
  energy: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
  speechiness: number;
  liveness: number;
  tempo: number;
  loudness: number;
  key: number;
  mode: number;
  time_signature: number;
}

/**
 * Hook to check Spotify connection status
 */
export function useSpotifyConnection() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectionInfo, setConnectionInfo] = useState<any>(null);

  const checkConnection = useCallback(async () => {
    setLoading(true);
    try {
      const conn = await getSpotifyConnection();
      setConnected(!!conn);
      setConnectionInfo(conn);
    } catch {
      setConnected(false);
      setConnectionInfo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return { connected, loading, connectionInfo, refresh: checkConnection };
}

/**
 * Hook to fetch user's top tracks from Spotify
 */
export function useTopTracks(
  timeRange: "short_term" | "medium_term" | "long_term" = "medium_term",
  limit: number = 50
) {
  const [tracks, setTracks] = useState<SpotifyTrackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchTopTracks() {
      try {
        setLoading(true);
        setError(null);
        const connected = await isSpotifyConnected();
        if (!connected) {
          setTracks([]);
          setError("Spotify not connected");
          return;
        }

        const data = await getUserTopTracks(timeRange, limit);
        if (!cancelled) {
          setTracks(data.items || []);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("Failed to fetch top tracks:", err);
          setError(err.message);
          setTracks([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTopTracks();
    return () => { cancelled = true; };
  }, [timeRange, limit]);

  return { tracks, loading, error };
}

/**
 * Hook to fetch user's top artists from Spotify
 */
export function useTopArtists(
  timeRange: "short_term" | "medium_term" | "long_term" = "medium_term",
  limit: number = 50
) {
  const [artists, setArtists] = useState<SpotifyArtistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchTopArtists() {
      try {
        setLoading(true);
        setError(null);
        const connected = await isSpotifyConnected();
        if (!connected) {
          setArtists([]);
          setError("Spotify not connected");
          return;
        }

        const data = await getUserTopArtists(timeRange, limit);
        if (!cancelled) {
          setArtists(data.items || []);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("Failed to fetch top artists:", err);
          setError(err.message);
          setArtists([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTopArtists();
    return () => { cancelled = true; };
  }, [timeRange, limit]);

  return { artists, loading, error };
}

/**
 * Compute average audio features from an array of track IDs
 * Returns null if audio features are unavailable
 */
export async function computeAverageAudioFeatures(
  trackIds: string[]
): Promise<AudioFeatures | null> {
  if (trackIds.length === 0) return null;

  const data = await getMultipleTrackAudioFeatures(trackIds);
  if (!data || !data.audio_features) return null;

  const features = data.audio_features.filter(Boolean) as AudioFeatures[];
  if (features.length === 0) return null;

  const avg = (key: keyof AudioFeatures) =>
    features.reduce((sum, f) => sum + (f[key] as number), 0) / features.length;

  return {
    danceability: avg("danceability"),
    energy: avg("energy"),
    valence: avg("valence"),
    acousticness: avg("acousticness"),
    instrumentalness: avg("instrumentalness"),
    speechiness: avg("speechiness"),
    liveness: avg("liveness"),
    tempo: avg("tempo"),
    loudness: avg("loudness"),
    key: Math.round(avg("key")),
    mode: Math.round(avg("mode")),
    time_signature: Math.round(avg("time_signature")),
  };
}

/**
 * Get genre breakdown from top artists
 */
export function getGenreBreakdown(
  artists: SpotifyArtistItem[]
): { genre: string; count: number; percentage: number }[] {
  const genreMap = new Map<string, number>();

  for (const artist of artists) {
    const genres = Array.isArray(artist.genres) ? artist.genres : [];
    for (const genre of genres) {
      genreMap.set(genre, (genreMap.get(genre) || 0) + 1);
    }
  }

  const total = Array.from(genreMap.values()).reduce((a, b) => a + b, 0);

  return Array.from(genreMap.entries())
    .map(([genre, count]) => ({
      genre,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}
