import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Users, Plus, Music, Search, UserPlus, Sparkles } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { BackButton } from "./BackButton";
import { useProfile } from "../lib/useProfile";
import { getFollowing } from "../lib/api/follows";

interface CollaborativePlaylistsHubProps {
  onNavigate?: (page: string) => void;
  onOpenPlaylist?: (playlistId: string) => void;
  playlists: any[];
  setPlaylists: (playlists: any[]) => void;
  onBack?: () => void;
  canGoBack?: boolean;
}

export function CollaborativePlaylistsHub({ onNavigate, onOpenPlaylist, playlists, setPlaylists, onBack, canGoBack }: CollaborativePlaylistsHubProps) {
  const { profile } = useProfile();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [playlistTitle, setPlaylistTitle] = useState("");
  const [playlistDescription, setPlaylistDescription] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [friends, setFriends] = useState<Array<{ id: string; name: string; avatar: string }>>([]);

  // Fetch friends (following list)
  useEffect(() => {
    if (!profile?.id) return;
    getFollowing(profile.id).then((following) => {
      setFriends(
        following.map((f: any) => ({
          id: f.id,
          name: f.display_name || f.username || "Music Lover",
          avatar: f.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.id}`,
        }))
      );
    }).catch(() => setFriends([]));
  }, [profile?.id]);

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleCreatePlaylist = () => {
    if (!playlistTitle.trim()) {
      toast.error("Please enter a playlist title");
      return;
    }
    if (selectedFriends.length === 0) {
      toast.error("Please select at least one friend to collaborate with");
      return;
    }

    // Create new playlist object
    const newPlaylist = {
      id: `collab-${Date.now()}`,
      title: playlistTitle,
      description: playlistDescription || "A new collaborative playlist",
      cover: `https://api.dicebear.com/7.x/shapes/svg?seed=${Date.now()}`,
      trackCount: 0,
      contributors: [
        {
          id: profile?.id || "current-user",
          name: profile?.display_name || profile?.username || "You",
          avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=user`,
        },
        ...selectedFriends.map(friendId => {
          const friend = friends.find(f => f.id === friendId);
          return {
            id: friend!.id,
            name: friend!.name,
            avatar: friend!.avatar,
          };
        }),
      ],
      lastUpdated: "Just now",
      moods: ["New", "Fresh", "Collaborative"],
    };

    // Add to the beginning of the playlists array
    setPlaylists([newPlaylist, ...playlists]);

    toast.success(`Created "${playlistTitle}" with ${selectedFriends.length} collaborator${selectedFriends.length > 1 ? 's' : ''}!`);
    setShowCreateModal(false);
    setPlaylistTitle("");
    setPlaylistDescription("");
    setSelectedFriends([]);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Back Button */}
      <BackButton onClick={onBack || (() => onNavigate?.("your-space"))} label={canGoBack ? "Back" : "Back to My Space"} />

      {/* Page Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl text-foreground mb-2">Collaborative Playlists</h1>
            <p className="text-muted-foreground">
              Create and manage playlists with your friends
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Playlist
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-card/50 border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Music className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl text-foreground">{playlists.length}</p>
                <p className="text-xs text-muted-foreground">Playlists</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card/50 border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl text-foreground">
                  {new Set(playlists.flatMap(p => p.contributors.map(c => c.id))).size}
                </p>
                <p className="text-xs text-muted-foreground">Collaborators</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card/50 border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Music className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl text-foreground">
                  {playlists.reduce((sum, p) => sum + p.trackCount, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Total Tracks</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card/50 border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl text-foreground">Active</p>
                <p className="text-xs text-muted-foreground">Status</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Playlists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {playlists.map((playlist) => (
          <Card
            key={playlist.id}
            className="group cursor-pointer overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
            onClick={() => onOpenPlaylist?.(playlist.id)}
          >
            <div className="flex gap-4 p-5">
              {/* Playlist Cover */}
              <div className="relative flex-shrink-0">
                <img
                  src={playlist.cover}
                  alt={playlist.title}
                  className="w-28 h-28 rounded-lg object-cover shadow-md group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-lg" />
                <div className="absolute bottom-2 left-2 right-2">
                  <Badge className="bg-primary/90 text-white border-0 text-xs">
                    {playlist.trackCount} tracks
                  </Badge>
                </div>
              </div>

              {/* Playlist Info */}
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-foreground mb-1 group-hover:text-primary transition-colors">
                    {playlist.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {playlist.description}
                  </p>
                </div>

                {/* Moods */}
                <div className="flex flex-wrap gap-1.5">
                  {playlist.moods.map((mood) => (
                    <Badge
                      key={mood}
                      variant="outline"
                      className="text-xs border-primary/30 text-primary"
                    >
                      {mood}
                    </Badge>
                  ))}
                </div>

                {/* Contributors */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {playlist.contributors.length} collaborators
                    </span>
                  </div>
                  <div className="flex -space-x-2">
                    {playlist.contributors.slice(0, 5).map((contributor) => (
                      <Avatar
                        key={contributor.id}
                        className="w-8 h-8 border-2 border-card ring-2 ring-card"
                      >
                        <img
                          src={contributor.avatar}
                          alt={contributor.name}
                          className="w-full h-full object-cover"
                        />
                      </Avatar>
                    ))}
                    {playlist.contributors.length > 5 && (
                      <div className="w-8 h-8 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center">
                        <span className="text-xs text-primary">
                          +{playlist.contributors.length - 5}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Updated {playlist.lastUpdated}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Create Playlist Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Create Collaborative Playlist</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Start a new playlist and invite friends to collaborate
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Playlist Details */}
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Playlist Title *
                </label>
                <Input
                  value={playlistTitle}
                  onChange={(e) => setPlaylistTitle(e.target.value)}
                  placeholder="e.g., Summer Vibes 2025"
                  className="bg-background border-border"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Description (optional)
                </label>
                <Input
                  value={playlistDescription}
                  onChange={(e) => setPlaylistDescription(e.target.value)}
                  placeholder="What's this playlist about?"
                  className="bg-background border-border"
                />
              </div>
            </div>

            {/* Select Collaborators */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" />
                <label className="text-sm text-muted-foreground">
                  Select Collaborators * ({selectedFriends.length} selected)
                </label>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    onClick={() => toggleFriendSelection(friend.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedFriends.includes(friend.id)
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:border-primary/50"
                    }`}
                  >
                    <Avatar className="w-10 h-10">
                      <img
                        src={friend.avatar}
                        alt={friend.name}
                        className="w-full h-full object-cover"
                      />
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{friend.name}</p>
                    </div>
                    {selectedFriends.includes(friend.id) && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setPlaylistTitle("");
                setPlaylistDescription("");
                setSelectedFriends([]);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePlaylist}
              className="flex-1 bg-gradient-to-r from-primary to-accent"
            >
              Create Playlist
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}