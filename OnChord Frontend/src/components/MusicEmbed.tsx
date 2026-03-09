import { useState } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Music, Play, ExternalLink } from "lucide-react";

interface MusicEmbedProps {
  type: "spotify" | "apple";
  url: string;
  title?: string;
  artist?: string;
  embedType?: "track" | "album" | "playlist";
}

export function MusicEmbed({ type, url, title, artist, embedType = "track" }: MusicEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  // Extract Spotify ID from URL
  const getSpotifyEmbedUrl = (url: string) => {
    const match = url.match(/\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
    if (match) {
      return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`;
    }
    return url;
  };

  // Convert Apple Music URL to embeddable URL
  const getAppleMusicEmbedUrl = (url: string) => {
    // Replace music.apple.com with embed.music.apple.com
    if (url.includes('music.apple.com')) {
      return url.replace('music.apple.com', 'embed.music.apple.com');
    }
    return null;
  };

  // Check if URL is an embeddable Apple Music URL (direct link, not search)
  const isEmbeddableAppleMusicUrl = (url: string) => {
    return url.includes('music.apple.com') && !url.includes('/search');
  };

  // Apple Music embed
  const renderAppleMusicEmbed = () => {
    if (isEmbeddableAppleMusicUrl(url)) {
      const embedUrl = getAppleMusicEmbedUrl(url);
      if (embedUrl) {
        return (
          <Card className="overflow-hidden bg-card border-border shadow-lg hover:shadow-xl transition-shadow">
            <div className="p-4 bg-gradient-to-r from-[#FA233B]/10 to-[#d91e31]/5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-[#FA233B] to-[#d91e31] rounded-lg flex items-center justify-center">
                  <Music className="w-4 h-4 text-white" />
                </div>
                <Badge className="bg-[#FA233B]/20 text-[#FA233B] border-0 text-xs">
                  Apple Music
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(url, '_blank')}
                className="hover:bg-background"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
            <div className="relative bg-background">
              {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
                  <Music className="w-8 h-8 text-muted-foreground animate-pulse" />
                </div>
              )}
              <iframe
                src={embedUrl}
                width="100%"
                height="175"
                frameBorder="0"
                allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
                sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
                loading="lazy"
                onLoad={() => setIsLoaded(true)}
                className="rounded-b-lg"
                style={{
                  borderRadius: '0 0 calc(var(--radius) - 2px) calc(var(--radius) - 2px)',
                }}
              />
            </div>
          </Card>
        );
      }
    }

    // Fallback: card-style display
    return (
      <Card className="p-6 bg-gradient-to-br from-[#FA233B]/10 to-[#d91e31]/5 border-[#FA233B]/20 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#FA233B] to-[#d91e31] rounded-xl flex items-center justify-center shadow-md">
            <Music className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            {title && <p className="font-medium text-foreground">{title}</p>}
            {artist && <p className="text-sm text-muted-foreground">{artist}</p>}
            <Badge className="mt-2 bg-[#FA233B]/20 text-[#FA233B] border-0 text-xs">
              Apple Music
            </Badge>
          </div>
          <Button
            size="sm"
            className="bg-[#FA233B] hover:bg-[#d91e31] text-white"
            onClick={() => window.open(url, '_blank')}
          >
            <Play className="w-4 h-4 mr-2" />
            Open
          </Button>
        </div>
      </Card>
    );
  };

  // Check if URL is a valid Spotify embed URL (has track/album/playlist ID)
  const isEmbeddableSpotifyUrl = (url: string) => {
    return /\/(track|album|playlist)\/([a-zA-Z0-9]+)/.test(url);
  };

  // Spotify embed
  const renderSpotifyEmbed = () => {
    // If we have a real Spotify track/album/playlist URL, use iframe embed
    if (isEmbeddableSpotifyUrl(url)) {
      const embedUrl = getSpotifyEmbedUrl(url);
      return (
        <Card className="overflow-hidden bg-card border-border shadow-lg hover:shadow-xl transition-shadow">
          <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[#1DB954] to-[#1aa34a] rounded-lg flex items-center justify-center">
                <Music className="w-4 h-4 text-white" />
              </div>
              <Badge className="bg-[#1DB954]/20 text-[#1DB954] border-0 text-xs">
                Spotify {embedType}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(url, '_blank')}
              className="hover:bg-background"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative bg-background">
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
                <Music className="w-8 h-8 text-muted-foreground animate-pulse" />
              </div>
            )}
            <iframe
              src={embedUrl}
              width="100%"
              height={embedType === "track" ? "152" : "352"}
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              onLoad={() => setIsLoaded(true)}
              className="rounded-b-lg"
              style={{
                borderRadius: '0 0 calc(var(--radius) - 2px) calc(var(--radius) - 2px)',
              }}
            />
          </div>
        </Card>
      );
    }

    // Fallback: card-style display (for search URLs or when no track ID is available)
    return (
      <Card className="p-6 bg-gradient-to-br from-[#1DB954]/10 to-[#1aa34a]/5 border-[#1DB954]/20 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#1DB954] to-[#1aa34a] rounded-xl flex items-center justify-center shadow-md">
            <Music className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            {title && <p className="font-medium text-foreground">{title}</p>}
            {artist && <p className="text-sm text-muted-foreground">{artist}</p>}
            <Badge className="mt-2 bg-[#1DB954]/20 text-[#1DB954] border-0 text-xs">
              Spotify
            </Badge>
          </div>
          <Button
            size="sm"
            className="bg-[#1DB954] hover:bg-[#1aa34a] text-white"
            onClick={() => window.open(url, '_blank')}
          >
            <Play className="w-4 h-4 mr-2" />
            Open
          </Button>
        </div>
      </Card>
    );
  };

  return type === "apple" ? renderAppleMusicEmbed() : renderSpotifyEmbed();
}
