// src/lib/api/spotify.ts
// Spotify integration using PKCE OAuth flow (no client secret needed)
import { supabase } from "../supabaseClient";

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string;
const SPOTIFY_REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI as string;

// Spotify OAuth scopes
const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-read-private",
  "user-top-read",
  "user-read-recently-played",
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");

// In-memory token cache to avoid DB lookups on every API call
let cachedAccessToken: string | null = null;
let cachedTokenExpiry: number = 0;

// ============================================
// PKCE Helpers
// ============================================

function generateRandomString(length: number): string {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest("SHA-256", data);
}

function base64encode(input: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

const CODE_VERIFIER_KEY = "spotify_pkce_code_verifier";

// ============================================
// OAuth Flow (PKCE — no client secret needed)
// ============================================

/**
 * Initiates Spotify OAuth flow using PKCE.
 * Generates a code verifier/challenge and redirects to Spotify authorization.
 */
export async function initiateSpotifyLogin() {
  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  // Store code verifier for the callback
  sessionStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);

  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.searchParams.append("client_id", SPOTIFY_CLIENT_ID);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("redirect_uri", SPOTIFY_REDIRECT_URI);
  authUrl.searchParams.append("scope", SPOTIFY_SCOPES);
  authUrl.searchParams.append("code_challenge_method", "S256");
  authUrl.searchParams.append("code_challenge", codeChallenge);
  authUrl.searchParams.append("show_dialog", "true");

  window.location.href = authUrl.toString();
}

/**
 * Handles the OAuth callback — exchanges authorization code for tokens using PKCE.
 * No client secret needed — the code_verifier proves we started the flow.
 * Stores tokens in Supabase spotify_connections table.
 */
export async function handleSpotifyCallback(code: string) {
  const codeVerifier = sessionStorage.getItem(CODE_VERIFIER_KEY);
  if (!codeVerifier) {
    throw new Error("No PKCE code verifier found. Please try connecting again.");
  }

  // Exchange authorization code for tokens (PKCE — no client_secret!)
  const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
      client_id: SPOTIFY_CLIENT_ID,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Spotify token exchange failed: ${error}`);
  }

  const tokens = await tokenResponse.json();

  // Clean up PKCE verifier
  sessionStorage.removeItem(CODE_VERIFIER_KEY);

  // Get Spotify user profile
  const profileResponse = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileResponse.ok) {
    throw new Error("Failed to fetch Spotify user profile");
  }

  const profile = await profileResponse.json();

  // Get current Supabase user
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error("Not authenticated with OnChord");
  }

  // Calculate expiry time
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // Store/update tokens in Supabase
  const { error } = await supabase.from("spotify_connections").upsert({
    user_id: sessionData.session.user.id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    spotify_user_id: profile.id,
    spotify_display_name: profile.display_name,
    spotify_email: profile.email,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to save Spotify connection: ${error.message}`);
  }

  // Update in-memory cache
  cachedAccessToken = tokens.access_token;
  cachedTokenExpiry = Date.now() + tokens.expires_in * 1000;

  return {
    spotify_display_name: profile.display_name,
    spotify_email: profile.email,
    spotify_user_id: profile.id,
  };
}

// ============================================
// Token Management
// ============================================

/**
 * Refreshes the Spotify access token using the refresh_token.
 * PKCE refresh doesn't require a client_secret — just client_id + refresh_token.
 */
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: SPOTIFY_CLIENT_ID,
    }),
  });

  if (!response.ok) {
    // Token refresh failed — user needs to re-authorize
    cachedAccessToken = null;
    cachedTokenExpiry = 0;
    throw new Error("Spotify session expired. Please reconnect your Spotify account.");
  }

  const data = await response.json();

  // Update tokens in Supabase
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session) {
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
    await supabase
      .from("spotify_connections")
      .update({
        access_token: data.access_token,
        // Spotify may or may not return a new refresh_token
        ...(data.refresh_token ? { refresh_token: data.refresh_token } : {}),
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", sessionData.session.user.id);
  }

  // Update cache
  cachedAccessToken = data.access_token;
  cachedTokenExpiry = Date.now() + data.expires_in * 1000;

  return data.access_token;
}

/**
 * Gets a valid Spotify access token. Handles caching and auto-refresh.
 * Call this before any Spotify API request.
 */
export async function getSpotifyAccessToken(): Promise<string> {
  // Check in-memory cache (with 5 min buffer before expiry)
  if (cachedAccessToken && cachedTokenExpiry > Date.now() + 5 * 60 * 1000) {
    return cachedAccessToken;
  }

  // Load from Supabase
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error("Not authenticated");
  }

  const { data: connection, error } = await supabase
    .from("spotify_connections")
    .select("*")
    .eq("user_id", sessionData.session.user.id)
    .maybeSingle();

  if (error || !connection) {
    throw new Error("No Spotify connection found. Please connect your Spotify account in Settings.");
  }

  // Check if token is still valid (with 5 min buffer)
  const expiresAt = new Date(connection.expires_at).getTime();
  if (expiresAt > Date.now() + 5 * 60 * 1000) {
    cachedAccessToken = connection.access_token;
    cachedTokenExpiry = expiresAt;
    return connection.access_token;
  }

  // Token expired — refresh it
  return refreshAccessToken(connection.refresh_token);
}

/**
 * Check if the current user has a Spotify connection (without throwing)
 */
export async function isSpotifyConnected(): Promise<boolean> {
  try {
    const connection = await getSpotifyConnection();
    return !!connection;
  } catch {
    return false;
  }
}

// ============================================
// Connection Management
// ============================================

/**
 * Gets the current user's Spotify connection status
 */
export async function getSpotifyConnection() {
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    return null;
  }

  const { data, error } = await supabase
    .from("spotify_connections")
    .select("*")
    .eq("user_id", sessionData.session.user.id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching Spotify connection:", error);
    return null;
  }

  return data;
}

/**
 * Disconnects Spotify by deleting the connection and clearing cache
 */
export async function disconnectSpotify() {
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    throw new Error("Not authenticated");
  }

  const { error, count } = await supabase
    .from("spotify_connections")
    .delete()
    .eq("user_id", sessionData.session.user.id)
    .select();

  if (error) {
    console.error("disconnectSpotify: Delete failed:", error);
    throw new Error("Failed to disconnect Spotify");
  }

  // Clear cache
  cachedAccessToken = null;
  cachedTokenExpiry = 0;
}

// ============================================
// Spotify API Calls
// ============================================

/**
 * Helper to make authenticated Spotify API requests with auto-retry on 401
 */
async function spotifyFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const accessToken = await getSpotifyAccessToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // Handle 403 errors
  if (response.status === 403) {
    const errorBody = await response.clone().json().catch(() => ({}));
    console.error("Spotify 403 Error:", errorBody);
  }

  // If 401, token might have been revoked — clear cache and try once more
  if (response.status === 401) {
    cachedAccessToken = null;
    cachedTokenExpiry = 0;
    const newToken = await getSpotifyAccessToken();
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${newToken}`,
      },
    });
  }

  return response;
}

/**
 * Search for albums, artists, or tracks on Spotify
 */
export async function spotifySearch(
  query: string,
  type: "album" | "artist" | "track" = "album",
  limit: number = 20
) {
  const url = new URL("https://api.spotify.com/v1/search");
  url.searchParams.append("q", query);
  url.searchParams.append("type", type);
  url.searchParams.append("limit", limit.toString());

  const response = await spotifyFetch(url.toString());

  if (!response.ok) {
    throw new Error("Spotify search failed");
  }

  return await response.json();
}

/**
 * Get user's top tracks
 */
export async function getUserTopTracks(
  timeRange: "short_term" | "medium_term" | "long_term" = "medium_term",
  limit: number = 50
) {
  const url = new URL("https://api.spotify.com/v1/me/top/tracks");
  url.searchParams.append("time_range", timeRange);
  url.searchParams.append("limit", limit.toString());

  const response = await spotifyFetch(url.toString());

  if (!response.ok) {
    throw new Error("Failed to get top tracks");
  }

  return await response.json();
}

/**
 * Get user's top artists
 */
export async function getUserTopArtists(
  timeRange: "short_term" | "medium_term" | "long_term" = "medium_term",
  limit: number = 50
) {
  const url = new URL("https://api.spotify.com/v1/me/top/artists");
  url.searchParams.append("time_range", timeRange);
  url.searchParams.append("limit", limit.toString());

  const response = await spotifyFetch(url.toString());

  if (!response.ok) {
    throw new Error("Failed to get top artists");
  }

  return await response.json();
}

/**
 * Search for an artist by name and return their info including genres
 * This is a workaround for dev mode not returning genres in other endpoints
 */
export async function searchArtistByName(artistName: string): Promise<{ genres: string[] } | null> {
  try {
    const url = new URL("https://api.spotify.com/v1/search");
    url.searchParams.append("q", `artist:"${artistName}"`);
    url.searchParams.append("type", "artist");
    url.searchParams.append("limit", "1");

    const response = await spotifyFetch(url.toString());
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const artists = data.artists?.items || [];
    
    if (artists.length > 0) {
      const artist = artists[0];
      return { genres: artist.genres || [] };
    }
    
    return null;
  } catch (err) {
    console.error(`[Spotify] Search error for "${artistName}":`, err);
    return null;
  }
}

/**
 * Get album details by ID
 */
export async function getAlbum(albumId: string) {
  const response = await spotifyFetch(
    `https://api.spotify.com/v1/albums/${albumId}`
  );

  if (!response.ok) {
    throw new Error("Failed to get album");
  }

  return await response.json();
}

/**
 * Get track details by ID
 */
export async function getTrack(trackId: string) {
  const response = await spotifyFetch(
    `https://api.spotify.com/v1/tracks/${trackId}`
  );

  if (!response.ok) {
    throw new Error("Failed to get track");
  }

  return await response.json();
}

/**
 * Get audio features for a track
 * Note: This endpoint may be restricted for new Spotify apps.
 * Returns null if unavailable rather than throwing.
 */
export async function getTrackAudioFeatures(trackId: string) {
  try {
    const response = await spotifyFetch(
      `https://api.spotify.com/v1/audio-features/${trackId}`
    );

    if (!response.ok) {
      console.warn("Audio features unavailable (may be restricted for this app)");
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Get audio features for multiple tracks at once
 * Returns null if unavailable.
 */
export async function getMultipleTrackAudioFeatures(trackIds: string[]) {
  if (trackIds.length === 0) return null;

  try {
    const url = new URL("https://api.spotify.com/v1/audio-features");
    url.searchParams.append("ids", trackIds.slice(0, 100).join(","));

    const response = await spotifyFetch(url.toString());

    if (!response.ok) {
      console.warn("Audio features unavailable (may be restricted for this app)");
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Get recently played tracks
 */
export async function getRecentlyPlayed(limit: number = 50) {
  const url = new URL("https://api.spotify.com/v1/me/player/recently-played");
  url.searchParams.append("limit", limit.toString());

  const response = await spotifyFetch(url.toString());

  if (!response.ok) {
    throw new Error("Failed to get recently played");
  }

  return await response.json();
}

/**
 * Get Spotify's recommendations based on seed tracks/artists/genres
 * Note: This endpoint may be restricted for new Spotify apps.
 * Returns null if unavailable.
 */
export async function getRecommendations(params: {
  seedTracks?: string[];
  seedArtists?: string[];
  seedGenres?: string[];
  limit?: number;
  targetEnergy?: number;
  targetDanceability?: number;
  targetValence?: number;
}) {
  try {
    const url = new URL("https://api.spotify.com/v1/recommendations");

    if (params.seedTracks?.length) {
      url.searchParams.append("seed_tracks", params.seedTracks.slice(0, 5).join(","));
    }
    if (params.seedArtists?.length) {
      url.searchParams.append("seed_artists", params.seedArtists.slice(0, 5).join(","));
    }
    if (params.seedGenres?.length) {
      url.searchParams.append("seed_genres", params.seedGenres.slice(0, 5).join(","));
    }
    url.searchParams.append("limit", (params.limit || 20).toString());

    if (params.targetEnergy !== undefined) {
      url.searchParams.append("target_energy", params.targetEnergy.toString());
    }
    if (params.targetDanceability !== undefined) {
      url.searchParams.append("target_danceability", params.targetDanceability.toString());
    }
    if (params.targetValence !== undefined) {
      url.searchParams.append("target_valence", params.targetValence.toString());
    }

    const response = await spotifyFetch(url.toString());

    if (!response.ok) {
      console.warn("Recommendations unavailable (may be restricted for this app)");
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Get user's Spotify profile
 */
export async function getSpotifyProfile() {
  const response = await spotifyFetch("https://api.spotify.com/v1/me");

  if (!response.ok) {
    throw new Error("Failed to get Spotify profile");
  }

  return await response.json();
}

/**
 * Get user's Spotify playlists
 */
export async function getUserPlaylists(limit: number = 50) {
  const response = await spotifyFetch(
    `https://api.spotify.com/v1/me/playlists?limit=${limit}`
  );

  if (!response.ok) {
    throw new Error("Failed to get playlists");
  }

  return await response.json();
}

/**
 * Get multiple artists by IDs (up to 50 at a time)
 * Returns artist details including genres
 */
export async function getArtists(artistIds: string[]) {
  if (artistIds.length === 0) return { artists: [] };
  
  // Spotify allows max 50 artists per request
  const ids = artistIds.slice(0, 50).join(',');
  const response = await spotifyFetch(
    `https://api.spotify.com/v1/artists?ids=${ids}`
  );

  if (!response.ok) {
    console.warn("Failed to get artists:", response.status);
    return { artists: [] };
  }

  return await response.json();
}

/**
 * Get tracks from a Spotify playlist
 */
export async function getPlaylistTracks(playlistId: string, limit: number = 100) {
  // Validate playlistId to prevent [object Object] issues
  if (!playlistId || typeof playlistId !== 'string' || playlistId.includes('[object')) {
    throw new Error(`Invalid playlist ID: ${playlistId}`);
  }

  const response = await spotifyFetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}`
  );

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("Spotify API access restricted. Try reconnecting Spotify in Settings.");
    }
    throw new Error(`Failed to get playlist tracks (${response.status})`);
  }

  return await response.json();
}
