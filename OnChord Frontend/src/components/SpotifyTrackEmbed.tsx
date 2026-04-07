import { useState, useEffect } from "react";
import { Music, Play, ExternalLink, Loader2 } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { usePreview } from "./SongPreviewPlayer";
import { getSpotifyTrack } from "../lib/api/spotify";

interface SpotifyTrackEmbedProps {
  url: string;
  trackId?: string;
  onOpenTrack?: (trackId: string) => void;
  showPreviewButton?: boolean;
}

interface TrackData {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    images: Array<{ url: string; height: number; width: number }>;
    name: string;
  };
  external_urls: { spotify: string };
  preview_url?: string;
  duration_ms: number;
  popularity: number;
}

export function SpotifyTrackEmbed({
  url,
  trackId: propTrackId,
  onOpenTrack,
  showPreviewButton = true,
}: SpotifyTrackEmbedProps) {
  const [trackData, setTrackData] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { playPreview, currentPreview, isPlaying } = usePreview();

  // Extract track ID from Spotify URL
  const extractTrackId = (spotifyUrl: string): string | null => {
    const patterns = [
      /spotify\.com\/track\/([a-zA-Z0-9]+)/,
      /spotify:track:([a-zA-Z0-9]+)/,
    ];

    for (const pattern of patterns) {
      const match = spotifyUrl.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const trackId = propTrackId || extractTrackId(url);

  useEffect(() => {
    const fetchTrackData = async () => {
      if (!trackId) {
        setError("Invalid Spotify track URL");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getSpotifyTrack(trackId);
        setTrackData(data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch Spotify track:", err);
        setError("Unable to load track");
      } finally {
        setLoading(false);
      }
    };

    fetchTrackData();
  }, [trackId]);

  if (loading) {
    return (
      <div className="w-full max-w-xs rounded-lg border border-border bg-card p-4 flex items-center justify-center gap-3">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading track...</span>
      </div>
    );
  }

  if (error || !trackData) {
    return (
      <div className="w-full max-w-xs rounded-lg border border-border/50 bg-card p-4">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{error || "Track not found"}</span>
        </div>
      </div>
    );
  }

  const artistNames = trackData.artists.map((a) => a.name).join(", ");
  const albumCover =
    trackData.album.images?.[0]?.url ||
    trackData.album.images?.[1]?.url ||
    "";
  const isCurrentTrackPlaying =
    currentPreview === trackData.preview_url && isPlaying;
  const hasPreview = !!trackData.preview_url && showPreviewButton;

  return (
    <Card className="w-full max-w-xs overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-card via-card to-card/80 shadow-lg hover:shadow-2xl hover:border-primary/40 transition-all duration-300">
      {/* Album Cover */}
      <div className="relative group overflow-hidden bg-black/20">
        <img
          src={albumCover}
          alt={trackData.album.name}
          className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Overlay on hover */}
        {hasPreview && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <Button
              size="sm"
              onClick={() =>
                playPreview(
                  trackData.preview_url!,
                  trackData.name,
                  artistNames
                )
              }
              className={`gap-1 ${
                isCurrentTrackPlaying
                  ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              <span className="text-xs font-medium">
                {isCurrentTrackPlaying ? "Playing" : "Preview"}
              </span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              asChild
              className="text-white hover:bg-white/20"
            >
              <a
                href={trackData.external_urls.spotify}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </Button>
          </div>
        )}

        {/* Spotify badge */}
        <div className="absolute top-2 right-2">
          <Badge className="bg-[#1DB954]/90 text-white border-0 gap-1 px-2 py-1">
            <svg
              className="w-3 h-3"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
            Spotify
          </Badge>
        </div>
      </div>

      {/* Track Info */}
      <div className="p-3 md:p-4">
        {/* Title */}
        <h3 className="text-sm md:text-base font-bold text-foreground truncate mb-1 group hover:text-primary transition-colors">
          {trackData.name}
        </h3>

        {/* Artist */}
        <p className="text-xs md:text-sm text-muted-foreground truncate mb-3">
          {artistNames}
        </p>

        {/* Album & Duration */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <span className="truncate flex-1">{trackData.album.name}</span>
          <span className="flex-shrink-0">
            {Math.floor(trackData.duration_ms / 60000)}:
            {String(Math.floor((trackData.duration_ms % 60000) / 1000)).padStart(
              2,
              "0"
            )}
          </span>
        </div>

        {/* Popularity bar */}
        <div className="mb-3">
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#1DB954] to-[#1ed760] transition-all"
              style={{ width: `${trackData.popularity}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Popularity: {trackData.popularity}%
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {hasPreview && (
            <Button
              variant={isCurrentTrackPlaying ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() =>
                playPreview(
                  trackData.preview_url!,
                  trackData.name,
                  artistNames
                )
              }
            >
              <Play className="w-3 h-3 mr-1 fill-current" />
              <span className="text-xs">
                {isCurrentTrackPlaying ? "Playing" : "Preview"}
              </span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            asChild
          >
            <a
              href={trackData.external_urls.spotify}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="text-xs">Open</span>
            </a>
          </Button>
          {onOpenTrack && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onOpenTrack(trackData.id)}
            >
              <Music className="w-3 h-3 mr-1" />
              <span className="text-xs">Review</span>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * Detect Spotify track URLs in text
 */
export function parseSpotifyTrackUrls(text: string): Array<{ url: string; start: number; end: number }> {
  const spotifyTrackRegex =
    /(?:https?:\/\/)?(?:open\.)?spotify\.com\/track\/[a-zA-Z0-9]+(?:\?.*)?/g;
  const matches = [];
  let match;

  while ((match = spotifyTrackRegex.exec(text)) !== null) {
    matches.push({
      url: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return matches;
}

/**
 * Component to render message content with automatic Spotify embeds
 */
interface MessageContentWithEmbedsProps {
  content: string;
  onOpenTrack?: (trackId: string) => void;
  showPreviewButton?: boolean;
}

export function MessageContentWithEmbeds({
  content,
  onOpenTrack,
  showPreviewButton = true,
}: MessageContentWithEmbedsProps) {
  const spotifyUrls = parseSpotifyTrackUrls(content);

  if (spotifyUrls.length === 0) {
    return <p className="text-sm md:text-base break-words">{content}</p>;
  }

  return (
    <div className="space-y-2">
      {spotifyUrls.length > 0 && (
        <div className="space-y-2">
          {spotifyUrls.map((item, idx) => (
            <SpotifyTrackEmbed
              key={`${item.url}-${idx}`}
              url={item.url}
              onOpenTrack={onOpenTrack}
              showPreviewButton={showPreviewButton}
            />
          ))}
        </div>
      )}
      {content && (
        <p className="text-sm md:text-base break-words">{content}</p>
      )}
    </div>
  );
}
