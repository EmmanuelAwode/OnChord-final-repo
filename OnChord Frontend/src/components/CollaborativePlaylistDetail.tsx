import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { 
  ArrowLeft, 
  Users, 
  Music, 
  Play, 
  Plus, 
  Trash2, 
  Search,
  MoreVertical,
  Clock,
  User,
  Edit,
  Save,
  X,
  UserPlus,
  Loader2
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { searchAlbums } from "../lib/api/musicSearch";

interface Album {
  id: string;
  title: string;
  artist: string;
  cover: string;
  year?: string;
  genre?: string;
}

interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  cover?: string;
  addedBy: string;
  timestamp: string;
  duration?: string;
}

interface Contributor {
  id: string;
  name: string;
  avatar?: string;
}

interface CollaborativePlaylistDetailProps {
  playlist: {
    id: string;
    title: string;
    description: string;
    cover: string;
    trackCount: number;
    contributors: Contributor[];
    lastUpdated: string;
    moods: string[];
  };
  tracks: Track[];
  onBack: () => void;
  onAddTrack?: (track: Track) => void;
  onRemoveTrack?: (trackId: string) => void;
  onUpdatePlaylist?: (updates: Partial<CollaborativePlaylistDetailProps['playlist']>) => void;
}

export function CollaborativePlaylistDetail({
  playlist,
  tracks: initialTracks,
  onBack,
  onAddTrack,
  onRemoveTrack,
  onUpdatePlaylist,
}: CollaborativePlaylistDetailProps) {
  const [tracks, setTracks] = useState<Track[]>(initialTracks);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddTrack, setShowAddTrack] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Editable fields
  const [editedTitle, setEditedTitle] = useState(playlist.title);
  const [editedDescription, setEditedDescription] = useState(playlist.description);
  const [editedMoods, setEditedMoods] = useState<string[]>(playlist.moods);
  const [newMood, setNewMood] = useState("");
  const [editedContributors, setEditedContributors] = useState<Contributor[]>(playlist.contributors);
  const [showAddContributor, setShowAddContributor] = useState(false);
  const [searchAlbumResults, setSearchAlbumResults] = useState<Album[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced album search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchAlbumResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchAlbums(searchQuery, 10);
        setSearchAlbumResults(results.map(r => ({
          id: r.id,
          title: r.title,
          artist: r.artist,
          cover: r.cover,
          year: r.year,
          genre: r.genre,
        })));
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Available moods for suggestions
  const availableMoods = ["Classic", "Storytelling", "Lyrical", "Trap", "Chill", "Party", "Workout", "Study", "Vibes", "Hype", "Smooth", "Underground"];

  const handleRemoveTrack = (trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    setTracks(prev => prev.filter(t => t.id !== trackId));
    onRemoveTrack?.(trackId);
    toast.success(`Removed "${track?.title}" from playlist`);
  };

  const handleAddTrack = (album: Album) => {
    const newTrack: Track = {
      id: `track-${Date.now()}`,
      title: album.title,
      artist: album.artist,
      album: album.title,
      cover: album.cover,
      addedBy: "You",
      timestamp: "Just now",
      duration: "3:45", // Mock duration
    };

    setTracks(prev => [newTrack, ...prev]);
    onAddTrack?.(newTrack);
    toast.success(`Added "${album.title}" to playlist`);
    setShowAddTrack(false);
    setSearchQuery("");
  };

  const handleSaveDescription = () => {
    setIsEditMode(false);
    toast.success("Description updated");
    onUpdatePlaylist?.({ description: editedDescription });
  };

  const handleAddMood = () => {
    if (newMood && !editedMoods.includes(newMood)) {
      setEditedMoods(prev => [...prev, newMood]);
      setNewMood("");
    }
  };

  const handleRemoveMood = (mood: string) => {
    setEditedMoods(prev => prev.filter(m => m !== mood));
  };

  const handleAddContributor = (contributor: Contributor) => {
    if (!editedContributors.some(c => c.id === contributor.id)) {
      setEditedContributors(prev => [...prev, contributor]);
      setShowAddContributor(false);
    }
  };

  const handleRemoveContributor = (contributorId: string) => {
    setEditedContributors(prev => prev.filter(c => c.id !== contributorId));
  };

  const handleSaveAllChanges = () => {
    onUpdatePlaylist?.({
      title: editedTitle,
      description: editedDescription,
      moods: editedMoods,
      contributors: editedContributors,
    });
    toast.success("Playlist updated successfully!");
  };

  const handleCancelEdit = () => {
    setEditedTitle(playlist.title);
    setEditedDescription(playlist.description);
    setEditedMoods(playlist.moods);
    setEditedContributors(playlist.contributors);
  };

  // Placeholder contributors for adding - in a real app would fetch from following list
  const mockAvailableContributors: Contributor[] = [];

  // Use search results from debounced search
  const filteredAlbums = searchAlbumResults;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="border-border hover:border-primary hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Playlists
        </Button>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancelEdit}
            className="border-border hover:border-destructive hover:text-destructive"
          >
            <X className="w-4 h-4 mr-2" />
            Reset Changes
          </Button>
          <Button
            size="sm"
            onClick={handleSaveAllChanges}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Save className="w-4 h-4 mr-2" />
            Save All Changes
          </Button>
        </div>
      </div>

      {/* Manage Playlist Section */}
      <Card className="p-6 bg-card border-primary/30">
        <div className="flex items-center gap-2 mb-6">
          <Edit className="w-5 h-5 text-primary" />
          <h2 className="text-xl text-foreground">Manage Playlist</h2>
        </div>

        <div className="space-y-6">
          {/* Edit Title */}
          <div>
            <label className="text-sm text-foreground mb-2 block">Playlist Title</label>
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="bg-background border-border text-foreground"
              placeholder="Enter playlist title..."
            />
          </div>

          {/* Edit Description */}
          <div>
            <label className="text-sm text-foreground mb-2 block">Description</label>
            <Textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              className="bg-background border-border text-foreground min-h-[80px]"
              placeholder="Describe your playlist..."
            />
          </div>

          {/* Edit Moods/Tags */}
          <div>
            <label className="text-sm text-foreground mb-2 block">Moods & Tags</label>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {editedMoods.map((mood) => (
                  <Badge
                    key={mood}
                    variant="outline"
                    className="border-secondary/50 text-secondary pr-1 group hover:border-destructive/50 transition-colors"
                  >
                    {mood}
                    <button
                      onClick={() => handleRemoveMood(mood)}
                      className="ml-1.5 hover:text-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Input
                  value={newMood}
                  onChange={(e) => setNewMood(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddMood()}
                  placeholder="Add a mood or tag..."
                  className="flex-1 bg-background border-border text-foreground"
                />
                <Button
                  size="sm"
                  onClick={handleAddMood}
                  className="bg-secondary hover:bg-secondary/90 text-white"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground">Suggestions:</span>
                {availableMoods.filter(m => !editedMoods.includes(m)).slice(0, 6).map((mood) => (
                  <button
                    key={mood}
                    onClick={() => setEditedMoods(prev => [...prev, mood])}
                    className="text-xs px-2 py-1 rounded-md bg-muted/30 hover:bg-secondary/20 hover:text-secondary transition-colors text-muted-foreground"
                  >
                    + {mood}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Manage Contributors */}
          <div>
            <label className="text-sm text-foreground mb-2 block">Contributors</label>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {editedContributors.map((contributor) => (
                  <div
                    key={contributor.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border group hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {contributor.avatar ? (
                        <img
                          src={contributor.avatar}
                          alt={contributor.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-primary">
                            {contributor.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-foreground">{contributor.name}</p>
                        <p className="text-xs text-muted-foreground">Contributor</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveContributor(contributor.id)}
                      className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Add Contributor */}
              {showAddContributor ? (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/30">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm text-foreground">Add Contributor</h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowAddContributor(false)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {mockAvailableContributors.filter(c => !editedContributors.some(ec => ec.id === c.id)).map((contributor) => (
                      <button
                        key={contributor.id}
                        onClick={() => {
                          handleAddContributor(contributor);
                          toast.success(`Added ${contributor.name} as contributor`);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg bg-background hover:bg-muted/30 border border-border hover:border-primary/50 transition-colors"
                      >
                        {contributor.avatar ? (
                          <img
                            src={contributor.avatar}
                            alt={contributor.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-primary">
                              {contributor.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="text-left">
                          <p className="text-sm text-foreground">{contributor.name}</p>
                          <p className="text-xs text-muted-foreground">Click to add</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddContributor(true)}
                  className="w-full border-dashed border-primary/30 hover:border-primary hover:bg-primary/5"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Contributor
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Tracks Section */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-foreground flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" />
            Tracks ({tracks.length})
          </h3>
          <Button
            onClick={() => setShowAddTrack(!showAddTrack)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Track
          </Button>
        </div>

        {/* Add Track Section */}
        {showAddTrack && (
          <div className="mb-6 p-4 rounded-lg bg-muted/20 border border-primary/30">
            <h4 className="text-foreground mb-3">Add a track from albums</h4>
            
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search albums by title or artist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background border-border text-foreground"
              />
            </div>

            {/* Albums Grid */}
            <ScrollArea className="h-[300px] rounded-lg">
              {isSearching ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : !searchQuery.trim() ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <p>Search for albums to add</p>
                </div>
              ) : filteredAlbums.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <p>No albums found</p>
                </div>
              ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 pr-4">
                {filteredAlbums.map((album) => (
                  <button
                    key={album.id}
                    onClick={() => handleAddTrack(album)}
                    className="group relative rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                  >
                    <img
                      src={album.cover}
                      alt={album.title}
                      className="w-full aspect-square object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Plus className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="text-white text-xs line-clamp-1">{album.title}</p>
                      <p className="text-white/70 text-xs line-clamp-1">{album.artist}</p>
                    </div>
                  </button>
                ))}
              </div>
              )}
            </ScrollArea>
          </div>
        )}

        <Separator className="mb-4" />

        {/* Track List */}
        <div className="space-y-2">
          {tracks.length === 0 ? (
            <div className="text-center py-12">
              <Music className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground mb-1">No tracks yet</p>
              <p className="text-sm text-muted-foreground">
                Be the first to add a track to this playlist
              </p>
            </div>
          ) : (
            tracks.map((track, index) => (
              <div
                key={track.id}
                className="group flex items-center gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors"
              >
                {/* Track Number */}
                <div className="w-8 text-center">
                  <span className="text-muted-foreground text-sm group-hover:hidden">
                    {index + 1}
                  </span>
                  <Play className="w-4 h-4 text-primary hidden group-hover:block mx-auto" />
                </div>

                {/* Album Cover */}
                {track.cover && (
                  <img
                    src={track.cover}
                    alt={track.album || track.title}
                    className="w-12 h-12 rounded object-cover"
                  />
                )}

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-foreground truncate">{track.title}</p>
                  <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                </div>

                {/* Added By */}
                <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground min-w-[120px]">
                  <User className="w-3.5 h-3.5" />
                  <span className="truncate">{track.addedBy}</span>
                </div>

                {/* Timestamp */}
                <div className="hidden sm:block text-sm text-muted-foreground min-w-[80px]">
                  {track.timestamp}
                </div>

                {/* Duration */}
                {track.duration && (
                  <div className="text-sm text-muted-foreground min-w-[50px] text-right">
                    {track.duration}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveTrack(track.id)}
                    className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}