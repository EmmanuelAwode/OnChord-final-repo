import { useState } from "react";
import { ArrowLeft, Plus, Trash2, Music, Clock, Play } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { useLists } from "../lib/ListsContext";
import { AddToListDialog } from "./AddToListDialog";
import { toast } from "sonner@2.0.3";
import { BackButton } from "./BackButton";

interface CollectionDetailPageProps {
  listId: string;
  onNavigate?: (page: string) => void;
  onOpenAlbum?: (albumData?: any) => void;
  onBack?: () => void;
  canGoBack?: boolean;
}

export function CollectionDetailPage({ listId, onNavigate, onOpenAlbum, onBack, canGoBack }: CollectionDetailPageProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { removeSongFromList, userListsMetadata } = useLists();
  
  // Get the list from user lists
  const list = userListsMetadata[listId];
  
  if (!list) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">List not found</p>
      </div>
    );
  }

  // Get songs from the list
  const allListSongs = list.songs || [];
  const totalSongCount = allListSongs.length;

  const handleRemoveSong = async (songId: string, songTitle: string) => {
    try {
      await removeSongFromList(listId, songId);
      toast.success(`Removed "${songTitle}" from ${list.title}`);
    } catch (error) {
      console.error("Error removing song:", error);
      toast.error("Failed to remove song");
    }
  };

  const handleOpenSong = (song: any) => {
    // Pass song data to open the album modal with song details
    onOpenAlbum?.({
      id: song.id,
      title: song.title,
      artist: song.artist,
      cover: song.cover,
      album: song.album,
      previewUrl: song.previewUrl,
      appleMusicUrl: song.appleMusicUrl,
      spotifyUrl: song.spotifyUrl,
      type: "song",
    });
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-4">
          <BackButton onClick={onBack || (() => onNavigate?.("your-space-lists"))} label={canGoBack ? "Back" : "Back to My Lists"} />
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl text-foreground">{list.title}</h1>
            {list.description && (
              <p className="text-sm text-muted-foreground mt-1">{list.description}</p>
            )}
          </div>
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Songs
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card key="songs-stat" className="p-4 bg-card border-border text-center">
            <p className="text-2xl text-primary mb-1">{totalSongCount}</p>
            <p className="text-sm text-muted-foreground">Songs</p>
          </Card>
          <Card key="artists-stat" className="p-4 bg-card border-border text-center">
            <p className="text-2xl text-accent mb-1">
              {new Set(allListSongs.map(s => s.artist)).size}
            </p>
            <p className="text-sm text-muted-foreground">Artists</p>
          </Card>
        </div>
      </div>

      {/* Songs List */}
      {allListSongs.length > 0 ? (
        <Card className="bg-card border-border divide-y divide-border overflow-hidden">
          {allListSongs.map((song, index) => (
            <div
              key={song.id}
              onClick={() => handleOpenSong(song)}
              className="group p-4 hover:bg-muted/20 transition-colors flex items-center gap-4 cursor-pointer"
            >
              {/* Index */}
              <div className="w-6 text-center text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0">
                <span className="group-hover:hidden">{index + 1}</span>
                <Play className="w-4 h-4 hidden group-hover:block mx-auto" />
              </div>

              {/* Song Cover */}
              <img
                src={song.cover}
                alt={song.title}
                className="w-12 h-12 rounded object-cover shadow-sm flex-shrink-0"
              />

              {/* Song Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-foreground group-hover:text-primary transition-colors truncate">
                  {song.title}
                </h4>
                <p className="text-sm text-muted-foreground truncate">
                  {song.artist}
                </p>
              </div>

              {/* Album Name */}
              <div className="hidden md:block flex-1 min-w-0">
                <p className="text-sm text-muted-foreground truncate">
                  {song.album}
                </p>
              </div>

              {/* Duration */}
              {song.duration && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                  {song.duration}
                </div>
              )}

              {/* Remove Button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveSong(song.id, song.title);
                }}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </Card>
      ) : (
        <Card className="p-12 bg-card border-border text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Music className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg text-foreground mb-2">No Songs Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start building your list by adding songs
              </p>
              <Button
                onClick={() => setAddDialogOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Song
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Add to List Dialog */}
      <AddToListDialog
        isOpen={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        listId={listId}
        listTitle={list.title}
      />
    </div>
  );
}
