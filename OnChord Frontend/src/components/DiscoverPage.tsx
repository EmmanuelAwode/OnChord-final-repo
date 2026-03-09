import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { handleImageError } from "./ui/utils";
import {
  Sparkles, TrendingUp, Music, Play, Clock, Headphones,
  Users, Heart, Disc3, Mic2, Zap, Link2, RefreshCw, Star
} from "lucide-react";
import { useState, useEffect } from "react";
import { useFavourites } from "../lib/useFavourites";
import { toast } from "sonner";
import {
  useSpotifyConnection,
  useTopTracks,
  useTopArtists,
  getGenreBreakdown,
  SpotifyTrackItem,
  SpotifyArtistItem,
} from "../lib/useSpotify";
import {
  getRecentlyPlayed,
  spotifySearch,
} from "../lib/api/spotify";
import { SongDetailModal } from "./SongDetailModal";

interface DiscoverPageProps {
  onNavigate: (page: string, options?: { insightsTab?: string }) => void;
  onOpenAlbum?: (albumId?: string) => void;
  onOpenReviewModal?: (mediaType: "album" | "song", mediaId: string, mediaTitle: string, mediaArtist: string, mediaCover: string) => void;
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 66000);
  const seconds = Math.floor((ms % 66000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/* ---------- Skeleton placeholders ---------- */

function TrackCardSkeleton() {
  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex gap-3 animate-pulse">
        <div className="w-16 h-16 rounded-lg bg-muted flex-shrink-0" />
        <div className="flex-1 space-y-2 py-1">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
          <div className="h-3 bg-muted rounded w-1/4" />
        </div>
      </div>
    </Card>
  );
}

function ArtistCardSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2 flex-shrink-0 animate-pulse">
      <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-muted" />
      <div className="h-3 bg-muted rounded w-16" />
    </div>
  );
}

/* ---------- Reusable track card ---------- */

function SpotifyTrackCard({
  track,
  index,
  onAlbumClick,
  onReview,
  onFavourite,
  isFav,
  onTrackClick,
}: {
  track: SpotifyTrackItem;
  index?: number;
  onAlbumClick?: (albumId: string) => void;
  onReview?: (track: SpotifyTrackItem, e: React.MouseEvent) => void;
  onFavourite?: (track: SpotifyTrackItem, e: React.MouseEvent) => void;
  isFav: boolean;
  onTrackClick?: (track: SpotifyTrackItem) => void;
}) {
  const albumCover =
    track.album.images[0]?.url || track.album.images[1]?.url || "";

  return (
    <Card
      className="p-4 bg-gradient-to-br from-card to-card/50 border-border hover:border-primary/50 transition-all group hover:shadow-lg"
      onClick={() => onTrackClick?.(track)}
      style={{ cursor: onTrackClick ? "pointer" : undefined }}
    >
      <div className="flex gap-3">
        {/* Album art */}
        <div
          className="relative flex-shrink-0 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onAlbumClick?.(track.album.id);
          }}
        >
          <img
            src={albumCover}
            alt={track.album.name}
            className="w-16 h-16 rounded-lg object-cover shadow-md group-hover:shadow-xl transition-shadow"
            onError={handleImageError}
          />
          <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Play className="w-6 h-6 text-white" fill="white" />
          </div>
          {index !== undefined && (
            <Badge className="absolute -top-2 -left-2 bg-secondary text-secondary-foreground border-0 text-xs w-6 h-6 flex items-center justify-center p-0 rounded-full">
              {index + 1}
            </Badge>
          )}
        </div>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm text-foreground font-medium truncate group-hover:text-primary transition-colors">
            {track.name}
          </h3>
          <p className="text-xs text-muted-foreground truncate mb-1">
            {track.artists.map((a) => a.name).join(", ")}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{formatDuration(track.duration_ms)}</span>
            {track.popularity > 0 && (
              <>
                <span className="text-border">·</span>
                <Star className="w-3 h-3" />
                <span>{track.popularity}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className={`h-8 w-8 p-0 ${
              isFav
                ? "text-accent hover:text-accent/80"
                : "text-muted-foreground hover:text-accent"
            }`}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onFavourite?.(track, e);
            }}
            aria-pressed={isFav}
            aria-label={isFav ? "Remove from favourites" : "Add to favourites"}
          >
            <Heart className={`w-4 h-4 ${isFav ? "fill-accent" : ""}`} aria-hidden="true" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onReview?.(track, e);
            }}
            aria-label="Write a review for this track"
            title="Write a review"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ========================================== */
/* ============  DISCOVER PAGE  ============= */
/* ========================================== */

export function DiscoverPage({ onNavigate, onOpenAlbum, onOpenReviewModal }: DiscoverPageProps) {
  const { connected, loading: connectionLoading } = useSpotifyConnection();
  const { tracks: topTracks, loading: topTracksLoading } = useTopTracks("medium_term", 10);
  const { artists: topArtists, loading: topArtistsLoading } = useTopArtists("medium_term", 20);

  const [discoveryTracks, setDiscoveryTracks] = useState<SpotifyTrackItem[]>([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(true);

  const [recentlyPlayed, setRecentlyPlayed] = useState<any[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [genreResults, setGenreResults] = useState<SpotifyTrackItem[]>([]);
  const [genreLoading, setGenreLoading] = useState(false);

  const { isSongFavourite, toggleSong } = useFavourites();

  const [songModalOpen, setSongModalOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrackItem | null>(null);

  // Derive genre list from top artists (safely handles missing genres)
  let genres: { genre: string; count: number; percentage: number }[] = [];
  try {
    genres = topArtists.length > 0 ? getGenreBreakdown(topArtists).slice(0, 12) : [];
  } catch {
    genres = [];
  }

  /* ---- data fetching effects ---- */

  // Recently played
  useEffect(() => {
    if (!connected || connectionLoading) return;
    setRecentLoading(true);
    getRecentlyPlayed(20)
      .then((data) => setRecentlyPlayed(data.items || []))
      .catch(() => setRecentlyPlayed([]))
      .finally(() => setRecentLoading(false));
  }, [connected, connectionLoading]);

  // Discovery: search for tracks by top artists the user might not know
  useEffect(() => {
    if (!connected || topArtistsLoading || topArtists.length === 0) {
      if (!topArtistsLoading && connected) setDiscoveryLoading(false);
      return;
    }
    setDiscoveryLoading(true);

    const topTrackIds = new Set(topTracks.map((t) => t.id));
    const artistNames = topArtists.slice(0, 5).map((a) => a.name);

    Promise.all(
      artistNames.map((name) =>
        spotifySearch(`artist:"${name}"`, "track", 10)
          .then((data) => (data.tracks?.items || []) as SpotifyTrackItem[])
          .catch(() => [] as SpotifyTrackItem[])
      )
    )
      .then((results) => {
        const allTracks = results.flat();
        // Remove duplicates and tracks the user already listens to
        const seen = new Set<string>();
        const filtered = allTracks.filter((t) => {
          if (seen.has(t.id) || topTrackIds.has(t.id)) return false;
          seen.add(t.id);
          return true;
        });
        // Shuffle for variety
        for (let i = filtered.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
        }
        setDiscoveryTracks(filtered.slice(0, 18));
      })
      .catch(() => setDiscoveryTracks([]))
      .finally(() => setDiscoveryLoading(false));
  }, [connected, topArtists, topArtistsLoading, topTracks]);

  // Genre search
  useEffect(() => {
    if (!selectedGenre || !connected) return;
    setGenreLoading(true);
    spotifySearch(`genre:"${selectedGenre}"`, "track", 20)
      .then((data) => setGenreResults(data.tracks?.items || []))
      .catch(() => setGenreResults([]))
      .finally(() => setGenreLoading(false));
  }, [selectedGenre, connected]);

  /* ---- callbacks ---- */

  const handleFavourite = (track: SpotifyTrackItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const albumCover = track.album.images[0]?.url || "";
    const added = toggleSong({
      id: track.id,
      title: track.name,
      artist: track.artists.map((a) => a.name).join(", "),
      albumId: track.album.id,
      albumCover,
      duration: formatDuration(track.duration_ms),
    });
    toast.success(
      added
        ? `Added "${track.name}" to favourites`
        : `Removed "${track.name}" from favourites`
    );
  };

  const handleReview = (track: SpotifyTrackItem, e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenReviewModal?.(
      "song",
      track.id,
      track.name,
      track.artists.map((a) => a.name).join(", "),
      track.album.images[0]?.url || ""
    );
  };

  const handleAlbumClick = (albumId: string) => {
    onOpenAlbum?.(albumId);
  };

  const handleTrackClick = (track: SpotifyTrackItem) => {
    setSelectedTrack(track);
    setSongModalOpen(true);
  };

  /* ---------- NOT CONNECTED ---------- */
  if (!connectionLoading && !connected) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-primary/20 to-accent/20 p-4 rounded-full">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl text-foreground">Discover</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Connect your Spotify account to get personalized music recommendations
          </p>
        </div>

        <Card className="p-8 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/30 max-w-lg mx-auto text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-green-500/20 p-4 rounded-full">
              <Music className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <h2 className="text-xl text-foreground mb-2">Connect Spotify</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Link your Spotify account to discover personalized recommendations
            based on your listening history, top artists, and favourite genres.
          </p>
          <Button
            onClick={() => onNavigate("settings")}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            <Link2 className="w-4 h-4 mr-2" />
            Connect in Settings
          </Button>
        </Card>

        {/* Still show taste-match CTA */}
        <Card className="p-6 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border-primary/30 max-w-lg mx-auto">
          <div className="flex items-start gap-4">
            <div className="bg-gradient-to-br from-primary/30 to-accent/30 p-3 rounded-lg flex-shrink-0 ring-2 ring-primary/20">
              <Users className="w-6 h-6 text-primary drop-shadow-lg" />
            </div>
            <div>
              <h3 className="text-foreground mb-2">Discover Your Music Soulmates</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Use AI-powered taste matching to connect with people who share your exact music vibe.
              </p>
              <Button
                size="sm"
                className="bg-gradient-to-r from-primary via-secondary to-accent hover:from-primary/90 hover:via-secondary/90 hover:to-accent/90 text-white shadow-lg"
                onClick={() => onNavigate("insights", { insightsTab: "taste" })}
              >
                <Users className="w-4 h-4 mr-2" />
                Find Your Taste Matches
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  /* ---------- LOADING ---------- */
  if (connectionLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-primary/20 to-accent/20 p-4 rounded-full animate-pulse">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl text-foreground">Discover</h1>
          <p className="text-muted-foreground">Loading your personalized experience…</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <TrackCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  /* ========== CONNECTED – MAIN CONTENT ========== */
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="bg-gradient-to-br from-primary/20 to-accent/20 p-4 rounded-full">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl text-foreground">Discover</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Personalized music recommendations based on your Spotify listening history
        </p>
      </div>

      {/* ===== MADE FOR YOU (Discovery via artist search) ===== */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h2 className="text-xl text-foreground">Made For You</h2>
          </div>
          <Badge className="bg-primary/20 text-primary border-0">
            Based on your top artists
          </Badge>
        </div>

        {(
          discoveryLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <TrackCardSkeleton key={i} />
              ))}
            </div>
          ) : discoveryTracks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {discoveryTracks.map((track) => (
                <SpotifyTrackCard
                  key={track.id}
                  track={track}
                  onAlbumClick={handleAlbumClick}
                  onReview={handleReview}
                  onFavourite={handleFavourite}
                  isFav={isSongFavourite(track.id)}
                  onTrackClick={handleTrackClick}
                />
              ))}
            </div>
          ) : (
            <>
              <Card className="p-6 text-center text-muted-foreground border-dashed mb-4">
                <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  No discovery tracks available right now. Here are your top tracks:
                </p>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(topTracks.length > 0 ? topTracks : recentlyPlayed).map((track: any) => (
                  <SpotifyTrackCard
                    key={track.id}
                    track={track}
                    onAlbumClick={handleAlbumClick}
                    onReview={handleReview}
                    onFavourite={handleFavourite}
                    isFav={isSongFavourite(track.id)}
                    onTrackClick={handleTrackClick}
                  />
                ))}
              </div>
            </>
          )
        )}
      </section>

      {/* ===== RECENTLY PLAYED ===== */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-chart-3" />
          <h2 className="text-xl text-foreground">Recently Played</h2>
        </div>

        {recentLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <TrackCardSkeleton key={i} />
            ))}
          </div>
        ) : recentlyPlayed.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentlyPlayed.map((item, idx) => (
              <SpotifyTrackCard
                key={`${item.track.id}-${idx}`}
                track={item.track}
                onAlbumClick={handleAlbumClick}
                onReview={handleReview}
                onFavourite={handleFavourite}
                isFav={isSongFavourite(item.track.id)}
              />
            ))}
          </div>
        ) : (
          <Card className="p-6 text-center text-muted-foreground border-dashed">
            <Headphones className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent listening history available.</p>
          </Card>
        )}
      </section>

      {/* ===== YOUR TOP ARTISTS ===== */}
      {(topArtistsLoading || topArtists.length > 0) && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Mic2 className="w-5 h-5 text-secondary" />
            <h2 className="text-xl text-foreground">Your Top Artists</h2>
          </div>

          {topArtistsLoading ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <ArtistCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: "thin" }}>
              {topArtists.slice(0, 12).map((artist, index) => (
                <div
                  key={artist.id}
                  className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group"
                >
                  <div className="relative">
                    <img
                      src={artist.images[0]?.url || artist.images[1]?.url || ""}
                      alt={artist.name}
                      className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover shadow-md group-hover:shadow-xl transition-all group-hover:scale-105 ring-2 ring-transparent group-hover:ring-primary/50"
                      onError={handleImageError}
                    />
                    <Badge className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-secondary text-secondary-foreground border-0 text-[10px] px-2 py-0">
                      #{index + 1}
                    </Badge>
                  </div>
                  <span className="text-xs text-foreground font-medium text-center truncate w-20 md:w-24 group-hover:text-primary transition-colors">
                    {artist.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ===== YOUR TOP TRACKS ===== */}
      {(topTracksLoading || topTracks.length > 0) && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-accent" />
            <h2 className="text-xl text-foreground">Your Top Tracks</h2>
          </div>

          {topTracksLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <TrackCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topTracks.map((track, index) => (
                <SpotifyTrackCard
                  key={track.id}
                  track={track}
                  index={index}
                  onAlbumClick={handleAlbumClick}
                  onReview={handleReview}
                  onFavourite={handleFavourite}
                  isFav={isSongFavourite(track.id)}
                  onTrackClick={handleTrackClick}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ===== EXPLORE BY GENRE ===== */}
      {genres.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Disc3 className="w-5 h-5 text-chart-3" />
            <h2 className="text-xl text-foreground">Explore by Genre</h2>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {genres.map(({ genre, percentage }) => (
              <Badge
                key={genre}
                className={`cursor-pointer transition-all hover:scale-105 ${
                  selectedGenre === genre
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-primary/10"
                }`}
                onClick={() =>
                  setSelectedGenre(selectedGenre === genre ? null : genre)
                }
              >
                {genre}
                <span className="ml-1 opacity-60">{percentage}%</span>
              </Badge>
            ))}
          </div>

          {selectedGenre && (
            <div className="space-y-4">
              {genreLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <TrackCardSkeleton key={i} />
                  ))}
                </div>
              ) : genreResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {genreResults.map((track) => (
                    <SpotifyTrackCard
                      key={track.id}
                      track={track}
                      onAlbumClick={handleAlbumClick}
                      onReview={handleReview}
                      onFavourite={handleFavourite}
                      isFav={isSongFavourite(track.id)}
                      onTrackClick={handleTrackClick}
                    />
                  ))}
                </div>
              ) : (
                <Card className="p-6 text-center text-muted-foreground border-dashed">
                  <p className="text-sm">
                    No results found for &ldquo;{selectedGenre}&rdquo;
                  </p>
                </Card>
              )}
            </div>
          )}
        </section>
      )}

      {/* ===== TASTE MATCH CTA ===== */}
      <Card className="p-6 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border-primary/30">
        <div className="flex items-start gap-4">
          <div className="bg-gradient-to-br from-primary/30 to-accent/30 p-3 rounded-lg flex-shrink-0 ring-2 ring-primary/20">
            <Users className="w-6 h-6 text-primary drop-shadow-lg" />
          </div>
          <div>
            <h3 className="text-foreground mb-2">Discover Your Music Soulmates</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Use AI-powered taste matching to connect with people who share your
              exact music vibe. Get personalized recommendations and discover
              hidden gems.
            </p>
            <Button
              size="sm"
              className="bg-gradient-to-r from-primary via-secondary to-accent hover:from-primary/90 hover:via-secondary/90 hover:to-accent/90 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all group relative overflow-hidden"
              onClick={() => onNavigate("insights", { insightsTab: "taste" })}
            >
              <Users className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
              Find Your Taste Matches
              <Sparkles className="w-3 h-3 ml-2 group-hover:scale-110 transition-transform" />
            </Button>
          </div>
        </div>
      </Card>
      <SongDetailModal
        isOpen={songModalOpen}
        onClose={() => setSongModalOpen(false)}
        track={selectedTrack}
        onOpenReviewModal={onOpenReviewModal}
      />
    </div>
  );
}