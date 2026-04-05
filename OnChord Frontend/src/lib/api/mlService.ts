// ML Service API client for mood classification and recommendations
import { z } from "zod";
import { optionalEnv } from "../env";

const ML_SERVICE_URL = optionalEnv("VITE_ML_SERVICE_URL", "http://localhost:8000");
const ML_API_TIMEOUT_MS = 12000;

// Cache health check result to avoid constant connection attempts
let cachedHealthCheck: MlServiceHealth | null = null;
let healthCheckCacheTime = 0;
const HEALTH_CHECK_CACHE_MS = 60000; // Cache for 60 seconds
let mlServiceUnavailable = false;
let mlServiceUnavailableUntil = 0;

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
  dominant_mood?: string | null;
  dominant_color?: string | null;
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

export interface MlServiceHealth {
  status: string;
  light_mode: boolean;
  taste_model_loaded: boolean;
  ml_taste_model_loaded: boolean;
  mood_classifier_loaded: boolean;
  ml_mood_model_loaded: boolean;
  genre_mood_fallback: boolean;
  tracks_loaded: number;
  inference_mode: string;
  ml_features_available: boolean;
}

const moodItemSchema = z.object({
  mood: z.string(),
  percentage: z.number(),
  color: z.string(),
});

const moodClassifyResponseSchema = z.object({
  moods: z.array(moodItemSchema),
  dominant_mood: z.string().nullable(),
  dominant_color: z.string().nullable(),
  track_count: z.number(),
  tracks_analyzed: z.number().optional(),
  insights: z.record(z.string(), z.string()),
  average_features: z.record(z.string(), z.number()).optional(),
});

const latentProfileSchema = z.object({
  "Energy-Valence Factor": z.number(),
  "Acoustic-Electronic Factor": z.number(),
  "Dance-Chill Factor": z.number(),
  "Vocal-Instrumental Factor": z.number(),
  "Tempo-Rhythm Factor": z.number(),
});

const tasteSimilarityResponseSchema = z.object({
  similarity: z.number(),
  algorithm: z.string(),
  user1_latent_profile: latentProfileSchema,
  user2_latent_profile: latentProfileSchema,
  model_info: z.object({
    is_trained: z.boolean(),
    algorithm: z.string(),
    n_components: z.number(),
    explained_variance: z.number(),
    n_tracks_trained: z.number(),
    features_used: z.array(z.string()),
    embeddings_loaded: z.number(),
  }),
});

const moodCategoriesSchema = z.object({
  categories: z.array(z.string()),
  colors: z.record(z.string(), z.string()),
});

const mlServiceHealthSchema = z.object({
  status: z.string(),
  light_mode: z.boolean(),
  taste_model_loaded: z.boolean(),
  ml_taste_model_loaded: z.boolean(),
  mood_classifier_loaded: z.boolean(),
  ml_mood_model_loaded: z.boolean(),
  genre_mood_fallback: z.boolean(),
  tracks_loaded: z.number(),
  inference_mode: z.string(),
  ml_features_available: z.boolean(),
});

const sampleProfilesSchema = z.object({
  profiles: z.record(z.string(), z.object({
    name: z.string(),
    description: z.string(),
    track_ids: z.array(z.string()),
  })),
});

const enhancedTasteResponseSchema = z.object({
  overall_similarity: z.number(),
  audio_similarity: z.number().nullable(),
  shared_tracks: z.array(z.string()),
  shared_albums: z.array(z.string()),
  shared_artists: z.array(z.string()),
  breakdown: z.object({
    base_similarity: z.number(),
    track_bonus: z.number(),
    album_bonus: z.number(),
    artist_bonus: z.number(),
    audio_score: z.number(),
  }),
});

async function fetchMlJson<T>(
  path: string,
  options: RequestInit,
  schema: z.ZodSchema<T>,
  fallbackErrorMessage: string
): Promise<T> {
  // Check if service is marked as unavailable (cooldown period)
  if (mlServiceUnavailable && Date.now() < mlServiceUnavailableUntil) {
    throw new Error("ML service is temporarily unavailable");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ML_API_TIMEOUT_MS);

  try {
    const response = await fetch(`${ML_SERVICE_URL}${path}`, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || fallbackErrorMessage);
    }

    const json = await response.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new Error(`Invalid ML response format for ${path}`);
    }

    // Clear unavailable flag on success
    mlServiceUnavailable = false;
    mlServiceUnavailableUntil = 0;

    return parsed.data;
  } catch (error: any) {
    // Detect connection-refused or network errors
    const isNetworkError = 
      error?.message?.includes("Failed to fetch") ||
      error?.message?.includes("ERR_CONNECTION_REFUSED") ||
      error?.name === "TypeError" ||
      error?.cause?.message?.includes("connection");
    
    if (isNetworkError) {
      // Mark service as unavailable for a bit to avoid hammering it
      mlServiceUnavailable = true;
      mlServiceUnavailableUntil = Date.now() + 30000; // 30 second cooldown
      // Silently fail with a subdued error message
      console.debug("ML service unavailable - using fallback mode");
      throw new Error("ML service unavailable");
    }

    if (error?.name === "AbortError") {
      throw new Error("ML service request timed out");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Classify playlist mood from audio features
 */
export async function classifyMusicMood(
  tracks: AudioFeatures[]
): Promise<MoodClassifyResponse> {
  return fetchMlJson(
    '/predict/mood',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tracks }),
    },
    moodClassifyResponseSchema,
    'Failed to classify mood'
  );
}

/**
 * Classify playlist mood from track IDs (uses local database)
 * Returns null if ML service is unavailable
 */
export async function classifyMoodByTrackIds(
  trackIds: string[]
): Promise<MoodClassifyResponse | null> {
  try {
    return await fetchMlJson(
      '/predict/mood/by-ids',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ track_ids: trackIds }),
      },
      moodClassifyResponseSchema,
      'Failed to classify mood'
    );
  } catch (error: any) {
    // ML service unavailable - return null for graceful degradation
    if (error?.message?.includes("unavailable")) {
      return null;
    }
    throw error;
  }
}

/**
 * Get taste similarity between two users
 */
export async function getTasteSimilarity(
  user1Tracks: string[],
  user2Tracks: string[]
): Promise<TasteSimilarityResponse> {
  return fetchMlJson(
    '/predict/ml_taste_similarity',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user1_tracks: user1Tracks,
        user2_tracks: user2Tracks,
      }),
    },
    tasteSimilarityResponseSchema,
    'Failed to compute similarity'
  );
}

/**
 * Get available mood categories
 */
export async function getMoodCategories(): Promise<{
  categories: string[];
  colors: Record<string, string>;
}> {
  return fetchMlJson(
    '/moods/categories',
    { method: 'GET' },
    moodCategoriesSchema,
    'Failed to fetch mood categories'
  );
}

/**
 * Health check for ML service with caching
 * Returns cached result if available, otherwise tries to fetch
 * Returns a default "unavailable" response if service is down
 */
export async function checkMlServiceHealth(): Promise<MlServiceHealth> {
  const now = Date.now();
  
  // Return cached result if fresh
  if (cachedHealthCheck && now - healthCheckCacheTime < HEALTH_CHECK_CACHE_MS) {
    return cachedHealthCheck;
  }

  try {
    const health = await fetchMlJson(
      '/health',
      { method: 'GET' },
      mlServiceHealthSchema,
      'ML service is not available'
    );
    
    // Cache the result
    cachedHealthCheck = health;
    healthCheckCacheTime = now;
    return health;
  } catch (error) {
    // Service unavailable - return default with all features disabled
    const unavailableHealth: MlServiceHealth = {
      status: 'unavailable',
      light_mode: false,
      taste_model_loaded: false,
      ml_taste_model_loaded: false,
      mood_classifier_loaded: false,
      ml_mood_model_loaded: false,
      genre_mood_fallback: false,
      tracks_loaded: 0,
      inference_mode: 'offline',
      ml_features_available: false,
    };
    
    // Cache the unavailable response briefly
    cachedHealthCheck = unavailableHealth;
    healthCheckCacheTime = now;
    
    return unavailableHealth;
  }
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
  return fetchMlJson(
    '/demo/sample-profiles',
    { method: 'GET' },
    sampleProfilesSchema,
    'Failed to fetch sample profiles'
  );
}

/**
 * Enhanced taste matching response
 */
export interface EnhancedTasteResponse {
  overall_similarity: number;
  audio_similarity?: number | null;
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
  return fetchMlJson(
    '/predict/enhanced_taste',
    {
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
    },
    enhancedTasteResponseSchema,
    'Failed to compute enhanced similarity'
  );
}

