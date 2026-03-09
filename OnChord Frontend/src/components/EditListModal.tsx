import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { X, Search, Plus, Globe, Lock, Users, Music, Loader2, Trash2 } from "lucide-react";
import { searchTracks, type Track } from "../lib/api/musicSearch";
import { type ListSong } from "../lib/ListsContext";
import { toast } from "sonner@2.0.3";

interface EditListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateList: (list: {
    title: string;
    description: string;
    visibility: "public" | "private" | "friends";
    albums: any[];
    songs: ListSong[];
  }) => void;
  onDeleteList?: () => void;
  listId: string;
  initialTitle: string;
  initialDescription: string;
  initialVisibility: "public" | "private" | "friends";
  initialSongs?: ListSong[];
}

export function EditListModal({ 
  isOpen, 
  onClose, 
  onUpdateList,
  onDeleteList,
  listId,
  initialTitle,
  initialDescription,
  initialVisibility,
  initialSongs = []
}: EditListModalProps) {
  const [title, setTitle] = useState(initialTitle || "");
  const [description, setDescription] = useState(initialDescription || "");
  const [visibility, setVisibility] = useState<"public" | "private" | "friends">(initialVisibility || "public");
  const [selectedSongs, setSelectedSongs] = useState<ListSong[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [trackResults, setTrackResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset form when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle || "");
      setDescription(initialDescription || "");
      setVisibility(initialVisibility || "public");
      // Load existing songs from the list
      setSelectedSongs(initialSongs || []);
      setSearchQuery("");
      setTrackResults([]);
    }
  }, [isOpen, initialTitle, initialDescription, initialVisibility, initialSongs]);

  // Search API when query changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setTrackResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const results = await searchTracks(searchQuery, 20);
        setTrackResults(results);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const toggleSong = (song: Track) => {
    // Check if already in list
    if (selectedSongs.some(s => s.id === song.id)) {
      setSelectedSongs(prev => prev.filter(s => s.id !== song.id));
    } else {
      // Convert Track to ListSong format
      const listSong: ListSong = {
        id: song.id,
        title: song.title,
        artist: song.artist,
        cover: song.albumCover,
        duration: song.duration ? `${Math.floor(song.duration / 60000)}:${String(Math.floor((song.duration % 60000) / 1000)).padStart(2, '0')}` : undefined,
        album: song.album,
        previewUrl: song.previewUrl,
        appleMusicUrl: song.url,
      };
      setSelectedSongs(prev => [...prev, listSong]);
    }
  };

  const removeSong = (songId: string) => {
    setSelectedSongs(prev => prev.filter(s => s.id !== songId));
  };

  const handleUpdate = () => {
    if (!title.trim()) {
      toast.error("Please enter a list title");
      return;
    }

    onUpdateList({
      title: title.trim(),
      description: description.trim(),
      visibility,
      albums: [],
      songs: selectedSongs,
    });

    toast.success("List updated successfully!");
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  const visibilityOptions = [
    {
      value: "public" as const,
      label: "Public",
      icon: Globe,
      description: "Anyone can see this list",
    },
    {
      value: "private" as const,
      label: "Private",
      icon: Lock,
      description: "Only you can see this list",
    },
    {
      value: "friends" as const,
      label: "Friends Only",
      icon: Users,
      description: "Only your friends can see this list",
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b border-border flex-shrink-0">
          <DialogTitle>Edit List</DialogTitle>
          <DialogDescription>
            Update your list details, content, and visibility settings
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* List Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="list-title" className="text-foreground mb-2 block">
                List Title *
              </Label>
              <Input
                id="list-title"
                placeholder="e.g., Summer Vibes 2024"
                value={title || ""}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-background border-border text-foreground"
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {(title || "").length}/60 characters
              </p>
            </div>

            <div>
              <Label htmlFor="list-description" className="text-foreground mb-2 block">
                Description (Optional)
              </Label>
              <Textarea
                id="list-description"
                placeholder="Describe what this list is about..."
                value={description || ""}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-background border-border text-foreground resize-none min-h-[80px]"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {(description || "").length}/200 characters
              </p>
            </div>
          </div>

          {/* Visibility */}
          <div>
            <Label className="text-foreground mb-3 block">Visibility</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {visibilityOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = visibility === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setVisibility(option.value)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`${isSelected ? "text-foreground" : "text-foreground"}`}>
                        {option.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add Content */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-foreground">Songs *</Label>
              <Badge variant="outline" className="border-primary text-primary">
                {selectedSongs.length} songs
              </Badge>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search songs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 bg-background border-border text-foreground"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Selected Songs Preview */}
            {selectedSongs.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-2">Current Songs ({selectedSongs.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {selectedSongs.map(song => (
                    <Badge
                      key={song.id}
                      className="bg-primary/20 text-primary border-0 pr-1 gap-1"
                    >
                      <span className="truncate max-w-[150px]">{song.title}</span>
                      <button
                        onClick={() => removeSong(song.id)}
                        className="hover:bg-primary/30 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Song List */}
            <ScrollArea className="h-[400px] rounded-lg border border-border bg-muted/20 p-4">
              {isSearching ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                  <p className="text-muted-foreground">Searching...</p>
                </div>
              ) : trackResults.length > 0 ? (
                <div className="space-y-2">
                  {trackResults.map((song) => {
                    const isSelected = selectedSongs.some(s => s.id === song.id);
                    return (
                      <button
                        key={song.id}
                        onClick={() => toggleSong(song)}
                        className={`w-full p-3 rounded-lg transition-all text-left flex items-center gap-3 ${
                          isSelected
                            ? "bg-primary/20 border-2 border-primary"
                            : "bg-card border-2 border-border hover:border-primary/50"
                        }`}
                      >
                        <img
                          src={song.albumCover}
                          alt={song.title}
                          className="w-12 h-12 rounded object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground truncate text-sm">{song.title}</p>
                          <p className="text-muted-foreground truncate text-xs">{song.artist}</p>
                        </div>
                        <div className="text-xs text-muted-foreground flex-shrink-0">
                          {song.duration ? `${Math.floor(song.duration / 60000)}:${String(Math.floor((song.duration % 60000) / 1000)).padStart(2, '0')}` : ''}
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <Plus className="w-4 h-4 text-white rotate-45" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-center">
                  <Music className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="text-foreground mb-1">{searchQuery.length < 2 ? "Search for songs" : "No songs found"}</p>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery.length < 2 ? "Type at least 2 characters to search" : "Try a different search term"}
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex items-center justify-between gap-4 bg-card flex-shrink-0">
          <div>
            {onDeleteList && (
              showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-400">Delete this list?</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="border-white/30 bg-white/10 hover:bg-white/20 text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      onDeleteList();
                      toast.success("List deleted");
                      onClose();
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Delete
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete List
                </Button>
              )
            )}
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleClose}
              className="px-8 py-3 border-white/30 bg-white/10 hover:bg-white/20 text-white rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              className="px-8 py-3 bg-primary hover:bg-primary/90 text-white font-medium shadow-lg rounded-lg"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
