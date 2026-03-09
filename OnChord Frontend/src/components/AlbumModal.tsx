import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { MusicEmbed } from "./MusicEmbed";
import { Star, Heart, MessageCircle, Share2, Plus, X, Clock, Music, ExternalLink, Loader2 } from "lucide-react";

import { useFavourites } from "../lib/useFavourites";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import { useState, useEffect, useMemo } from "react";
import { ExpandableReviewCard } from "./ExpandableReviewCard";
import { getAlbumReviews } from "../lib/api/reviews";
import type { Review } from "../lib/useUserInteractions";

interface AlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  albumData?: any;
  loading?: boolean;
  onOpenReviewModal?: (mediaType: "album" | "song", mediaId: string, mediaTitle: string, mediaArtist: string, mediaCover: string) => void;
  reviews?: any[];
}

/** Normalise Spotify / mock album data into a consistent shape */
function normaliseAlbum(raw: any) {
  if (!raw) return null;

  // Song format (from list)
  const isSong = raw.type === "song";
  if (isSong) {
    return {
      id: raw.id,
      title: raw.title,
      artist: raw.artist,
      cover: raw.cover,
      year: "",
      releaseDate: "",
      genre: undefined,
      rating: undefined,
      spotifyUrl: raw.spotifyUrl || "",
      trackCount: 1,
      tracks: [],
      label: "",
      popularity: undefined,
      copyrights: [],
      _isSpotify: false,
      _isSong: true,
      albumName: raw.album,
      previewUrl: raw.previewUrl,
      appleMusicUrl: raw.appleMusicUrl,
    };
  }

  // Spotify album format has `name`, `images`, `artists`, `external_urls`, `tracks.items`
  const isSpotify = !!raw.external_urls || !!raw.images;

  if (isSpotify) {
    return {
      id: raw.id,
      title: raw.name,
      artist: (raw.artists || []).map((a: any) => a.name).join(", "),
      cover: raw.images?.[0]?.url || raw.images?.[1]?.url || "",
      year: raw.release_date?.slice(0, 4) || "",
      releaseDate: raw.release_date || "",
      genre: (raw.genres || []).join(", ") || undefined,
      rating: undefined, // no rating from Spotify
      spotifyUrl: raw.external_urls?.spotify || "",
      trackCount: raw.total_tracks || raw.tracks?.total || 0,
      tracks: (raw.tracks?.items || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        number: t.track_number,
        duration_ms: t.duration_ms,
        artists: (t.artists || []).map((a: any) => a.name).join(", "),
        spotifyUrl: t.external_urls?.spotify || "",
      })),
      label: raw.label || "",
      popularity: raw.popularity,
      copyrights: raw.copyrights || [],
      _isSpotify: true,
    };
  }

  // Mock data format
  return {
    id: raw.id || raw.albumId,
    title: raw.albumTitle || raw.title,
    artist: raw.albumArtist || raw.artist,
    cover: raw.albumCover || raw.cover,
    year: raw.year || "",
    releaseDate: "",
    genre: raw.genre || undefined,
    rating: raw.rating,
    spotifyUrl: raw.spotifyUrl || "",
    trackCount: typeof raw.tracks === "number" ? raw.tracks : 0,
    tracks: [],
    label: "",
    popularity: undefined,
    copyrights: [],
    _isSpotify: false,
  };
}

function formatTrackDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function AlbumModal({ isOpen, onClose, albumData, loading, onOpenReviewModal, reviews: propReviews }: AlbumModalProps) {
  const album = normaliseAlbum(albumData);

  // --- Fetch community reviews from Supabase ---
  const [communityReviews, setCommunityReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !album?.id || loading) {
      setCommunityReviews([]);
      return;
    }

    let cancelled = false;
    setReviewsLoading(true);

    getAlbumReviews(album.id)
      .then((reviews) => {
        if (!cancelled) setCommunityReviews(reviews);
      })
      .catch((err) => {
        console.error("Failed to fetch album reviews:", err);
        if (!cancelled) setCommunityReviews([]);
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, album?.id, loading]);

  // Merge community reviews with any locally-passed reviews (deduped)
  const albumReviews = useMemo(() => {
    if (!album) return communityReviews;
    const merged = [...communityReviews];
    const existingIds = new Set(merged.map((r) => r.id));
    // Add any prop reviews that match this album and aren't already included
    if (propReviews) {
      for (const r of propReviews) {
        if (
          !existingIds.has(r.id) &&
          (r.albumId === album.id || r.albumTitle === album.title)
        ) {
          merged.push(r);
          existingIds.add(r.id);
        }
      }
    }
    return merged;
  }, [communityReviews, propReviews, album]);

  // Compute average rating from all reviews
  const avgRating = useMemo(() => {
    const rated = albumReviews.filter((r) => r.rating > 0);
    if (rated.length === 0) return null;
    const sum = rated.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / rated.length) * 10) / 10;
  }, [albumReviews]);

  const reviewCount = albumReviews.length;

  const { isAlbumFavourite, toggleAlbum } = useFavourites();
  const isFavourite = album ? isAlbumFavourite(album.id) : false;

  const handleToggleFavourite = () => {
    if (!album) return;
    const added = toggleAlbum({
      id: album.id,
      title: album.title,
      artist: album.artist,
      cover: album.cover,
      releaseDate: album.year,
      trackCount: album.trackCount,
    });

    toast.success(
      added
        ? `Added "${album.title}" to favourites`
        : `Removed "${album.title}" from favourites`
    );
  };

  const [activeTab, setActiveTab] = useState("reviews");

  // If no album data, show loading state
  if (!album) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-[1600px] max-h-[90vh] overflow-y-auto bg-card border-border p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Loading…</DialogTitle>
            <DialogDescription>Fetching album details</DialogDescription>
          </DialogHeader>
          <div className="p-4 md:p-8 space-y-6 animate-pulse">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-56 lg:w-64 aspect-square bg-muted rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-4">
                <div className="h-8 bg-muted rounded w-3/4" />
                <div className="h-5 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-1/4" />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[1600px] max-h-[90vh] overflow-y-auto bg-card border-border p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{loading ? "Loading…" : album.title}</DialogTitle>
          <DialogDescription>
            {loading ? "Fetching details" : `${album._isSong ? "Song" : "Album"} details for ${album.title} by ${album.artist}`}
          </DialogDescription>
        </DialogHeader>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-50 rounded-full p-2 bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-foreground" />
        </button>

        {/* Loading skeleton */}
        {loading ? (
          <div className="p-4 md:p-8 space-y-6 animate-pulse">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-56 lg:w-64 aspect-square bg-muted rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-4">
                <div className="h-8 bg-muted rounded w-3/4" />
                <div className="h-5 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="flex gap-3 pt-4">
                  <div className="h-10 bg-muted rounded w-40" />
                  <div className="h-10 bg-muted rounded w-36" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 md:p-8 space-y-6">
            {/* Album Header */}
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                {/* Album Cover */}
                <div className="w-full md:w-56 lg:w-64 flex-shrink-0">
                  <img
                    src={album.cover}
                    alt={album.title}
                    className="w-full aspect-square object-cover rounded-xl shadow-2xl"
                  />
                </div>

                {/* Album Info */}
                <div className="flex-1 space-y-4">
                  <div>
                    {album._isSong && (
                      <Badge className="bg-secondary/20 text-secondary border-0 mb-2">
                        Song
                      </Badge>
                    )}
                    <h1 className="text-3xl md:text-4xl text-foreground mb-2">
                      {album.title}
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground">
                      {album.artist}
                    </p>
                    {album._isSong && album.albumName && (
                      <p className="text-sm text-muted-foreground mt-1">
                        From: {album.albumName}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                      {album.year && <span>{album.year}</span>}
                      {album.genre && (
                        <>
                          <span>·</span>
                          <span>{album.genre}</span>
                        </>
                      )}
                      {!album._isSong && album.trackCount > 0 && (
                        <>
                          <span>·</span>
                          <span>{album.trackCount} tracks</span>
                        </>
                      )}
                      {album.label && (
                        <>
                          <span>·</span>
                          <span>{album.label}</span>
                        </>
                      )}
                    </div>
                    {album.spotifyUrl && (
                      <a
                        href={album.spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2 text-sm text-green-500 hover:text-green-400 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in Spotify</span>
                      </a>
                    )}
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-primary/20 px-4 py-2 rounded-lg">
                      <Star className="w-6 h-6 text-primary fill-primary" />
                      <span className="text-2xl text-foreground">
                        {avgRating !== null ? avgRating.toFixed(1) : "—"}
                      </span>
                      <span className="text-muted-foreground">/5</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {reviewsLoading ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Loading reviews…
                        </span>
                      ) : (
                        `Based on ${reviewCount} review${reviewCount !== 1 ? "s" : ""}`
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 pt-4">
                    <Button
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() => {
                        onOpenReviewModal?.(
                          album._isSong ? "song" : "album",
                          album.id,
                          album.title,
                          album.artist,
                          album.cover
                        );
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Log / Review This
                    </Button>
                    <Button
                      variant="outline"
                      className="border-border"
                      onClick={handleToggleFavourite}
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      {isFavourite ? "Remove from" : "Add to"} Favorites
                    </Button>
                    <Button variant="outline" className="border-border">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>

                  {/* Popularity */}
                  {album.popularity !== undefined && (
                    <div className="pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground mb-1">
                        Spotify Popularity
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-muted rounded-full h-2 max-w-xs">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${album.popularity}%` }}
                          />
                        </div>
                        <span className="text-sm text-foreground font-medium">
                          {album.popularity}/100
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Music Embeds */}
            <div className="space-y-4">
              <h3 className="text-lg text-foreground">Listen</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MusicEmbed
                  type="spotify"
                  url={
                    album.spotifyUrl ||
                    `https://open.spotify.com/search/${encodeURIComponent(
                      album.title + " " + album.artist
                    )}`
                  }
                  title={album.title}
                  artist={album.artist}
                  embedType={album._isSong ? "track" : "album"}
                />
                <MusicEmbed
                  type="apple"
                  url={
                    album.appleMusicUrl ||
                    `https://music.apple.com/us/search?term=${encodeURIComponent(
                      album.title + " " + album.artist
                    )}`
                  }
                  title={album.title}
                  artist={album.artist}
                />
              </div>
            </div>

            {/* Track List (for Spotify albums) */}
            {album.tracks.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg text-foreground">
                  Tracklist
                  <span className="text-sm text-muted-foreground ml-2">
                    ({album.tracks.length} tracks)
                  </span>
                </h3>
                <Card className="divide-y divide-border border-border overflow-hidden">
                  {album.tracks.map((track: any) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group"
                    >
                      <span className="w-6 text-right text-sm text-muted-foreground font-mono">
                        {track.number}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {track.name}
                        </p>
                        {track.artists !== album.artist && (
                          <p className="text-xs text-muted-foreground truncate">
                            {track.artists}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        {formatTrackDuration(track.duration_ms)}
                      </div>
                    </div>
                  ))}
                </Card>
              </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-card border border-border w-full md:w-auto">
                <TabsTrigger
                  value="reviews"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Reviews
                </TabsTrigger>
                <TabsTrigger
                  value="ratings"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Ratings
                </TabsTrigger>
              </TabsList>

              {/* Reviews Tab */}
              <TabsContent value="reviews" className="space-y-4 mt-6">
                {reviewsLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading reviews…</span>
                  </div>
                ) : albumReviews.length > 0 ? (
                  albumReviews.map((review) => (
                    <ExpandableReviewCard key={review.id} review={review} />
                  ))
                ) : (
                  <Card className="p-8 bg-card border-border border-dashed">
                    <div className="text-center space-y-3">
                      <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
                      <p className="text-muted-foreground">
                        No reviews yet for this album
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Be the first to share your thoughts!
                      </p>
                      <Button
                        className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
                        onClick={() => {
                          onOpenReviewModal?.(
                            album._isSong ? "song" : "album",
                            album.id,
                            album.title,
                            album.artist,
                            album.cover
                          );
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Write a Review
                      </Button>
                    </div>
                  </Card>
                )}
              </TabsContent>

              {/* Ratings Tab */}
              <TabsContent value="ratings" className="mt-6">
                <Card className="p-6 bg-card border-border">
                  <h3 className="text-foreground mb-4">Rating Distribution</h3>
                  <div className="space-y-3">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const count = albumReviews.filter(
                        (r) => Math.round(r.rating) === stars
                      ).length;
                      const pct =
                        albumReviews.length > 0
                          ? (count / albumReviews.length) * 100
                          : 0;
                      return (
                        <div key={stars} className="flex items-center gap-4">
                          <div className="flex items-center gap-1 w-16">
                            <Star className="w-4 h-4 text-primary fill-primary" />
                            <span className="text-foreground">{stars}</span>
                          </div>
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-muted-foreground text-sm w-12 text-right">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Copyright */}
            {album.copyrights.length > 0 && (
              <div className="pt-4 border-t border-border">
                {album.copyrights.map((c: any, i: number) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    {c.text}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}