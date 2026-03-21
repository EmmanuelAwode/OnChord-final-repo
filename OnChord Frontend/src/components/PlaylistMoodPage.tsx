import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Smile, PartyPopper, TrendingUp, Flame, Zap, Brain, Music2, Loader2, AlertCircle, Heart } from "lucide-react";
import { classifyMoodByTrackIds, checkMlServiceHealth, type MoodClassifyResponse } from "../lib/api/mlService";
import { getUserTopTracks, isSpotifyConnected } from "../lib/api/spotify";
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
  const [selectedTimeRange, setSelectedTimeRange] = useState<"short_term" | "medium_term" | "long_term">("medium_term");
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);
  const [moodData, setMoodData] = useState<MoodClassifyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mlServiceAvailable, setMlServiceAvailable] = useState<boolean | null>(null);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [analysisSource, setAnalysisSource] = useState<string>("top_tracks");
  const [tracksMatched, setTracksMatched] = useState<{analyzed: number, total: number} | null>(null);

  // Check ML service health on mount
  useEffect(() => {
    checkMlServiceHealth()
      .then((health) => {
        setMlServiceAvailable(health.mood_classifier_loaded);
        console.log("[MoodPage] ML service health:", health);
      })
      .catch(() => {
        setMlServiceAvailable(false);
        console.warn("[MoodPage] ML service not available");
      });

    // Check Spotify connection
    isSpotifyConnected().then(setSpotifyConnected);
  }, []);

  // Analyze user's top tracks using the ML track-id classifier.
  const analyzeTopTracks = async (timeRange: "short_term" | "medium_term" | "long_term" = selectedTimeRange) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    setAnalysisSource("top_tracks");
    setSelectedTimeRange(timeRange);

    try {
      const topTracksData = await getUserTopTracks(timeRange, 50);
      const tracks = topTracksData.items || [];

      if (tracks.length === 0) {
        throw new Error("No top tracks found. Listen to more music on Spotify!");
      }

      const trackIds = tracks
        .map((track: any) => track.id)
        .filter((id: string | null | undefined): id is string => !!id)
        .filter((id: string, index: number, arr: string[]) => arr.indexOf(id) === index);

      if (trackIds.length === 0) {
        throw new Error("No valid track IDs found in your top tracks");
      }

      const result = await classifyMoodByTrackIds(trackIds);
      const analyzedCount = result.tracks_analyzed || result.track_count;
      setMoodData(result);
      setTracksMatched({ analyzed: analyzedCount, total: trackIds.length });
      setLastRunAt(new Date());
      
      const timeRangeLabel = timeRange === "short_term" ? "recent" : timeRange === "medium_term" ? "top" : "all-time";
      toast.success(`Analyzed ${analyzedCount}/${trackIds.length} ${timeRangeLabel} tracks!`);
      
    } catch (err: any) {
      console.error("Top tracks analysis failed:", err);
      setError(err.message || "Failed to analyze top tracks");
      toast.error(err.message || "Failed to analyze top tracks");
    } finally {
      setIsLoading(false);
    }
  };

  const dominantMood = moodData?.dominant_mood;
  const DominantIcon = dominantMood ? (moodIcons[dominantMood] || Smile) : Smile;
  const controlsDisabled = isLoading || mlServiceAvailable === false;
  const selectedTimeRangeLabel =
    selectedTimeRange === "short_term"
      ? "Last 4 Weeks"
      : selectedTimeRange === "medium_term"
      ? "Last 6 Months"
      : "All Time";

  return (
    <div className="space-y-6">
      {/* Header */}
      {canGoBack && onBack && <BackButton onClick={onBack} />}
      
      <div className="text-center space-y-2">
        <h1 className="text-3xl text-foreground">Playlist Mood Analysis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Analyze your Spotify top tracks with our ML mood classifier
        </p>
      </div>

      {/* ML Service Status */}
      {mlServiceAvailable === false && (
        <Card className="p-4 bg-amber-500/10 border-amber-500/30">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-amber-500">Mood Analysis Temporarily Unavailable</p>
              <p className="text-xs text-muted-foreground">
                The ML service is running in a limited mode. Mood analysis endpoints are disabled right now.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-auto px-0 text-xs text-amber-500 hover:text-amber-400"
                onClick={() => {
                  checkMlServiceHealth()
                    .then((health) => {
                      setMlServiceAvailable(health.mood_classifier_loaded);
                      if (health.mood_classifier_loaded) {
                        toast.success("Mood analysis is available again.");
                      } else {
                        toast.info("ML service is still in limited mode.");
                      }
                    })
                    .catch(() => toast.error("Unable to reach ML service"));
                }}
              >
                Retry health check
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Analysis Options */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-foreground mb-4">Analyze Top Tracks Mood</h3>

        {!spotifyConnected ? (
          <div className="text-center py-6">
            <Music2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4 text-sm">Connect Spotify to analyze your top tracks</p>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/settings'}>
              Connect Spotify
            </Button>
          </div>
        ) : (
          <div className="text-center py-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm font-medium text-foreground mb-2">Choose a Spotify time range</p>
            <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
              Mood is classified from your top track IDs only.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button 
                onClick={() => analyzeTopTracks("short_term")}
                disabled={controlsDisabled}
                size="sm"
                variant={selectedTimeRange === "short_term" ? "default" : "outline"}
                className="text-xs"
              >
                {isLoading && analysisSource === "top_tracks" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                Last 4 Weeks
              </Button>
              <Button 
                onClick={() => analyzeTopTracks("medium_term")}
                disabled={controlsDisabled}
                size="sm"
                variant={selectedTimeRange === "medium_term" ? "default" : "outline"}
                className="text-xs"
              >
                {isLoading && analysisSource === "top_tracks" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                Last 6 Months
              </Button>
              <Button 
                onClick={() => analyzeTopTracks("long_term")}
                disabled={controlsDisabled}
                size="sm"
                variant={selectedTimeRange === "long_term" ? "default" : "outline"}
                className="text-xs"
              >
                {isLoading && analysisSource === "top_tracks" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                All Time
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Active range: {selectedTimeRangeLabel}
              {lastRunAt ? ` · Last run: ${lastRunAt.toLocaleTimeString()}` : " · Not run yet"}
            </p>
          </div>
        )}

        {/* Refresh after results */}
        {moodData && (
          <div className="mt-4 pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => analyzeTopTracks(selectedTimeRange)}
              disabled={isLoading}
            >
              <Loader2 className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
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
                    Results may not fully reflect your listening habits.
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
                <p className="text-muted-foreground mb-1">Your top tracks have a</p>
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