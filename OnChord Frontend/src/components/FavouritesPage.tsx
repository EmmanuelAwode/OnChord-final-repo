import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { handleImageError } from "./ui/utils";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Heart, Music, Disc3, Play, Trash2, Calendar, ArrowUpDown } from "lucide-react";
import { useFavourites } from "../lib/useFavourites";
import { EmptyState } from "./EmptyState";
import { toast } from "sonner@2.0.3";

interface FavouritesPageProps {
  onOpenAlbum?: (albumId?: string) => void;
}

export function FavouritesPage({ onOpenAlbum }: FavouritesPageProps) {
  const { favourites, removeSong, removeAlbum } = useFavourites();
  const [songSort, setSongSort] = useState<"date" | "name">("date");
  const [albumSort, setAlbumSort] = useState<"date" | "name">("date");

  // Sort songs
  const sortedSongs = [...favourites.songs].sort((a, b) => {
    if (songSort === "date") {
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    } else {
      return a.title.localeCompare(b.title);
    }
  });

  // Sort albums
  const sortedAlbums = [...favourites.albums].sort((a, b) => {
    if (albumSort === "date") {
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    } else {
      return a.title.localeCompare(b.title);
    }
  });

  const handleRemoveSong = (songId: string, songTitle: string) => {
    removeSong(songId);
    toast.success(`Removed "${songTitle}" from favourites`);
  };

  const handleRemoveAlbum = (albumId: string, albumTitle: string) => {
    removeAlbum(albumId);
    toast.success(`Removed "${albumTitle}" from favourites`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-accent/20 to-primary/20 p-3 rounded-lg">
          <Heart className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h1 className="mb-1">Favourites</h1>
          <p className="text-muted-foreground text-sm">
            Your most loved songs and albums
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
          <div className="flex items-center gap-3">
            <Music className="w-5 h-5 text-primary" />
            <div>
              <p className="text-2xl text-foreground">{favourites.songs.length}</p>
              <p className="text-xs text-muted-foreground">Favourite Songs</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/30">
          <div className="flex items-center gap-3">
            <Disc3 className="w-5 h-5 text-secondary" />
            <div>
              <p className="text-2xl text-foreground">{favourites.albums.length}</p>
              <p className="text-xs text-muted-foreground">Favourite Albums</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="songs" className="w-full">
        <TabsList className="bg-card border border-border w-full grid grid-cols-2 h-auto p-1">
          <TabsTrigger
            value="songs"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2 py-2"
          >
            <Music className="w-4 h-4" />
            Songs ({favourites.songs.length})
          </TabsTrigger>
          <TabsTrigger
            value="albums"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2 py-2"
          >
            <Disc3 className="w-4 h-4" />
            Albums ({favourites.albums.length})
          </TabsTrigger>
        </TabsList>

        {/* Songs Tab */}
        <TabsContent value="songs" className="space-y-4 mt-6">
          {/* Sort Control */}
          {favourites.songs.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {sortedSongs.length} {sortedSongs.length === 1 ? "song" : "songs"}
              </p>
              <Select value={songSort} onValueChange={(value: any) => setSongSort(value)}>
                <SelectTrigger className="w-[160px] bg-card border-border">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Most Recent</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {sortedSongs.length > 0 ? (
            <div className="space-y-3">
              {sortedSongs.map((song) => (
                <Card
                  key={song.id}
                  className="p-4 bg-card border-border hover:border-primary/50 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    {/* Album Cover */}
                    <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform">
                      <img
                        src={song.albumCover}
                        alt={song.title}
                        className="w-full h-full object-cover"
                        onError={handleImageError}
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-6 h-6 text-white" />
                      </div>
                    </div>

                    {/* Song Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-foreground truncate">{song.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(song.addedAt)}
                        </Badge>
                        {song.duration && (
                          <span className="text-xs text-muted-foreground">{song.duration}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0 opacity-0 group-hover:opacity-100 hover:bg-primary/10 hover:text-primary transition-all"
                        onClick={() => onOpenAlbum?.(song.albumId)}
                      >
                        <Disc3 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                        onClick={() => handleRemoveSong(song.id, song.title)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Music}
              title="No Favourite Songs"
              description="Songs you mark as favourites will appear here. Start building your collection!"
            />
          )}
        </TabsContent>

        {/* Albums Tab */}
        <TabsContent value="albums" className="space-y-4 mt-6">
          {/* Sort Control */}
          {favourites.albums.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {sortedAlbums.length} {sortedAlbums.length === 1 ? "album" : "albums"}
              </p>
              <Select value={albumSort} onValueChange={(value: any) => setAlbumSort(value)}>
                <SelectTrigger className="w-[160px] bg-card border-border">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Most Recent</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {sortedAlbums.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedAlbums.map((album) => (
                <Card
                  key={album.id}
                  className="overflow-hidden bg-card border-border hover:border-primary transition-all group cursor-pointer"
                  onClick={() => onOpenAlbum?.(album.id)}
                >
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={album.cover}
                      alt={album.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={handleImageError}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Button
                      size="icon"
                      className="absolute top-2 right-2 bg-destructive/90 hover:bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveAlbum(album.id, album.title);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-xs border-primary/50">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(album.addedAt)}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-foreground truncate mb-1">{album.title}</h3>
                    <p className="text-sm text-muted-foreground truncate mb-2">{album.artist}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {album.trackCount && <span>{album.trackCount} tracks</span>}
                      {album.releaseDate && album.trackCount && <span>•</span>}
                      {album.releaseDate && <span>{album.releaseDate}</span>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Disc3}
              title="No Favourite Albums"
              description="Albums you mark as favourites will appear here. Discover and save your favorites!"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
