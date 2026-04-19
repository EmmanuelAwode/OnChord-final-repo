import { useState, useEffect, useRef, type ChangeEvent } from "react";
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
  Loader2,
  Camera
} from "lucide-react";
import { toast } from "sonner";
import { searchAlbums } from "../lib/api/musicSearch";
import { useProfile } from "../lib/useProfile";
import { supabase } from "../lib/supabaseClient";
import { getMutualFollows } from "../lib/api/follows";
import { getProfiles } from "../lib/api/profiles";

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
    creatorId?: string;
    creatorName?: string;
    trackCount: number;
    contributors: Contributor[];
    lastUpdated: string;
    moods: string[];
  };
  tracks: Track[];
  onBack: () => void;
  initialMode?: "view" | "edit";
  onOpenTrack?: (trackData: any) => void;
  onAddTrack?: (track: Track) => void;
  onRemoveTrack?: (trackId: string) => void;
  onUpdatePlaylist?: (updates: Partial<CollaborativePlaylistDetailProps['playlist']>) => Promise<boolean> | boolean;
}

export function CollaborativePlaylistDetail({
  playlist,
  tracks: initialTracks,
  onBack,
  initialMode = "view",
  onOpenTrack,
  onAddTrack,
  onRemoveTrack,
  onUpdatePlaylist,
}: CollaborativePlaylistDetailProps) {
  // Normalize playlist data so missing legacy fields do not break the detail view.
  const safePlaylist = {
    id: playlist?.id || "",
    title: playlist?.title || "Collaborative Playlist",
    description: playlist?.description || "A collaborative playlist",
    cover: playlist?.cover || `https://api.dicebear.com/7.x/shapes/svg?seed=${String(playlist?.id || Date.now())}`,
    trackCount: Number(playlist?.trackCount || 0),
    contributors: Array.isArray(playlist?.contributors) ? playlist.contributors : [],
    lastUpdated: playlist?.lastUpdated || "Just now",
    moods: Array.isArray(playlist?.moods) ? playlist.moods : [],
  };

  const [tracks, setTracks] = useState<Track[]>(initialTracks || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddTrack, setShowAddTrack] = useState(false);
  // `initialMode` lets the parent open this screen directly in view or edit mode.
  const [isEditMode, setIsEditMode] = useState(initialMode === "edit");
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { profile } = useProfile();
  const currentUserId = profile?.id || "";
  const creatorId = String(playlist?.creatorId || "");
  const isCreator = !!currentUserId && !!creatorId && currentUserId === creatorId;
  
  // Editable fields
  const [editedTitle, setEditedTitle] = useState(safePlaylist.title);
  const [editedDescription, setEditedDescription] = useState(safePlaylist.description);
  const [editedMoods, setEditedMoods] = useState<string[]>(safePlaylist.moods);
  const [newMood, setNewMood] = useState("");
  const [editedContributors, setEditedContributors] = useState<Contributor[]>(safePlaylist.contributors);
  const [showAddContributor, setShowAddContributor] = useState(false);
  const [availableContributors, setAvailableContributors] = useState<Contributor[]>([]);
  const [isLoadingContributors, setIsLoadingContributors] = useState(false);
  const [searchAlbumResults, setSearchAlbumResults] = useState<Album[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const contributorsEqual = (a: Contributor[], b: Contributor[]) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (a[i]?.id !== b[i]?.id || a[i]?.name !== b[i]?.name || (a[i]?.avatar || "") !== (b[i]?.avatar || "")) {
        return false;
      }
    }
    return true;
  };

  const moodsEqual = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  };

  useEffect(() => {
    setTracks(initialTracks || []);
  }, [initialTracks]);

  useEffect(() => {
    if (isEditMode) {
      return;
    }

    setEditedTitle((prev) => (prev === safePlaylist.title ? prev : safePlaylist.title));
    setEditedDescription((prev) => (prev === safePlaylist.description ? prev : safePlaylist.description));
    setEditedMoods((prev) => (moodsEqual(prev, safePlaylist.moods) ? prev : safePlaylist.moods));
    setEditedContributors((prev) => (contributorsEqual(prev, safePlaylist.contributors) ? prev : safePlaylist.contributors));
  }, [safePlaylist.id, safePlaylist.title, safePlaylist.description, safePlaylist.lastUpdated, isEditMode]);

  useEffect(() => {
    if (!isCreator || !isEditMode || !showAddContributor) {
      return;
    }

    let active = true;

    async function loadMutualContributors() {
      setIsLoadingContributors(true);
      try {
        const mutualIds = await getMutualFollows(500, 0);
        if (!active) return;

        if (mutualIds.length === 0) {
          setAvailableContributors([]);
          return;
        }

        const profiles = await getProfiles(mutualIds);
        if (!active) return;

        setAvailableContributors(
          profiles.map((p) => ({
            id: p.id,
            name: p.display_name || p.username || "Music Lover",
            avatar: p.avatar_url || undefined,
          }))
        );
      } catch (error) {
        console.error("Failed to load mutual follow contributors:", error);
        if (active) {
          setAvailableContributors([]);
        }
      } finally {
        if (active) {
          setIsLoadingContributors(false);
        }
      }
    }

    loadMutualContributors();

    return () => {
      active = false;
    };
  }, [isCreator, isEditMode, showAddContributor]);

  const handleCoverUpdate = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(file);
    }).catch(() => "");

    if (!dataUrl) {
      toast.error("Failed to load image");
      return;
    }

    onUpdatePlaylist?.({ cover: dataUrl });

    const coverAttempts = [
      () => supabase.from("collaborative_playlists").update({ cover_image: dataUrl }).eq("id", safePlaylist.id),
      () => supabase.from("playlists").update({ cover_image: dataUrl }).eq("id", safePlaylist.id),
    ];

    let coverSaved = false;
    for (const attempt of coverAttempts) {
      const { error } = await attempt();
      if (!error) {
        coverSaved = true;
        break;
      }
    }

    if (coverSaved) {
      toast.success("Playlist picture updated");
    } else {
      toast.warning("Picture updated in the app, but could not be saved to the database.");
    }
  };

  // Debounce searches so typing in the add-track flow does not fire a request per keystroke.
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

    setTracks((prev) => [newTrack, ...prev]);
    onAddTrack?.(newTrack);
    toast.success(`Added "${album.title}" to playlist`);
    setShowAddTrack(false);
    setSearchQuery("");
  };

  const handleSaveDescription = async () => {
    const result = await onUpdatePlaylist?.({ description: editedDescription });
    if (result === false) return;

    setIsEditMode(false);
    toast.success("Description updated");
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
    if (!isCreator) {
      toast.error("Only the creator can add contributors");
      return;
    }

    if (!editedContributors.some(c => c.id === contributor.id)) {
      setEditedContributors(prev => [...prev, contributor]);
      setShowAddContributor(false);
    }
  };

  const handleRemoveContributor = (contributorId: string) => {
    if (!isCreator) {
      toast.error("Only the creator can remove contributors");
      return;
    }

    if (contributorId === creatorId) {
      toast.error("The creator cannot be removed");
      return;
    }

    setEditedContributors(prev => prev.filter(c => c.id !== contributorId));
  };

  const handleSaveAllChanges = async () => {
    const result = await onUpdatePlaylist?.({
      title: editedTitle,
      description: editedDescription,
      moods: editedMoods,
      contributors: editedContributors,
    });

    if (result === false) {
      return;
    }

    setIsEditMode(false);
    toast.success("Playlist updated successfully!");
    window.setTimeout(() => {
      document.getElementById("collab-view-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleCancelEdit = () => {
    setEditedTitle(safePlaylist.title);
    setEditedDescription(safePlaylist.description);
    setEditedMoods(safePlaylist.moods);
    setEditedContributors(safePlaylist.contributors);
    setIsEditMode(false);
  };

  const handleSwitchMode = (mode: "view" | "edit") => {
    setIsEditMode(mode === "edit");
    window.setTimeout(() => {
      const target = mode === "edit" ? document.getElementById("collab-edit-section") : document.getElementById("collab-view-section");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  // Keep the local mode in sync when the parent reopens the detail view in a different state.
  useEffect(() => {
    setIsEditMode(initialMode === "edit");
  }, [initialMode]);

  const selectableContributors = availableContributors.filter(
    (candidate) => !editedContributors.some((existing) => existing.id === candidate.id)
  );

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
            variant={isEditMode ? "outline" : "default"}
            size="sm"
            onClick={() => handleSwitchMode("view")}
            className={!isEditMode ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "border-border hover:border-primary hover:text-primary"}
          >
            View Playlist
          </Button>
          <Button
            variant={isEditMode ? "default" : "outline"}
            size="sm"
            onClick={() => handleSwitchMode("edit")}
            className={isEditMode ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "border-border hover:border-primary hover:text-primary"}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Playlist
          </Button>
          {isEditMode && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Playlist Info / Edit Section */}
      {!isEditMode ? (
        <Card id="collab-view-section" className="p-6 bg-card border-border">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-xl text-foreground">View Playlist</h2>
          </div>

          <div className="grid md:grid-cols-[96px_1fr] gap-5 items-start">
            <img
              src={safePlaylist.cover}
              alt={safePlaylist.title}
              className="w-24 h-24 md:w-24 md:h-24 object-cover rounded-lg border border-border shadow-sm"
            />
            <div className="space-y-3 min-w-0">
              <div>
                <h3 className="text-2xl text-foreground mb-1 truncate">{safePlaylist.title}</h3>
                <p className="text-muted-foreground line-clamp-2">{safePlaylist.description}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {safePlaylist.moods.map((mood) => (
                  <Badge key={mood} variant="outline" className="border-secondary/50 text-secondary">{mood}</Badge>
                ))}
              </div>

              <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                <span>{tracks.length} tracks</span>
                <span>{safePlaylist.contributors.length} contributors</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {safePlaylist.contributors.map((contributor) => (
                  <Badge key={contributor.id} variant="outline" className={`border-border text-foreground ${contributor.id === creatorId ? "border-primary text-primary" : ""}`}>
                    {contributor.name}
                    {contributor.id === creatorId && <span className="ml-2 text-[10px] uppercase tracking-wide">Creator</span>}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card id="collab-edit-section" className="p-6 bg-card border-primary/30">
          <div className="flex items-center gap-2 mb-6">
            <Edit className="w-5 h-5 text-primary" />
            <h2 className="text-xl text-foreground">Edit Playlist</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-sm text-foreground mb-2 block">Playlist Cover</label>
              <div className="flex items-center gap-4">
                <img
                  src={safePlaylist.cover}
                  alt={safePlaylist.title}
                  className="w-20 h-20 rounded-lg object-cover border border-border shadow-sm"
                />
                <div className="space-y-2">
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverUpdate}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border hover:border-primary hover:text-primary"
                    onClick={() => coverInputRef.current?.click()}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Change Cover
                  </Button>
                  <p className="text-xs text-muted-foreground">Any collaborator can update the playlist picture from edit mode.</p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm text-foreground mb-2 block">Playlist Title</label>
              <Input value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} className="bg-background border-border text-foreground" placeholder="Enter playlist title..." />
            </div>

            <div>
              <label className="text-sm text-foreground mb-2 block">Description</label>
              <Textarea value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} className="bg-background border-border text-foreground min-h-[80px]" placeholder="Describe your playlist..." />
            </div>

            <div>
              <label className="text-sm text-foreground mb-2 block">Moods & Tags</label>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {editedMoods.map((mood) => (
                    <Badge key={mood} variant="outline" className="border-secondary/50 text-secondary pr-1 group hover:border-destructive/50 transition-colors">
                      {mood}
                      <button onClick={() => handleRemoveMood(mood)} className="ml-1.5 hover:text-destructive transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input value={newMood} onChange={(e) => setNewMood(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddMood()} placeholder="Add a mood or tag..." className="flex-1 bg-background border-border text-foreground" />
                  <Button size="sm" onClick={handleAddMood} className="bg-secondary hover:bg-secondary/90 text-white">
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground">Suggestions:</span>
                  {availableMoods.filter(m => !editedMoods.includes(m)).slice(0, 6).map((mood) => (
                    <button key={mood} onClick={() => setEditedMoods(prev => [...prev, mood])} className="text-xs px-2 py-1 rounded-md bg-muted/30 hover:bg-secondary/20 hover:text-secondary transition-colors text-muted-foreground">
                      + {mood}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm text-foreground mb-2 block">Contributors</label>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {editedContributors.map((contributor) => (
                    <div key={contributor.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border group hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-3">
                        {contributor.avatar ? (
                          <img src={contributor.avatar} alt={contributor.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-primary">{contributor.name.charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-foreground">{contributor.name}</p>
                          <p className="text-xs text-muted-foreground">{contributor.id === creatorId ? "Creator" : "Contributor"}</p>
                        </div>
                      </div>
                      {isCreator && contributor.id !== creatorId && (
                        <Button size="sm" variant="ghost" onClick={() => handleRemoveContributor(contributor.id)} className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive transition-all">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {showAddContributor && isCreator ? (
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/30">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm text-foreground">Add Contributor</h4>
                      <Button size="sm" variant="ghost" onClick={() => setShowAddContributor(false)} className="h-6 w-6 p-0">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {isLoadingContributors && (
                        <div className="text-xs text-muted-foreground">Loading mutual followers...</div>
                      )}

                      {!isLoadingContributors && selectableContributors.length === 0 && (
                        <div className="text-xs text-muted-foreground">No additional mutual followers available to invite.</div>
                      )}

                      {!isLoadingContributors && selectableContributors.map((contributor) => (
                        <button key={contributor.id} onClick={() => { handleAddContributor(contributor); toast.success(`Added ${contributor.name} as contributor`); }} className="w-full flex items-center gap-3 p-3 rounded-lg bg-background hover:bg-muted/30 border border-border hover:border-primary/50 transition-colors">
                          {contributor.avatar ? (
                            <img src={contributor.avatar} alt={contributor.name} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-primary">{contributor.name.charAt(0).toUpperCase()}</span>
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
                ) : isCreator ? (
                  <Button variant="outline" size="sm" onClick={() => setShowAddContributor(true)} className="w-full border-dashed border-primary/30 hover:border-primary hover:bg-primary/5">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Contributor
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Only the creator can add contributors.</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tracks Section */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-foreground flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" />
            Tracks ({tracks.length})
          </h3>
          {isEditMode && (
            <Button onClick={() => setShowAddTrack(!showAddTrack)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Add Track
            </Button>
          )}
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
                className="group flex items-center gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => {
                  // Reuse the global album/song modal so track rows open the same review flow as the rest of the app.
                  onOpenTrack?.({
                    id: track.id,
                    type: "track",
                    title: track.title,
                    artist: track.artist,
                    cover: track.cover || "",
                    album: track.album,
                    previewUrl: undefined,
                    spotifyUrl: undefined,
                    appleMusicUrl: undefined,
                  });
                }}
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
                {isEditMode && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveTrack(track.id);
                      }}
                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}