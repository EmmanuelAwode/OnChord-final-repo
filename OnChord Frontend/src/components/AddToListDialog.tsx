import { useState, useEffect } from "react";
import { Plus, Check, Search, Loader2, Music } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { useLists, ListSong } from "../lib/ListsContext";
import { toast } from "sonner@2.0.3";
import { searchTracks } from "../lib/api/musicSearch";
import { spotifySearch, isSpotifyConnected } from "../lib/api/spotify";

interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumCover: string;
  duration?: number;
  previewUrl?: string;
  url?: string;
}

interface AddToListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  listId: string;
  listTitle: string;
}

// Format duration from milliseconds to mm:ss
function formatDuration(ms?: number): string {
  if (!ms) return "";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function AddToListDialog({ isOpen, onClose, listId, listTitle }: AddToListDialogProps) {
  const { addSongToList, isSongInList } = useLists();
  const [searchQuery, setSearchQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addedSongs, setAddedSongs] = useState<Set<string>>(new Set());

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setTracks([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchTracks(searchQuery, 20);
        setTracks(results.map(r => ({
          id: r.id,
          title: r.title,
          artist: r.artist,
          album: r.album,
          albumCover: r.albumCover,
          duration: r.duration,
          previewUrl: r.previewUrl,
          url: r.url,
        })));
      } catch (error) {
        // Silent error handling
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset added songs when dialog opens
  useEffect(() => {
    if (isOpen) {
      setAddedSongs(new Set());
    }
  }, [isOpen]);

  const handleAddSong = async (track: Track) => {
    if (isSongInList(listId, track.id) || addedSongs.has(track.id)) {
      return;
    }

    // Mark as added immediately for UI feedback
    setAddedSongs(prev => new Set([...prev, track.id]));

    // Try to get Spotify URL
    let spotifyUrl: string | undefined;
    try {
      const connected = await isSpotifyConnected();
      if (connected) {
        const searchResults = await spotifySearch(`${track.title} ${track.artist}`, "track", 1);
        if (searchResults?.tracks?.items?.[0]?.external_urls?.spotify) {
          spotifyUrl = searchResults.tracks.items[0].external_urls.spotify;
        }
      }
    } catch {
      // Silently continue without Spotify URL
    }

    const song: ListSong = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      cover: track.albumCover,
      duration: formatDuration(track.duration),
      album: track.album,
      previewUrl: track.previewUrl,
      appleMusicUrl: track.url,
      spotifyUrl,
    };
    
    try {
      await addSongToList(listId, song);
      toast.success(`Added "${track.title}" to ${listTitle}`);
    } catch (error) {
      console.error("Error adding song to list:", error);
      toast.error("Failed to add song");
      setAddedSongs(prev => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
    }
  };

  const handleClose = () => {
    setSearchQuery("");
    setTracks([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-gradient-to-br from-primary/10 to-secondary/10">
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/20">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg text-foreground">Add Songs to List</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {listTitle} - Click a song to add it
              </p>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Search and click songs to add them to {listTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for songs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Added Count */}
          {addedSongs.size > 0 && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <Check className="w-4 h-4 text-green-500" />
              <p className="text-sm text-foreground">
                {addedSongs.size} song{addedSongs.size !== 1 ? 's' : ''} added to list
              </p>
            </div>
          )}

          {/* Tracks List */}
          <ScrollArea className="h-[50vh]">
            {isSearching ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !searchQuery.trim() ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Music className="w-8 h-8 mb-2 opacity-50" />
                <p>Search for songs to add to your list</p>
              </div>
            ) : tracks.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <p>No songs found</p>
              </div>
            ) : (
              <div className="space-y-2 pr-4">
                {tracks.map((track) => {
                  const isInList = isSongInList(listId, track.id);
                  const justAdded = addedSongs.has(track.id);
                  const isDisabled = isInList || justAdded;

                  return (
                    <Card
                      key={track.id}
                      onClick={() => !isDisabled && handleAddSong(track)}
                      className={`p-3 cursor-pointer transition-all ${
                        isDisabled
                          ? "opacity-60 cursor-not-allowed bg-muted/50 border-green-500/30"
                          : "bg-card border-border hover:border-primary/50 hover:bg-primary/5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Track Cover */}
                        <div className="relative flex-shrink-0">
                          <img
                            src={track.albumCover}
                            alt={track.title}
                            className="w-12 h-12 rounded object-cover"
                          />
                          {isDisabled && (
                            <div className="absolute inset-0 bg-green-500/60 rounded flex items-center justify-center">
                              <Check className="w-5 h-5 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Track Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm text-foreground truncate">
                            {track.title}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate">
                            {track.artist} • {track.album}
                          </p>
                        </div>

                        {/* Duration & Status */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {track.duration && (
                            <span className="text-xs text-muted-foreground">
                              {formatDuration(track.duration)}
                            </span>
                          )}
                          {isDisabled ? (
                            <Badge className="bg-green-500/20 text-green-600 border-0 text-xs">
                              Added
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <Plus className="w-3 h-3 mr-1" />
                              Add
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
