import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { X, Search, Plus, Globe, Lock, Users, Music, Loader2 } from "lucide-react";
import { searchTracks, type Track } from "../lib/api/musicSearch";
import { toast } from "sonner@2.0.3";

interface CreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateList: (list: {
    title: string;
    description: string;
    visibility: "public" | "private" | "friends";
    albumIds: string[];
    songIds: string[];
  }) => void;
}

export function CreateListModal({ isOpen, onClose, onCreateList }: CreateListModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private" | "friends">("public");
  const [selectedSongs, setSelectedSongs] = useState<Track[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [trackResults, setTrackResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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
    setSelectedSongs(prev => 
      prev.some(s => s.id === song.id)
        ? prev.filter(s => s.id !== song.id)
        : [...prev, song]
    );
  };

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error("Please enter a list title");
      return;
    }

    if (selectedSongs.length === 0) {
      toast.error("Please add at least one song to your list");
      return;
    }

    onCreateList({
      title: title.trim(),
      description: description.trim(),
      visibility,
      albumIds: [],
      songIds: selectedSongs.map(s => s.id),
    });

    // Reset form
    setTitle("");
    setDescription("");
    setVisibility("public");
    setSelectedSongs([]);
    setSearchQuery("");
    
    toast.success("List created successfully!");
    onClose();
  };

  const handleClose = () => {
    // Reset form when closing
    setTitle("");
    setDescription("");
    setVisibility("public");
    setSelectedSongs([]);
    setSearchQuery("");
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
          <DialogTitle>Create New List</DialogTitle>
          <DialogDescription>
            Name your list, add songs, and choose who can see it
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
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-background border-border text-foreground"
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {title.length}/60 characters
              </p>
            </div>

            <div>
              <Label htmlFor="list-description" className="text-foreground mb-2 block">
                Description (Optional)
              </Label>
              <Textarea
                id="list-description"
                placeholder="Describe what this list is about..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-background border-border text-foreground resize-none min-h-[80px]"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {description.length}/200 characters
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
                <p className="text-sm text-muted-foreground mb-2">Selected Songs:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedSongs.map(song => (
                    <Badge
                      key={song.id}
                      className="bg-primary/20 text-primary border-0 pr-1 gap-1"
                    >
                      <span className="truncate max-w-[150px]">{song.title}</span>
                      <button
                        onClick={() => toggleSong(song)}
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
        <div className="p-6 border-t border-border flex items-center justify-end gap-4 bg-card flex-shrink-0">
          <Button
            variant="outline"
            onClick={handleClose}
            className="px-8 py-3 border-white/30 bg-white/10 hover:bg-white/20 text-white rounded-lg"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            className="px-8 py-3 bg-primary hover:bg-primary/90 text-white font-medium shadow-lg rounded-lg"
          >
            Create List
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
