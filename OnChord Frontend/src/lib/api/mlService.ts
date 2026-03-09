// ML Service API client for mood classification and recommendations

const ML_SERVICE_URL = import.meta.env.VITE_ML_SERVICE_URL || 'http://localhost:8000';

export interface AudioFeatures {
  danceability: number;
  energy: number;
  valence: number;
  acousticness?: number;
  instrumentalness?: number;
  liveness?: number;
  speechiness?: number;
  tempo?: number;
}

export interface MoodItem {
  mood: string;
  percentage: number;
  color: string;
}

export interface MoodClassifyResponse {
  moods: MoodItem[];
  dominant_mood: string | null;
  dominant_color: string | null;
  track_count: number;
  tracks_analyzed?: number;
  insights: Record<string, string>;
  average_features?: Record<string, number>;
}

export interface LatentProfile {
  'Energy-Valence Factor': number;
  'Acoustic-Electronic Factor': number;
  'Dance-Chill Factor': number;
  'Vocal-Instrumental Factor': number;
  'Tempo-Rhythm Factor': number;
}

export interface TasteSimilarityResponse {
  similarity: number;
  algorithm: string;
  user1_latent_profile: LatentProfile;
  user2_latent_profile: LatentProfile;
  model_info: {
    is_trained: boolean;
    algorithm: string;
    n_components: number;
    explained_variance: number;
    n_tracks_trained: number;
    features_used: string[];
    embeddings_loaded: number;
  };
}

/**
 * Classify playlist mood from audio features
 */
export async function classifyPlaylistMood(
  tracks: AudioFeatures[]
): Promise<MoodClassifyResponse> {
  const response = await fetch(`${ML_SERVICE_URL}/predict/mood`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tracks }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to classify mood');
  }

  return response.json();
}

/**
 * Classify playlist mood from track IDs (uses local database)
 */
export async function classifyMoodByTrackIds(
  trackIds: string[]
): Promise<MoodClassifyResponse> {
  const response = await fetch(`${ML_SERVICE_URL}/predict/mood/by-ids`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ track_ids: trackIds }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to classify mood');
  }

  return response.json();
}

/**
 * Get taste similarity between two users
 */
export async function getTasteSimilarity(
  user1Tracks: string[],
  user2Tracks: string[]
): Promise<TasteSimilarityResponse> {
  const response = await fetch(`${ML_SERVICE_URL}/predict/ml_taste_similarity`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user1_tracks: user1Tracks,
      user2_tracks: user2Tracks,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to compute similarity');
  }

  return response.json();
}

/**
 * Get available mood categories
 */
export async function getMoodCategories(): Promise<{
  categories: string[];
  colors: Record<string, string>;
}> {
  const response = await fetch(`${ML_SERVICE_URL}/moods/categories`);
  if (!response.ok) {
    throw new Error('Failed to fetch mood categories');
  }
  return response.json();
}

/**
 * Health check for ML service
 */
export async function checkMlServiceHealth(): Promise<{
  status: string;
  taste_model_loaded: boolean;
  mood_classifier_loaded: boolean;
  tracks_loaded: number;
}> {
  const response = await fetch(`${ML_SERVICE_URL}/health`);
  if (!response.ok) {
    throw new Error('ML service is not available');
  }
  return response.json();
}

/**
 * Sample profile for taste matching demo
 */
export interface SampleProfile {
  name: string;
  description: string;
  track_ids: string[];
}

/**
 * Get sample user profiles for demo taste matching
 */
export async function getSampleProfiles(): Promise<{
  profiles: Record<string, SampleProfile>;
}> {
  const response = await fetch(`${ML_SERVICE_URL}/demo/sample-profiles`);
  if (!response.ok) {
    throw new Error('Failed to fetch sample profiles');
  }
  return response.json();
}

/**
 * Enhanced taste matching response
 */
export interface EnhancedTasteResponse {
  overall_similarity: number;
  audio_similarity: number | null;
  shared_tracks: string[];
  shared_albums: string[];
  shared_artists: string[];
  breakdown: {
    base_similarity: number;
    track_bonus: number;
    album_bonus: number;
    artist_bonus: number;
    audio_score: number;
  };
}

/**
 * Enhanced taste matching using track IDs, album IDs, and artists
 * Combines ML audio similarity with explicit track/album/artist matching
 */
export async function getEnhancedTasteSimilarity(
  user1: { trackIds: string[]; albumIds: string[]; artists: string[] },
  user2: { trackIds: string[]; albumIds: string[]; artists: string[] }
): Promise<EnhancedTasteResponse> {
  const response = await fetch(`${ML_SERVICE_URL}/predict/enhanced_taste`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user1_track_ids: user1.trackIds,
      user2_track_ids: user2.trackIds,
      user1_album_ids: user1.albumIds,
      user2_album_ids: user2.albumIds,
      user1_artists: user1.artists,
      user2_artists: user2.artists,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to compute enhanced similarity');
  }

  return response.json();
}

/**
 * Classify mood from genres (when Spotify audio features are unavailable)
 */
export interface GenreMoodResponse {
  dominant_mood: string;
  confidence: number;
  mood_distribution: Record<string, number>;
  warning?: string;
}

export async function classifyMoodByGenres(genres: string[]): Promise<GenreMoodResponse> {
  const response = await fetch(`${ML_SERVICE_URL}/predict/mood/by-genres`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ genres }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to classify mood by genres');
  }

  return response.json();
}

/**
 * Response type for artist genres lookup
 */
export interface ArtistGenreResponse {
  genres: string[];
  artist_matches: Record<string, string[]>;
  artists_found: number;
  artists_not_found: string[];
}

/**
 * Look up genres for given artist names using ML service database
 * This is a workaround for Spotify API dev mode not returning genres
 */
export async function lookupArtistGenres(artists: string[]): Promise<ArtistGenreResponse> {
  const response = await fetch(`${ML_SERVICE_URL}/lookup/artist-genres`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ artists }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to look up artist genres');
  }

  return response.json();
}
