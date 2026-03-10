import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Smile, PartyPopper, TrendingUp, Flame, Zap, Brain, Music2, Loader2, RefreshCw, Sparkles, AlertCircle, Heart, ListMusic, ExternalLink, BarChart3 } from "lucide-react";
import { classifyPlaylistMood, classifyMoodByTrackIds, classifyMoodByGenres, lookupArtistGenres, checkMlServiceHealth, type MoodClassifyResponse, type AudioFeatures } from "../lib/api/mlService";
import { getMultipleTrackAudioFeatures, getUserPlaylists, getPlaylistTracks, getUserTopTracks, getUserTopArtists, getArtists, getRecentlyPlayed, isSpotifyConnected } from "../lib/api/spotify";
import { BackButton } from "./BackButton";
import { toast } from "sonner";

const moodIcons: Record<string, any> = {
  Aggressive: Flame,
  Chill: Smile,
  Hype: Zap,
  Melancholic: Heart,
  Happy: PartyPopper,
  Focus: Brain,
  Party: PartyPopper,
};

interface PlaylistMoodPageProps {
  onBack?: () => void;
  canGoBack?: boolean;
}

export function PlaylistMoodPage({ onBack, canGoBack }: PlaylistMoodPageProps) {
  const [moodData, setMoodData] = useState<MoodClassifyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mlServiceAvailable, setMlServiceAvailable] = useState<boolean | null>(null);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [analysisSource, setAnalysisSource] = useState<string>("playlist");
  const [tracksMatched, setTracksMatched] = useState<{analyzed: number, total: number} | null>(null);
  const [dbTrackCount, setDbTrackCount] = useState<number>(0);
  const [spotifyApiRestricted, setSpotifyApiRestricted] = useState(() => {
    return localStorage.getItem('spotify_api_restricted') === 'true';
  });
  
  // Playlist state
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>("");
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [selectedPlaylistName, setSelectedPlaylistName] = useState<string>("");

  // Update localStorage when API restriction state changes
  useEffect(() => {
    if (spotifyApiRestricted) {
      localStorage.setItem('spotify_api_restricted', 'true');
    }
  }, [spotifyApiRestricted]);

  // Check ML service health on mount
  useEffect(() => {
    checkMlServiceHealth()
      .then((health) => {
        setMlServiceAvailable(health.mood_classifier_loaded);
        setDbTrackCount(health.tracks_loaded || 0);
        console.log("[MoodPage] ML service health:", health);
      })
      .catch(() => {
        setMlServiceAvailable(false);
        console.warn("[MoodPage] ML service not available");
      });

    // Check Spotify connection
    isSpotifyConnected().then(setSpotifyConnected);
  }, []);

  // Load playlists when Spotify is connected
  useEffect(() => {
    if (spotifyConnected) {
      loadPlaylists();
    }
  }, [spotifyConnected]);

  const loadPlaylists = async () => {
    setLoadingPlaylists(true);
    try {
      const data = await getUserPlaylists(50);
      setPlaylists(data.items || []);
      console.log("[MoodPage] Loaded playlists:", data.items?.length, data.items?.[0]);
    } catch (err) {
      console.error("Failed to load playlists:", err);
      toast.error("Failed to load playlists");
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const analyzePlaylist = async (playlistId?: string | object, playlistName?: string) => {
    // Validate playlistId - must be a string, not an object
    const idToAnalyze = typeof playlistId === 'string' ? playlistId : selectedPlaylistId;
    const nameToAnalyze = playlistName || selectedPlaylistName;
    
    if (!idToAnalyze || typeof idToAnalyze !== 'string') {
      console.warn("[MoodPage] Invalid playlist ID:", playlistId);
      toast.error("Please select a playlist first");
      return;
    }

    // Prevent concurrent analysis
    if (isLoading) {
      console.warn("[MoodPage] Already analyzing, skipping");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisSource("playlist");

    try {
      // Get tracks from the selected playlist
      let playlistData;
      try {
        playlistData = await getPlaylistTracks(idToAnalyze, 100);
      } catch (playlistError: any) {
        // Playlist tracks endpoint is also restricted
        console.log("[MoodPage] Playlist tracks API restricted, using demo mode");
        setSpotifyApiRestricted(true);
        toast.info("Spotify API restricted - showing demo instead");
        runDemoAnalysis();
        return;
      }

      const trackIds = playlistData.items
        .map((item: any) => item.track?.id)
        .filter((id: string) => id)
        .filter((id: string, index: number, arr: string[]) => arr.indexOf(id) === index);

      if (trackIds.length === 0) {
        throw new Error("No tracks found in this playlist");
      }

      console.log(`[MoodPage] Analyzing playlist with ${trackIds.length} tracks`);

      // Try to get audio features from Spotify API
      const featuresData = await getMultipleTrackAudioFeatures(trackIds);
      
      if (featuresData && featuresData.audio_features) {
        // Spotify API worked - use audio features directly
        const audioFeatures: AudioFeatures[] = featuresData.audio_features
          .filter((f: any) => f !== null)
          .map((f: any) => ({
            danceability: f.danceability,
            energy: f.energy,
            valence: f.valence,
            acousticness: f.acousticness,
            instrumentalness: f.instrumentalness,
            liveness: f.liveness,
            speechiness: f.speechiness,
            tempo: f.tempo,
          }));

        const result = await classifyPlaylistMood(audioFeatures);
        setMoodData(result);
        setTracksMatched(null);
        toast.success(`Analyzed ${result.track_count} tracks from "${nameToAnalyze}"!`);
      } else {
        // Spotify API restricted - fall back to ML service track ID lookup
        console.log("[MoodPage] Spotify audio features unavailable, using ML service database fallback");
        setSpotifyApiRestricted(true);
        try {
          const result = await classifyMoodByTrackIds(trackIds);
          const foundCount = result.tracks_analyzed || result.track_count;
          
          setTracksMatched({ analyzed: foundCount, total: trackIds.length });
          setMoodData(result);
          
          if (foundCount < trackIds.length * 0.3) {
            toast.warning(`Only ${foundCount}/${trackIds.length} tracks found in database`);
          } else {
            toast.success(`Analyzed ${foundCount} tracks from "${nameToAnalyze}"!`);
          }
        } catch (mlError: any) {
          console.error("[MoodPage] ML service fallback failed:", mlError);
          toast.info("Tracks not in database - running demo mode instead");
          runDemoAnalysis();
          return;
        }
      }
    } catch (err: any) {
      console.error("Playlist analysis failed:", err);
      // If any error, fallback to demo
      setSpotifyApiRestricted(true);
      toast.info("API restricted - showing demo instead");
      runDemoAnalysis();
    } finally {
      setIsLoading(false);
    }
  };

  // Analyze user's top tracks using genre-based mood classification
  // NOTE: Spotify restricts playlist data and audio features for development apps.
  // Instead, we analyze the user's TOP 50 TRACKS (via /v1/me/top/tracks endpoint)
  // to determine their overall music mood profile. This provides a representative
  // sample of listening preferences while working within API limitations.
  const analyzeTopTracks = async (timeRange: "short_term" | "medium_term" | "long_term" = "medium_term") => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    setAnalysisSource("top_tracks");

    try {
      // Get user's top artists (this endpoint works and includes genres!)
      const topArtistsData = await getUserTopArtists(timeRange, 50);
      const artists = topArtistsData.items || [];
      
      if (artists.length === 0) {
        throw new Error("No top artists found. Listen to more music on Spotify!");
      }

      console.log(`[MoodPage] Got ${artists.length} top artists`);
      console.log(`[MoodPage] First artist sample:`, artists[0]);

      // Collect all genres from the top artists
      const allGenres: string[] = [];
      
      // Check if genres are directly available (they might not be in dev mode)
      let genresAvailable = false;
      for (const artist of artists) {
        if (artist.genres && Array.isArray(artist.genres) && artist.genres.length > 0) {
          genresAvailable = true;
          allGenres.push(...artist.genres);
        }
      }

      // If no genres in direct response, use ML service artist database as fallback
      if (!genresAvailable) {
        console.log(`[MoodPage] No genres in Spotify response, using ML service artist lookup...`);
        toast.info("Looking up genres from database...");
        
        // Get artist names
        const artistNames = artists.map((a: any) => a.name);
        
        // Use ML service to look up genres
        const genreLookup = await lookupArtistGenres(artistNames);
        console.log(`[MoodPage] Artist lookup: ${genreLookup.artists_found} found, ${genreLookup.artists_not_found.length} not found`);
        console.log(`[MoodPage] Artist matches:`, genreLookup.artist_matches);
        
        allGenres.push(...genreLookup.genres);
      }

      // Remove duplicates and normalize
      const uniqueGenres = [...new Set(allGenres.map((g: string) => g.toLowerCase()))];
      console.log(`[MoodPage] Found ${uniqueGenres.length} unique genres:`, uniqueGenres.slice(0, 10));
      console.log(`[MoodPage] All genres collected:`, allGenres.length);

      if (uniqueGenres.length === 0) {
        throw new Error("Could not determine genres from your top artists");
      }

      // Call ML service to classify mood by genres
      const genreMoodResult = await classifyMoodByGenres(uniqueGenres);
      console.log("[MoodPage] Genre mood result:", genreMoodResult);

      // Convert to MoodClassifyResponse format
      const moodColors: Record<string, string> = {
        Happy: "#FFD93D",
        Chill: "#6BCB77",
        Hype: "#FF6B6B",
        Melancholic: "#4D96FF",
        Aggressive: "#C34A36",
        Focus: "#9B59B6",
        Party: "#FF69B4",
      };

      const moods = Object.entries(genreMoodResult.mood_distribution)
        .map(([mood, percentage]) => ({
          mood,
          percentage: percentage * 100,
          color: moodColors[mood] || "#888888",
        }))
        .sort((a, b) => b.percentage - a.percentage);

      const result: MoodClassifyResponse = {
        moods,
        dominant_mood: genreMoodResult.dominant_mood,
        dominant_color: moodColors[genreMoodResult.dominant_mood] || "#888888",
        track_count: artists.length,
        insights: {
          "Analysis Source": "Your Top Artists",
          "Time Range": timeRange === "short_term" ? "Last 4 weeks" : timeRange === "medium_term" ? "Last 6 months" : "All time",
          "Genres Found": `${uniqueGenres.length} unique genres`,
          "Confidence": `${(genreMoodResult.confidence * 100).toFixed(0)}%`,
        },
      };

      setMoodData(result);
      setTracksMatched({ analyzed: artists.length, total: artists.length });
      
      const timeRangeLabel = timeRange === "short_term" ? "recent" : timeRange === "medium_term" ? "top" : "all-time";
      toast.success(`Analyzed ${artists.length} ${timeRangeLabel} artists!`);
      
    } catch (err: any) {
      console.error("Top artists analysis failed:", err);
      setError(err.message || "Failed to analyze top artists");
      toast.error(err.message || "Failed to analyze top artists");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Analyze recently played tracks - uses /me/player/recently-played endpoint
   * Gets the last 50 tracks played and extracts artist info for genre lookup
   */
  const analyzeRecentlyPlayed = async () => {
    setIsLoading(true);
    setError(null);
    setAnalysisSource("recently_played");

    try {
      // Get recently played tracks
      const recentData = await getRecentlyPlayed(50);
      const items = recentData.items || [];
      
      if (items.length === 0) {
        throw new Error("No recently played tracks found. Play some music on Spotify!");
      }

      console.log(`[MoodPage] Got ${items.length} recently played tracks`);
      console.log(`[MoodPage] First track sample:`, items[0]);

      // Extract unique artist names from recently played tracks
      const artistSet = new Set<string>();
      for (const item of items) {
        const track = item.track;
        if (track && track.artists) {
          for (const artist of track.artists) {
            artistSet.add(artist.name);
          }
        }
      }
      
      const artistNames = Array.from(artistSet);
      console.log(`[MoodPage] Found ${artistNames.length} unique artists from ${items.length} tracks`);

      if (artistNames.length === 0) {
        throw new Error("Could not extract artists from recently played tracks");
      }

      // Look up genres using ML service
      toast.info("Looking up genres from database...");
      const genreLookup = await lookupArtistGenres(artistNames);
      console.log(`[MoodPage] Artist lookup: ${genreLookup.artists_found} found, ${genreLookup.artists_not_found.length} not found`);

      const uniqueGenres = genreLookup.genres.map(g => g.toLowerCase());
      
      if (uniqueGenres.length === 0) {
        throw new Error("Could not determine genres from recently played tracks");
      }

      // Call ML service to classify mood by genres
      const genreMoodResult = await classifyMoodByGenres(uniqueGenres);
      console.log("[MoodPage] Genre mood result:", genreMoodResult);

      // Convert to MoodClassifyResponse format
      const moodColors: Record<string, string> = {
        Happy: "#FFD93D",
        Chill: "#6BCB77",
        Hype: "#FF6B6B",
        Melancholic: "#4D96FF",
        Aggressive: "#C34A36",
        Focus: "#9B59B6",
        Party: "#FF69B4",
      };

      const moods = Object.entries(genreMoodResult.mood_distribution)
        .map(([mood, percentage]) => ({
          mood,
          percentage: percentage * 100,
          color: moodColors[mood] || "#888888",
        }))
        .sort((a, b) => b.percentage - a.percentage);

      const result: MoodClassifyResponse = {
        moods,
        dominant_mood: genreMoodResult.dominant_mood,
        dominant_color: moodColors[genreMoodResult.dominant_mood] || "#888888",
        track_count: items.length,
        insights: {
          "Analysis Source": "Recently Played",
          "Tracks Analyzed": `${items.length} tracks`,
          "Artists Found": `${artistNames.length} unique artists`,
          "Genres Found": `${uniqueGenres.length} unique genres`,
          "Confidence": `${(genreMoodResult.confidence * 100).toFixed(0)}%`,
        },
      };

      setMoodData(result);
      setTracksMatched({ analyzed: items.length, total: items.length });
      
      toast.success(`Analyzed ${items.length} recently played tracks!`);
      
    } catch (err: any) {
      console.error("Recently played analysis failed:", err);
      setError(err.message || "Failed to analyze recently played");
      toast.error(err.message || "Failed to analyze recently played");
    } finally {
      setIsLoading(false);
    }
  };

  // Sample playlists for demo mode with different moods
  const samplePlaylists = {
    hiphop: {
      name: "Hip-Hop Bangers",
      description: "High energy rap & hip-hop",
      spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd",
      features: [
        { danceability: 0.85, energy: 0.78, valence: 0.45, tempo: 128, acousticness: 0.1, speechiness: 0.25 },
        { danceability: 0.72, energy: 0.85, valence: 0.35, tempo: 140, acousticness: 0.05, speechiness: 0.3 },
        { danceability: 0.68, energy: 0.92, valence: 0.28, tempo: 145, acousticness: 0.08, speechiness: 0.35 },
        { danceability: 0.78, energy: 0.88, valence: 0.52, tempo: 132, acousticness: 0.12, speechiness: 0.22 },
        { danceability: 0.82, energy: 0.75, valence: 0.65, tempo: 118, acousticness: 0.15, speechiness: 0.18 },
        { danceability: 0.65, energy: 0.95, valence: 0.22, tempo: 155, acousticness: 0.02, speechiness: 0.42 },
        { danceability: 0.88, energy: 0.82, valence: 0.58, tempo: 125, acousticness: 0.08, speechiness: 0.2 },
        { danceability: 0.92, energy: 0.9, valence: 0.75, tempo: 135, acousticness: 0.05, speechiness: 0.15 },
      ]
    },
    chill: {
      name: "Chill Vibes",
      description: "Relaxing lo-fi & ambient",
      spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn",
      features: [
        { danceability: 0.45, energy: 0.25, valence: 0.55, tempo: 85, acousticness: 0.75, speechiness: 0.04 },
        { danceability: 0.38, energy: 0.30, valence: 0.48, tempo: 78, acousticness: 0.82, speechiness: 0.03 },
        { danceability: 0.52, energy: 0.22, valence: 0.62, tempo: 90, acousticness: 0.68, speechiness: 0.05 },
        { danceability: 0.42, energy: 0.28, valence: 0.58, tempo: 82, acousticness: 0.72, speechiness: 0.04 },
        { danceability: 0.35, energy: 0.18, valence: 0.52, tempo: 75, acousticness: 0.88, speechiness: 0.02 },
        { danceability: 0.48, energy: 0.32, valence: 0.65, tempo: 88, acousticness: 0.65, speechiness: 0.06 },
        { danceability: 0.40, energy: 0.20, valence: 0.50, tempo: 80, acousticness: 0.85, speechiness: 0.03 },
        { danceability: 0.55, energy: 0.35, valence: 0.60, tempo: 92, acousticness: 0.60, speechiness: 0.05 },
      ]
    },
    party: {
      name: "Party Mix",
      description: "High energy dance & EDM",
      spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DX4dyzvuaRJ0n",
      features: [
        { danceability: 0.92, energy: 0.95, valence: 0.85, tempo: 128, acousticness: 0.02, speechiness: 0.08 },
        { danceability: 0.88, energy: 0.92, valence: 0.78, tempo: 130, acousticness: 0.05, speechiness: 0.06 },
        { danceability: 0.95, energy: 0.88, valence: 0.82, tempo: 125, acousticness: 0.03, speechiness: 0.10 },
        { danceability: 0.90, energy: 0.90, valence: 0.88, tempo: 132, acousticness: 0.04, speechiness: 0.07 },
        { danceability: 0.85, energy: 0.98, valence: 0.75, tempo: 140, acousticness: 0.02, speechiness: 0.05 },
        { danceability: 0.93, energy: 0.85, valence: 0.90, tempo: 126, acousticness: 0.06, speechiness: 0.09 },
        { danceability: 0.87, energy: 0.94, valence: 0.80, tempo: 135, acousticness: 0.03, speechiness: 0.08 },
        { danceability: 0.91, energy: 0.88, valence: 0.85, tempo: 128, acousticness: 0.04, speechiness: 0.06 },
      ]
    },
    sad: {
      name: "Sad Songs",
      description: "Melancholic & emotional",
      spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DX3YSRoSdA634",
      features: [
        { danceability: 0.35, energy: 0.25, valence: 0.15, tempo: 72, acousticness: 0.78, speechiness: 0.04 },
        { danceability: 0.28, energy: 0.30, valence: 0.12, tempo: 68, acousticness: 0.85, speechiness: 0.03 },
        { danceability: 0.32, energy: 0.22, valence: 0.18, tempo: 75, acousticness: 0.72, speechiness: 0.05 },
        { danceability: 0.25, energy: 0.28, valence: 0.10, tempo: 65, acousticness: 0.90, speechiness: 0.02 },
        { danceability: 0.38, energy: 0.35, valence: 0.22, tempo: 78, acousticness: 0.68, speechiness: 0.06 },
        { danceability: 0.30, energy: 0.20, valence: 0.08, tempo: 60, acousticness: 0.92, speechiness: 0.03 },
        { danceability: 0.22, energy: 0.18, valence: 0.05, tempo: 55, acousticness: 0.95, speechiness: 0.02 },
        { danceability: 0.40, energy: 0.32, valence: 0.20, tempo: 80, acousticness: 0.65, speechiness: 0.05 },
      ]
    },
    workout: {
      name: "Workout Power",
      description: "Aggressive & motivating",
      spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP",
      features: [
        { danceability: 0.65, energy: 0.98, valence: 0.45, tempo: 150, acousticness: 0.02, speechiness: 0.15 },
        { danceability: 0.58, energy: 0.95, valence: 0.38, tempo: 160, acousticness: 0.03, speechiness: 0.12 },
        { danceability: 0.62, energy: 0.92, valence: 0.42, tempo: 155, acousticness: 0.05, speechiness: 0.18 },
        { danceability: 0.55, energy: 0.99, valence: 0.35, tempo: 165, acousticness: 0.02, speechiness: 0.20 },
        { danceability: 0.68, energy: 0.90, valence: 0.48, tempo: 145, acousticness: 0.04, speechiness: 0.10 },
        { danceability: 0.52, energy: 0.96, valence: 0.32, tempo: 170, acousticness: 0.01, speechiness: 0.22 },
        { danceability: 0.60, energy: 0.94, valence: 0.40, tempo: 158, acousticness: 0.03, speechiness: 0.16 },
        { danceability: 0.70, energy: 0.88, valence: 0.50, tempo: 142, acousticness: 0.06, speechiness: 0.08 },
      ]
    },
    focus: {
      name: "Deep Focus",
      description: "Instrumental & concentration",
      spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ",
      features: [
        { danceability: 0.25, energy: 0.35, valence: 0.45, tempo: 95, acousticness: 0.45, instrumentalness: 0.92, speechiness: 0.02 },
        { danceability: 0.22, energy: 0.30, valence: 0.50, tempo: 90, acousticness: 0.52, instrumentalness: 0.95, speechiness: 0.01 },
        { danceability: 0.28, energy: 0.38, valence: 0.48, tempo: 100, acousticness: 0.40, instrumentalness: 0.88, speechiness: 0.03 },
        { danceability: 0.20, energy: 0.28, valence: 0.42, tempo: 85, acousticness: 0.58, instrumentalness: 0.98, speechiness: 0.01 },
        { danceability: 0.30, energy: 0.40, valence: 0.52, tempo: 105, acousticness: 0.38, instrumentalness: 0.85, speechiness: 0.04 },
        { danceability: 0.18, energy: 0.25, valence: 0.40, tempo: 80, acousticness: 0.65, instrumentalness: 0.96, speechiness: 0.01 },
        { danceability: 0.32, energy: 0.42, valence: 0.55, tempo: 110, acousticness: 0.35, instrumentalness: 0.82, speechiness: 0.03 },
        { danceability: 0.24, energy: 0.32, valence: 0.46, tempo: 92, acousticness: 0.48, instrumentalness: 0.90, speechiness: 0.02 },
      ]
    },
    rock: {
      name: "Rock Classics",
      description: "Classic rock anthems",
      spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DWXRqgorJj26U",
      features: [
        { danceability: 0.45, energy: 0.88, valence: 0.65, tempo: 125, acousticness: 0.15, instrumentalness: 0.05, speechiness: 0.05 },
        { danceability: 0.52, energy: 0.92, valence: 0.72, tempo: 130, acousticness: 0.08, instrumentalness: 0.02, speechiness: 0.04 },
        { danceability: 0.38, energy: 0.95, valence: 0.55, tempo: 140, acousticness: 0.12, instrumentalness: 0.08, speechiness: 0.06 },
        { danceability: 0.48, energy: 0.85, valence: 0.68, tempo: 118, acousticness: 0.20, instrumentalness: 0.04, speechiness: 0.05 },
        { danceability: 0.42, energy: 0.90, valence: 0.60, tempo: 135, acousticness: 0.10, instrumentalness: 0.06, speechiness: 0.04 },
        { danceability: 0.55, energy: 0.82, valence: 0.75, tempo: 115, acousticness: 0.25, instrumentalness: 0.03, speechiness: 0.06 },
        { danceability: 0.40, energy: 0.94, valence: 0.58, tempo: 145, acousticness: 0.05, instrumentalness: 0.10, speechiness: 0.03 },
        { danceability: 0.50, energy: 0.87, valence: 0.70, tempo: 122, acousticness: 0.18, instrumentalness: 0.05, speechiness: 0.05 },
      ]
    },
    jazz: {
      name: "Late Night Jazz",
      description: "Smooth jazz & soul",
      spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DX4wta20PHgwo",
      features: [
        { danceability: 0.55, energy: 0.35, valence: 0.62, tempo: 95, acousticness: 0.72, instrumentalness: 0.45, speechiness: 0.04 },
        { danceability: 0.48, energy: 0.28, valence: 0.58, tempo: 88, acousticness: 0.80, instrumentalness: 0.55, speechiness: 0.03 },
        { danceability: 0.52, energy: 0.32, valence: 0.65, tempo: 92, acousticness: 0.68, instrumentalness: 0.38, speechiness: 0.05 },
        { danceability: 0.60, energy: 0.40, valence: 0.70, tempo: 100, acousticness: 0.62, instrumentalness: 0.32, speechiness: 0.06 },
        { danceability: 0.45, energy: 0.25, valence: 0.55, tempo: 82, acousticness: 0.85, instrumentalness: 0.62, speechiness: 0.02 },
        { danceability: 0.58, energy: 0.38, valence: 0.68, tempo: 98, acousticness: 0.65, instrumentalness: 0.28, speechiness: 0.05 },
        { danceability: 0.42, energy: 0.30, valence: 0.52, tempo: 85, acousticness: 0.78, instrumentalness: 0.58, speechiness: 0.03 },
        { danceability: 0.50, energy: 0.35, valence: 0.60, tempo: 90, acousticness: 0.70, instrumentalness: 0.42, speechiness: 0.04 },
      ]
    },
    indie: {
      name: "Indie Discoveries",
      description: "Alternative & indie rock",
      spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DX2Nc3B70tvx0",
      features: [
        { danceability: 0.58, energy: 0.65, valence: 0.52, tempo: 118, acousticness: 0.35, instrumentalness: 0.12, speechiness: 0.04 },
        { danceability: 0.52, energy: 0.58, valence: 0.45, tempo: 112, acousticness: 0.42, instrumentalness: 0.08, speechiness: 0.05 },
        { danceability: 0.62, energy: 0.72, valence: 0.58, tempo: 125, acousticness: 0.28, instrumentalness: 0.15, speechiness: 0.04 },
        { danceability: 0.48, energy: 0.55, valence: 0.40, tempo: 108, acousticness: 0.48, instrumentalness: 0.10, speechiness: 0.06 },
        { danceability: 0.55, energy: 0.68, valence: 0.55, tempo: 120, acousticness: 0.32, instrumentalness: 0.18, speechiness: 0.03 },
        { danceability: 0.45, energy: 0.50, valence: 0.38, tempo: 102, acousticness: 0.55, instrumentalness: 0.05, speechiness: 0.05 },
        { danceability: 0.60, energy: 0.62, valence: 0.48, tempo: 115, acousticness: 0.38, instrumentalness: 0.12, speechiness: 0.04 },
        { danceability: 0.50, energy: 0.60, valence: 0.50, tempo: 110, acousticness: 0.40, instrumentalness: 0.08, speechiness: 0.05 },
      ]
    },
    reggae: {
      name: "Island Vibes",
      description: "Reggae & tropical beats",
      spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DXbSbnqxMTGx9",
      features: [
        { danceability: 0.78, energy: 0.58, valence: 0.82, tempo: 95, acousticness: 0.35, instrumentalness: 0.05, speechiness: 0.08 },
        { danceability: 0.82, energy: 0.55, valence: 0.85, tempo: 92, acousticness: 0.40, instrumentalness: 0.03, speechiness: 0.06 },
        { danceability: 0.75, energy: 0.62, valence: 0.78, tempo: 100, acousticness: 0.28, instrumentalness: 0.08, speechiness: 0.10 },
        { danceability: 0.80, energy: 0.52, valence: 0.88, tempo: 88, acousticness: 0.45, instrumentalness: 0.02, speechiness: 0.05 },
        { danceability: 0.72, energy: 0.60, valence: 0.75, tempo: 98, acousticness: 0.32, instrumentalness: 0.06, speechiness: 0.08 },
        { danceability: 0.85, energy: 0.58, valence: 0.90, tempo: 94, acousticness: 0.38, instrumentalness: 0.04, speechiness: 0.07 },
        { danceability: 0.76, energy: 0.55, valence: 0.80, tempo: 90, acousticness: 0.42, instrumentalness: 0.05, speechiness: 0.06 },
        { danceability: 0.78, energy: 0.60, valence: 0.82, tempo: 96, acousticness: 0.35, instrumentalness: 0.05, speechiness: 0.08 },
      ]
    },
    rnb: {
      name: "R&B Slow Jams",
      description: "Smooth R&B & soul",
      spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DX4SBhb3fqCJd",
      features: [
        { danceability: 0.68, energy: 0.45, valence: 0.55, tempo: 85, acousticness: 0.35, instrumentalness: 0.02, speechiness: 0.08 },
        { danceability: 0.72, energy: 0.50, valence: 0.60, tempo: 90, acousticness: 0.30, instrumentalness: 0.01, speechiness: 0.06 },
        { danceability: 0.65, energy: 0.42, valence: 0.48, tempo: 80, acousticness: 0.40, instrumentalness: 0.03, speechiness: 0.10 },
        { danceability: 0.70, energy: 0.48, valence: 0.58, tempo: 88, acousticness: 0.32, instrumentalness: 0.02, speechiness: 0.07 },
        { danceability: 0.62, energy: 0.38, valence: 0.42, tempo: 75, acousticness: 0.48, instrumentalness: 0.04, speechiness: 0.12 },
        { danceability: 0.75, energy: 0.52, valence: 0.65, tempo: 92, acousticness: 0.28, instrumentalness: 0.01, speechiness: 0.05 },
        { danceability: 0.68, energy: 0.45, valence: 0.52, tempo: 82, acousticness: 0.38, instrumentalness: 0.02, speechiness: 0.08 },
        { danceability: 0.72, energy: 0.48, valence: 0.58, tempo: 86, acousticness: 0.34, instrumentalness: 0.02, speechiness: 0.07 },
      ]
    },
    classical: {
      name: "Classical Essentials",
      description: "Orchestral masterpieces",
      spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DWWEJlAGA9gs0",
      features: [
        { danceability: 0.18, energy: 0.28, valence: 0.38, tempo: 75, acousticness: 0.92, instrumentalness: 0.98, speechiness: 0.02 },
        { danceability: 0.15, energy: 0.45, valence: 0.42, tempo: 110, acousticness: 0.88, instrumentalness: 0.96, speechiness: 0.01 },
        { danceability: 0.22, energy: 0.35, valence: 0.48, tempo: 85, acousticness: 0.90, instrumentalness: 0.95, speechiness: 0.02 },
        { danceability: 0.12, energy: 0.55, valence: 0.35, tempo: 125, acousticness: 0.85, instrumentalness: 0.98, speechiness: 0.01 },
        { danceability: 0.20, energy: 0.25, valence: 0.32, tempo: 65, acousticness: 0.95, instrumentalness: 0.99, speechiness: 0.01 },
        { danceability: 0.25, energy: 0.40, valence: 0.52, tempo: 95, acousticness: 0.82, instrumentalness: 0.94, speechiness: 0.02 },
        { danceability: 0.14, energy: 0.62, valence: 0.28, tempo: 140, acousticness: 0.78, instrumentalness: 0.97, speechiness: 0.01 },
        { danceability: 0.18, energy: 0.32, valence: 0.40, tempo: 80, acousticness: 0.90, instrumentalness: 0.96, speechiness: 0.02 },
      ]
    },
    metal: {
      name: "Heavy Metal",
      description: "Aggressive metal & hard rock",
      spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DX9qNs32fujYe",
      features: [
        { danceability: 0.35, energy: 0.98, valence: 0.28, tempo: 165, acousticness: 0.02, instrumentalness: 0.15, speechiness: 0.08 },
        { danceability: 0.32, energy: 0.96, valence: 0.22, tempo: 175, acousticness: 0.01, instrumentalness: 0.20, speechiness: 0.06 },
        { danceability: 0.38, energy: 0.94, valence: 0.32, tempo: 155, acousticness: 0.05, instrumentalness: 0.12, speechiness: 0.10 },
        { danceability: 0.30, energy: 0.99, valence: 0.18, tempo: 180, acousticness: 0.01, instrumentalness: 0.25, speechiness: 0.05 },
        { danceability: 0.42, energy: 0.92, valence: 0.35, tempo: 148, acousticness: 0.08, instrumentalness: 0.10, speechiness: 0.08 },
        { danceability: 0.28, energy: 0.97, valence: 0.15, tempo: 185, acousticness: 0.02, instrumentalness: 0.28, speechiness: 0.04 },
        { danceability: 0.35, energy: 0.95, valence: 0.25, tempo: 160, acousticness: 0.03, instrumentalness: 0.18, speechiness: 0.07 },
        { danceability: 0.40, energy: 0.90, valence: 0.30, tempo: 150, acousticness: 0.06, instrumentalness: 0.14, speechiness: 0.09 },
      ]
    },
    latin: {
      name: "Latin Heat",
      description: "Reggaeton & Latin pop",
      spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DX10zKzsJ2jva",
      features: [
        { danceability: 0.88, energy: 0.82, valence: 0.78, tempo: 98, acousticness: 0.15, instrumentalness: 0.02, speechiness: 0.12 },
        { danceability: 0.92, energy: 0.78, valence: 0.85, tempo: 95, acousticness: 0.12, instrumentalness: 0.01, speechiness: 0.08 },
        { danceability: 0.85, energy: 0.85, valence: 0.72, tempo: 100, acousticness: 0.18, instrumentalness: 0.03, speechiness: 0.15 },
        { danceability: 0.90, energy: 0.80, valence: 0.80, tempo: 96, acousticness: 0.14, instrumentalness: 0.02, speechiness: 0.10 },
        { danceability: 0.86, energy: 0.88, valence: 0.68, tempo: 105, acousticness: 0.10, instrumentalness: 0.04, speechiness: 0.18 },
        { danceability: 0.94, energy: 0.75, valence: 0.88, tempo: 92, acousticness: 0.20, instrumentalness: 0.01, speechiness: 0.06 },
        { danceability: 0.88, energy: 0.82, valence: 0.75, tempo: 98, acousticness: 0.16, instrumentalness: 0.02, speechiness: 0.12 },
        { danceability: 0.90, energy: 0.78, valence: 0.82, tempo: 94, acousticness: 0.14, instrumentalness: 0.02, speechiness: 0.10 },
      ]
    }
  };

  const [selectedDemoPlaylist, setSelectedDemoPlaylist] = useState<string>("hiphop");

  // Demo mode with sample data
  const runDemoAnalysis = async (playlistKey?: string) => {
    setIsLoading(true);
    setError(null);
    setAnalysisSource("demo");

    const key = playlistKey || selectedDemoPlaylist;
    const playlist = samplePlaylists[key as keyof typeof samplePlaylists];

    try {
      const result = await classifyPlaylistMood(playlist.features);
      setMoodData(result);
      setTracksMatched(null);
      setSelectedPlaylistName(playlist.name);
      toast.success(`Analyzed "${playlist.name}" - ${result.track_count} tracks!`);
    } catch (err: any) {
      setError(err.message || "Failed to run demo");
      toast.error("Demo failed - is the ML service running?");
    } finally {
      setIsLoading(false);
    }
  };

  const dominantMood = moodData?.dominant_mood;
  const DominantIcon = dominantMood ? (moodIcons[dominantMood] || Smile) : Smile;

  return (
    <div className="space-y-6">
      {/* Header */}
      {canGoBack && onBack && <BackButton onBack={onBack} />}
      
      <div className="text-center space-y-2">
        <h1 className="text-3xl text-foreground">Playlist Mood Analysis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          AI-powered mood classification using Spotify audio features
        </p>
      </div>

      {/* ML Service Status */}
      {mlServiceAvailable === false && (
        <Card className="p-4 bg-amber-500/10 border-amber-500/30">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-amber-500">ML Features Limited</p>
              <p className="text-xs text-muted-foreground">
                Advanced mood analysis is temporarily unavailable. Basic features still work!
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Spotify API Restriction Notice */}
      {spotifyApiRestricted && (
        <Card className="p-4 bg-amber-500/10 border-amber-500/30">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Spotify API Access Restricted</p>
              <p className="text-xs text-muted-foreground">
                Spotify restricts playlist and audio data for development apps (requires 250k+ users for Extended Quota). 
                Use <strong>Demo Mode</strong> below to see the full mood analysis experience with sample data.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Analysis Options */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-foreground mb-4">Analyze Playlist Mood</h3>
        
        {/* Demo Mode - Sample Playlists Grid */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h4 className="font-semibold text-foreground">Demo Mode - Sample Playlists</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Select a sample playlist to analyze its mood profile:
          </p>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(samplePlaylists).map(([key, playlist]) => (
              <div key={key} className="relative">
                <Button
                  onClick={() => runDemoAnalysis(key as keyof typeof samplePlaylists)}
                  disabled={isLoading || !mlServiceAvailable}
                  className="w-full h-auto p-4 pr-10 flex flex-col items-start gap-1 text-left bg-primary/5 hover:bg-primary/15 border-primary/20 border"
                  variant="outline"
                >
                  <span className="font-medium text-sm">{playlist.name}</span>
                  <span className="text-xs text-muted-foreground line-clamp-2">{playlist.description}</span>
                </Button>
                <a
                  href={playlist.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                  title="Open in Spotify"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Spotify Playlist Option */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or analyze your playlist</span>
          </div>
        </div>

        {!spotifyConnected ? (
          <div className="text-center py-6">
            <Music2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4 text-sm">Connect Spotify to analyze your playlists</p>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/settings'}>
              Connect Spotify
            </Button>
          </div>
        ) : spotifyApiRestricted ? (
          <div className="space-y-4">
            <div className="text-center py-4 bg-primary/5 rounded-lg border border-primary/20">
              <BarChart3 className="w-8 h-8 text-primary mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-2">Analyze Your Top Tracks</p>
              <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
                Spotify restricts playlist data for dev apps, but we can analyze your <strong>Top Tracks</strong> using genre-based mood classification!
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button 
                  onClick={() => analyzeTopTracks("short_term")}
                  disabled={isLoading || !mlServiceAvailable}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  {isLoading && analysisSource === "top_tracks" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                  Last 4 Weeks
                </Button>
                <Button 
                  onClick={() => analyzeTopTracks("medium_term")}
                  disabled={isLoading || !mlServiceAvailable}
                  size="sm"
                  className="text-xs"
                >
                  {isLoading && analysisSource === "top_tracks" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                  Last 6 Months
                </Button>
                <Button 
                  onClick={() => analyzeTopTracks("long_term")}
                  disabled={isLoading || !mlServiceAvailable}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  {isLoading && analysisSource === "top_tracks" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                  All Time
                </Button>
              </div>
            </div>
            
            {/* Recently Played Section */}
            <div className="text-center py-4 bg-green-500/5 rounded-lg border border-green-500/20">
              <Music2 className="w-8 h-8 text-green-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-2">Analyze Recently Played</p>
              <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
                Analyze the last 50 tracks you've listened to on Spotify for a real-time mood snapshot!
              </p>
              <Button 
                onClick={analyzeRecentlyPlayed}
                disabled={isLoading || !mlServiceAvailable}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isLoading && analysisSource === "recently_played" ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Music2 className="w-3 h-3 mr-2" />}
                Analyze Recent Listens
              </Button>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs w-full"
              onClick={() => {
                localStorage.removeItem('spotify_api_restricted');
                setSpotifyApiRestricted(false);
              }}
            >
              Try Personal Playlists Again
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Playlist Dropdown */}
            <div className="flex gap-3">
              <Select 
                value={selectedPlaylistId} 
                onValueChange={(value) => {
                  const playlist = playlists.find(p => p.id === value);
                  const playlistName = playlist?.name || "";
                  setSelectedPlaylistId(value);
                  setSelectedPlaylistName(playlistName);
                  // Auto-analyze when playlist is selected
                  analyzePlaylist(value, playlistName);
                }}
                disabled={loadingPlaylists || isLoading}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={loadingPlaylists ? "Loading playlists..." : "Select a playlist"} />
                </SelectTrigger>
                <SelectContent>
                  {playlists.map((playlist) => (
                    <SelectItem key={playlist.id} value={playlist.id}>
                      <div className="flex items-center gap-2">
                        <ListMusic className="w-4 h-4" />
                        <span>{playlist.name}</span>
                        {playlist.tracks?.total > 0 && (
                          <span className="text-muted-foreground text-xs">({playlist.tracks.total} tracks)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                onClick={() => analyzePlaylist()}
                disabled={isLoading || !selectedPlaylistId || !mlServiceAvailable}
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Music2 className="w-4 h-4 mr-2" />
                )}
                Analyze
              </Button>
            </div>
          </div>
        )}

        {/* Refresh after results */}
        {moodData && (
          <div className="mt-4 pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={runDemoAnalysis}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Run Again
            </Button>
          </div>
        )}
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card className="p-8 bg-card border-border">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-muted-foreground">Analyzing mood with ML...</p>
          </div>
        </Card>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card className="p-6 bg-destructive/10 border-destructive/30">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </Card>
      )}

      {/* Results */}
      {moodData && !isLoading && (
        <>
          {/* Low Match Rate Warning */}
          {tracksMatched && tracksMatched.analyzed < tracksMatched.total * 0.3 && (
            <Card className="p-4 bg-chart-5/10 border-chart-5/30">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-chart-5" />
                <div>
                  <p className="text-sm font-medium text-chart-5">Limited Data Available</p>
                  <p className="text-xs text-muted-foreground">
                    Only {tracksMatched.analyzed} of {tracksMatched.total} tracks were found in our database. 
                    Results may not fully reflect your listening habits. Try Demo Mode for a full sample.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Dominant Mood Card */}
          <Card 
            className="p-8 border"
            style={{ 
              background: `linear-gradient(135deg, ${moodData.dominant_color}20, ${moodData.dominant_color}05)`,
              borderColor: `${moodData.dominant_color}40`
            }}
          >
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div 
                  className="p-6 rounded-full"
                  style={{ backgroundColor: `${moodData.dominant_color}30` }}
                >
                  <DominantIcon className="w-12 h-12" style={{ color: moodData.dominant_color }} />
                </div>
              </div>
                    <div>
                <p className="text-muted-foreground mb-1">Your playlist has a</p>
                <h2 className="text-4xl mb-2" style={{ color: moodData.dominant_color }}>
                  {dominantMood} Vibe
                </h2>
                <p className="text-foreground">
                  Based on {moodData.track_count} tracks analyzed
                  {tracksMatched && tracksMatched.analyzed < tracksMatched.total && (
                    <span className="text-muted-foreground text-sm">
                      {" "}(matched {tracksMatched.analyzed} of {tracksMatched.total} from your library)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </Card>

          {/* Mood Breakdown */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-foreground mb-6">Mood Breakdown</h3>
            <div className="space-y-6">
              {moodData.moods
                .filter((mood) => mood.percentage > 5)
                .map((mood) => {
                  const Icon = moodIcons[mood.mood] || Smile;
                  return (
                    <div key={mood.mood} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: `${mood.color}20` }}
                          >
                            <Icon className="w-5 h-5" style={{ color: mood.color }} />
                          </div>
                          <span className="text-foreground">{mood.mood}</span>
                        </div>
                        <span className="text-foreground font-medium">{mood.percentage.toFixed(1)}%</span>
                      </div>
                      <Progress
                        value={mood.percentage}
                        className="h-2"
                        style={{ "--progress-background": mood.color } as React.CSSProperties}
                      />
                    </div>
                  );
                })}
            </div>
          </Card>

          {/* Mood Badges */}
          <Card className="p-6 bg-card border-border">
            <h3 className="text-foreground mb-4">Your Mood Tags</h3>
            <div className="flex flex-wrap gap-3">
              {moodData.moods
                .filter((mood) => mood.percentage > 10)
                .slice(0, 4)
                .map((mood) => (
                  <Badge 
                    key={mood.mood}
                    className="px-4 py-2 text-sm"
                    style={{ 
                      backgroundColor: `${mood.color}20`,
                      color: mood.color,
                      borderColor: mood.color
                    }}
                  >
                    {moodIcons[mood.mood] && (
                      <span className="mr-1">
                        {mood.mood === "Aggressive" && "🔥"}
                        {mood.mood === "Chill" && "😌"}
                        {mood.mood === "Hype" && "⚡"}
                        {mood.mood === "Melancholic" && "💙"}
                        {mood.mood === "Happy" && "🎉"}
                        {mood.mood === "Focus" && "🧠"}
                        {mood.mood === "Party" && "💃"}
                      </span>
                    )}
                    {mood.mood}
                  </Badge>
                ))}
            </div>
          </Card>

          {/* Insights */}
          {moodData.insights && Object.keys(moodData.insights).length > 0 && (
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(moodData.insights).slice(0, 4).map(([key, value]) => (
                <Card key={key} className="p-6 bg-card border-border">
                  <div className="flex gap-4">
                    <div className="bg-primary/20 p-3 rounded-lg h-fit">
                      <TrendingUp className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-foreground mb-2 capitalize">{key}</h4>
                      <p className="text-sm text-muted-foreground">{value}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Audio Features Stats */}
          {moodData.average_features && (
            <Card className="p-6 bg-card border-border">
              <h3 className="text-foreground mb-4">Audio Feature Averages</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(moodData.average_features)
                  .filter(([key]) => ["energy", "valence", "danceability", "tempo"].includes(key))
                  .map(([key, value]) => (
                    <div key={key} className="text-center p-3 bg-muted/20 rounded-lg">
                      <p className="text-2xl font-bold text-primary">
                        {key === "tempo" ? Math.round(value) : (value * 100).toFixed(0)}
                        {key === "tempo" ? "" : "%"}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{key}</p>
                    </div>
                  ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* How It Works */}
      {!moodData && !isLoading && (
        <Card className="p-6 bg-card border-border">
          <h3 className="text-foreground mb-3">How Mood Classification Works</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Our ML model analyzes Spotify audio features to determine the mood of your music:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span><strong>Energy</strong> - How intense and active the track feels</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span><strong>Valence</strong> - Musical positiveness (happy vs sad)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span><strong>Danceability</strong> - How suitable for dancing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span><strong>Tempo</strong> - Speed/pace of the music</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span><strong>Acousticness</strong> - Acoustic vs electronic sound</span>
            </li>
          </ul>
        </Card>
      )}
    </div>
  );
}