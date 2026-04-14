import { useState, useEffect, useRef } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { UserPlus, Share2, Music, Clock, Sparkles, MessageSquare, Send, Search, Plus, Image, Smile, X, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "./BackButton";
import { useProfile } from "../lib/useProfile";
import { searchTracks } from "../lib/api/musicSearch";
import { getMutualFollows } from "../lib/api/follows";
import { getProfiles } from "../lib/api/profiles";
import { supabase } from "../lib/supabaseClient";

const isPolicyRecursionError = (error: any): boolean => !!error && error.code === "42P17";

interface SearchTrackItem {
  id: string;
  title: string;
  artist: string;
  cover: string;
  album?: string;
  durationMs?: number;
  previewUrl?: string;
  url?: string;
}

interface PlaylistTrack {
  rowId?: string;
  id: string;
  title: string;
  artist: string;
  durationMs?: number;
  addedById?: string;
  addedBy: string;
  timestamp: string;
  addedAtRaw?: string;
  cover?: string;
  albumCover?: string;
  album?: string;
  previewUrl?: string;
  spotifyUrl?: string;
  appleMusicUrl?: string;
}

interface ChatTrack {
  title: string;
  artist: string;
  cover: string;
  rating?: number;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  message: string;
  timestamp: string;
  type: "text" | "image" | "gif" | "track";
  imageUrl?: string;
  gifUrl?: string;
  track?: ChatTrack;
}

interface CollaborativePlaylistPageProps {
  onNavigate?: (page: string) => void;
  playlistId?: string;
  playlists: any[];
  setPlaylists: (playlists: any[]) => void;
  onBack?: () => void;
  canGoBack?: boolean;
  onOpenTrack?: (trackData: any) => void;
}

function formatRelativeTime(timestamp: string | null | undefined): string {
  if (!timestamp) return "Just now";
  const value = new Date(timestamp).getTime();
  if (Number.isNaN(value)) return "Just now";

  const diffMs = Date.now() - value;
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes <= 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function mapTrackRow(row: any): PlaylistTrack {
  return {
    rowId: String(row.id || ""),
    id: String(row.track_id || row.id || ""),
    title: row.track_title || "Unknown Track",
    artist: row.track_artist || "Unknown Artist",
    durationMs: typeof row.duration_ms === "number" ? row.duration_ms : undefined,
    addedById: row.added_by || undefined,
    addedBy: row.added_by_name || "Collaborator",
    timestamp: formatRelativeTime(row.added_at),
    addedAtRaw: row.added_at || undefined,
    cover: row.album_cover || undefined,
    albumCover: row.album_cover || undefined,
    previewUrl: row.preview_url || undefined,
    spotifyUrl: row.spotify_url || undefined,
    appleMusicUrl: row.apple_music_url || undefined,
  };
}

function formatDurationTotal(totalMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours <= 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

export function CollaborativePlaylistPage({ onNavigate, playlistId, playlists, setPlaylists, onBack, canGoBack, onOpenTrack }: CollaborativePlaylistPageProps) {
  const { profile } = useProfile();
  // Find the current playlist
  const playlist = playlists.find(p => p.id === playlistId) || playlists[0];
  const [newMessage, setNewMessage] = useState("");
  const [showAddTrackModal, setShowAddTrackModal] = useState(false);
  const [showAddMoodModal, setShowAddMoodModal] = useState(false);
  const [showGifModal, setShowGifModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteSearchQuery, setInviteSearchQuery] = useState("");
  const [inviteFriends, setInviteFriends] = useState<Array<{ id: string; name: string; avatar: string }>>([]);
  const [selectedInvitees, setSelectedInvitees] = useState<string[]>([]);
  const [isLoadingInviteFriends, setIsLoadingInviteFriends] = useState(false);
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [isDeletingPlaylist, setIsDeletingPlaylist] = useState(false);
  const [newMood, setNewMood] = useState("");
  const [gifSearchQuery, setGifSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showShareTrackModal, setShowShareTrackModal] = useState(false);
  const [tracks, setTracks] = useState<PlaylistTrack[]>((playlist?.tracks || []) as PlaylistTrack[]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [isAddingTrack, setIsAddingTrack] = useState(false);
  const [removingTrackRowId, setRemovingTrackRowId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [searchResults, setSearchResults] = useState<SearchTrackItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const canModifyTracks = !!currentUserId;

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setCurrentUserId(data.session?.user?.id || null);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!playlist?.id) {
      setTracks([]);
      return;
    }

    let active = true;

    async function loadTracks() {
      setIsLoadingTracks(true);
      try {
        let { data, error } = await supabase
          .from("playlist_tracks")
          .select("id, track_id, track_title, track_artist, album_cover, duration_ms, added_by, added_by_name, added_at, position")
          .eq("playlist_id", playlist.id)
          .order("position", { ascending: true })
          .order("added_at", { ascending: true });

        // Backward-compatible fallback for older schemas missing duration_ms.
        if (error && String(error.message || "").toLowerCase().includes("duration_ms")) {
          const fallback = await supabase
            .from("playlist_tracks")
            .select("id, track_id, track_title, track_artist, album_cover, added_by, added_by_name, added_at, position")
            .eq("playlist_id", playlist.id)
            .order("position", { ascending: true })
            .order("added_at", { ascending: true });

          data = fallback.data;
          error = fallback.error;
        }

        if (error) throw error;
        if (!active) return;

        const mapped = (data || []).map(mapTrackRow);
        setTracks(mapped);

        setPlaylists(
          playlists.map((p) =>
            p.id === playlist.id
              ? {
                  ...p,
                  trackCount: mapped.length,
                  lastUpdated: "Just now",
                }
              : p
          )
        );
      } catch (error) {
        console.error("Failed to load collaborative playlist tracks:", error);
        if (active) setTracks([]);
      } finally {
        if (active) setIsLoadingTracks(false);
      }
    }

    loadTracks();

    const trackChannel = supabase
      .channel(`playlist_tracks_${playlist.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "playlist_tracks", filter: `playlist_id=eq.${playlist.id}` },
        () => loadTracks()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(trackChannel);
    };
  }, [playlist?.id]);
  
  // Debounced album search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchTracks(searchQuery, 10);
        setSearchResults(results.map(r => ({
          id: r.id,
          title: r.title,
          artist: r.artist,
          cover: r.albumCover,
          album: r.album,
          durationMs: r.duration,
          previewUrl: r.previewUrl,
          url: r.url,
        })));
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Different messages for each playlist (start empty, real messages would come from backend)
  const getInitialMessages = (_playlistId: string): ChatMessage[] => {
    // In a real implementation, messages would be fetched from Supabase.
    return [];
  };

  const [messages, setMessages] = useState<ChatMessage[]>(getInitialMessages(playlistId || "default"));

  // Scroll to bottom when messages change
  const scrollToBottom = (smooth = true) => {
    if (messagesContainerRef.current) {
      const scrollHeight = messagesContainerRef.current.scrollHeight;
      messagesContainerRef.current.scrollTo({
        top: scrollHeight,
        behavior: smooth ? "smooth" : "auto"
      });
    }
  };

  // Scroll to bottom on initial load
  useEffect(() => {
    setTimeout(() => scrollToBottom(false), 50);
  }, []);

  // Load mutual-follow users for invite flow.
  useEffect(() => {
    if (!showInviteModal) {
      return;
    }

    let active = true;

    async function loadInviteCandidates() {
      setIsLoadingInviteFriends(true);
      try {
        const followingIds = await getMutualFollows();
        if (!active) return;

        if (followingIds.length === 0) {
          setInviteFriends([]);
          return;
        }

        const followingProfiles = await getProfiles(followingIds);
        if (!active) return;

        setInviteFriends(
          followingProfiles.map((f) => ({
            id: f.id,
            name: f.display_name || f.username || "Music Lover",
            avatar: f.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.id}`,
          }))
        );
      } catch (error) {
        console.error("Failed to load invite friends:", error);
        if (active) setInviteFriends([]);
      } finally {
        if (active) setIsLoadingInviteFriends(false);
      }
    }

    loadInviteCandidates();

    return () => {
      active = false;
    };
  }, [showInviteModal]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    scrollToBottom(true);
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() && !selectedImage) return;
    
    const msg: ChatMessage = {
      id: `msg${Date.now()}`,
      userId: profile?.id || "current-user",
      userName: profile?.display_name || profile?.username || "You",
      userAvatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=user`,
      message: newMessage,
      timestamp: "Just now",
      type: selectedImage ? "image" : "text",
      imageUrl: selectedImage || undefined,
    };

    setMessages((prev) => [...prev, msg]);
    setNewMessage("");
    setSelectedImage(null);
  };

  const handleSendGif = (gifUrl: string) => {
    const msg: ChatMessage = {
      id: `msg${Date.now()}`,
      userId: profile?.id || "current-user",
      userName: profile?.display_name || profile?.username || "You",
      userAvatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=user`,
      message: "",
      timestamp: "Just now",
      type: "gif",
      gifUrl: gifUrl,
    };

    setMessages((prev) => [...prev, msg]);
    setShowGifModal(false);
    setGifSearchQuery("");
    toast.success("GIF sent!");
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        toast.success("Image selected! Click send to share it.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleShareTrack = (track: SearchTrackItem) => {
    const msg: ChatMessage = {
      id: `msg${Date.now()}`,
      userId: profile?.id || "current-user",
      userName: profile?.display_name || profile?.username || "You",
      userAvatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=user`,
      message: "",
      timestamp: "Just now",
      type: "track",
      track: {
        title: track.title,
        artist: track.artist,
        cover: track.cover,
        rating: 0,
      },
    };

    setMessages((prev) => [...prev, msg]);
    setShowShareTrackModal(false);
    setSearchQuery("");
    toast.success(`Shared "${track.title}"!`);
  };

  const handleAddTrack = async (track: SearchTrackItem) => {
    if (!playlist?.id) {
      toast.error("Playlist not found");
      return;
    }

    setIsAddingTrack(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const currentUserId = session.session?.user?.id;
      if (!currentUserId) {
        toast.error("Please sign in to add tracks");
        return;
      }

      const nextPosition = tracks.length;

      const { error } = await supabase.from("playlist_tracks").insert({
        playlist_id: playlist.id,
        track_id: track.id,
        track_title: track.title,
        track_artist: track.artist,
        album_name: track.album || null,
        album_cover: track.cover,
        duration_ms: track.durationMs || null,
        preview_url: track.previewUrl || null,
        apple_music_url: track.url || null,
        added_by: currentUserId,
        added_by_name: profile?.display_name || profile?.username || session.session?.user?.email || "Collaborator",
        added_by_avatar: profile?.avatar_url || null,
        position: nextPosition,
      });

      if (error) throw error;

      setShowAddTrackModal(false);
      setSearchQuery("");
      toast.success(`Added "${track.title}" to the playlist`);
    } catch (error) {
      console.error("Failed to add track to collaborative playlist:", error);
      toast.error("Failed to add track. Please try again.");
    } finally {
      setIsAddingTrack(false);
    }
  };

  const hasCompleteDurations = tracks.length > 0 && tracks.every((track) => typeof track.durationMs === "number" && track.durationMs > 0);
  const totalDurationMs = hasCompleteDurations
    ? tracks.reduce((sum, track) => sum + (track.durationMs || 0), 0)
    : 0;
  const durationDisplay = tracks.length === 0 ? "0m" : hasCompleteDurations ? formatDurationTotal(totalDurationMs) : "Unknown";

  const handleRemoveTrack = async (track: PlaylistTrack) => {
    if (!playlist?.id || !track.rowId) {
      toast.error("Track cannot be removed right now");
      return;
    }

    setRemovingTrackRowId(track.rowId);
    try {
      const { error } = await supabase
        .from("playlist_tracks")
        .delete()
        .eq("id", track.rowId)
        .eq("playlist_id", playlist.id);

      if (error) throw error;
      toast.success(`Removed "${track.title}"`);
    } catch (error) {
      console.error("Failed to remove track from collaborative playlist:", error);
      toast.error("Failed to remove track. Please try again.");
    } finally {
      setRemovingTrackRowId(null);
    }
  };

  // Predefined mood suggestions
  const moodSuggestions = [
    "Chill", "Hype", "Study", "Vibes", "Party", "Workout", "Sad", "Happy",
    "Classic", "Boom Bap", "Nostalgic", "Deep", "Reflective", "New", "Fresh",
    "Collaborative", "Energetic", "Mellow", "Upbeat", "Late Night"
  ];

  // Mock GIF suggestions - in real app would use Giphy/Tenor API
  const gifSuggestions = [
    {
      id: "gif1",
      url: "https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif",
      title: "Dancing"
    },
    {
      id: "gif2",
      url: "https://media.giphy.com/media/l378khQxt68syiNJm/giphy.gif",
      title: "Music Vibes"
    },
    {
      id: "gif3",
      url: "https://media.giphy.com/media/xUPGcC0R9QjyxkPnS8/giphy.gif",
      title: "Fire"
    },
    {
      id: "gif4",
      url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
      title: "Party"
    },
    {
      id: "gif5",
      url: "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif",
      title: "Thumbs Up"
    },
    {
      id: "gif6",
      url: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif",
      title: "Cool"
    },
  ];

  const handleAddMood = (mood: string) => {
    if (!mood.trim()) return;
    
    const currentMoods = playlist.moods || [];
    if (currentMoods.includes(mood)) {
      toast.error("This mood is already added!");
      return;
    }

    const updatedPlaylists = playlists.map(p => 
      p.id === playlist.id 
        ? { ...p, moods: [...currentMoods, mood] }
        : p
    );
    
    setPlaylists(updatedPlaylists);
    setNewMood("");
    toast.success(`Added "${mood}" mood!`);
  };

  const toggleInviteSelection = (friendId: string) => {
    setSelectedInvitees((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    );
  };

  const handleInviteFriends = async () => {
    if (!playlist?.id) {
      toast.error("Playlist not found");
      return;
    }

    if (selectedInvitees.length === 0) {
      toast.error("Select at least one person to invite");
      return;
    }

    const existingContributorIds = new Set((playlist?.contributors || []).map((c: any) => c.id));
    const filteredInvitees = selectedInvitees.filter((id) => !existingContributorIds.has(id));

    if (filteredInvitees.length === 0) {
      toast.error("Selected users are already collaborators");
      return;
    }

    const mutualFollowIds = await getMutualFollows(500, 0);
    const mutualFollowSet =
      mutualFollowIds.length > 0
        ? new Set(mutualFollowIds)
        : new Set(inviteFriends.map((friend) => friend.id));
    const eligibleInvitees = filteredInvitees.filter((id) => mutualFollowSet.has(id));

    if (eligibleInvitees.length === 0) {
      toast.error("You can only invite users who follow you back.");
      return;
    }

    if (eligibleInvitees.length !== filteredInvitees.length) {
      toast.warning("Some selected users are no longer mutual followers and were skipped.");
    }

    setIsSendingInvites(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const currentUserId = session.session?.user?.id;
      if (!currentUserId) {
        toast.error("Please sign in to send invites");
        return;
      }

      const inviterName = profile?.display_name || profile?.username || "A user";
      const inviterAvatar = profile?.avatar_url || null;

      const inviteRows = eligibleInvitees.map((inviteeId) => ({
        user_id: inviteeId,
        type: "playlist_invite",
        title: "Playlist collaboration invite",
        message: `${inviterName} invited you to collaborate on \"${playlist.title}\".`,
        action_user_id: currentUserId,
        action_user_name: inviterName,
        action_user_avatar: inviterAvatar,
        playlist_id: playlist.id,
        is_read: false,
      }));

      const { error } = await supabase.from("notifications").insert(inviteRows);
      if (error) throw error;

      const updatedPlaylists = playlists.map((p) =>
        p.id === playlist.id
          ? {
              ...p,
              pendingInviteCount: (p.pendingInviteCount || 0) + eligibleInvitees.length,
              lastUpdated: "Just now",
            }
          : p
      );
      setPlaylists(updatedPlaylists);

      toast.success(`Sent ${eligibleInvitees.length} invite${eligibleInvitees.length > 1 ? "s" : ""}`);
      setShowInviteModal(false);
      setSelectedInvitees([]);
      setInviteSearchQuery("");
    } catch (error) {
      console.error("Failed to send invites:", error);
      toast.error("Failed to send invites. Please try again.");
    } finally {
      setIsSendingInvites(false);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!playlist?.id) return;

    const confirmed = window.confirm(`Delete \"${playlist.title}\"? This cannot be undone.`);
    if (!confirmed) return;

    setIsDeletingPlaylist(true);
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        playlist.id
      );

      if (isUuid) {
        let deletedRemotely = false;

        const { error: legacyDeleteError } = await supabase.from("playlists").delete().eq("id", playlist.id);
        if (!legacyDeleteError) {
          deletedRemotely = true;
        }

        const { error: modernDeleteError } = await supabase
          .from("collaborative_playlists")
          .delete()
          .eq("id", playlist.id);
        if (!modernDeleteError) {
          deletedRemotely = true;
        }

        if (!deletedRemotely) {
          throw modernDeleteError || legacyDeleteError || new Error("Failed to delete playlist");
        }
      }

      setPlaylists(playlists.filter((p) => p.id !== playlist.id));
      toast.success("Collaborative playlist deleted");
      if (onBack) onBack();
      else onNavigate?.("your-space-collab");
    } catch (error) {
      console.error("Failed to delete collaborative playlist:", error);
      if (isPolicyRecursionError(error)) {
        toast.error("Delete blocked by DB policy recursion. Apply migration 021_fix_collab_policy_recursion.sql.");
      } else {
        toast.error("Failed to delete playlist. You may not have permission.");
      }
    } finally {
      setIsDeletingPlaylist(false);
    }
  };

  const filteredInviteFriends = inviteFriends.filter((friend) => {
    if (!inviteSearchQuery.trim()) return true;
    const q = inviteSearchQuery.toLowerCase();
    return friend.name.toLowerCase().includes(q);
  });

  const handleRemoveMood = (moodToRemove: string) => {
    const updatedPlaylists = playlists.map(p => 
      p.id === playlist.id 
        ? { ...p, moods: (p.moods || []).filter((m: string) => m !== moodToRemove) }
        : p
    );
    
    setPlaylists(updatedPlaylists);
    toast.success(`Removed "${moodToRemove}" mood!`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <BackButton onClick={onBack || (() => onNavigate?.("your-space-collab"))} label={canGoBack ? "Back" : "Back to Collaborative Playlists"} />
      
      {/* Playlist Header */}
      <Card className="p-8 bg-card border-border shadow-lg">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Playlist Cover */}
          <img
            src={playlist.cover}
            alt={playlist.title}
            className="w-full md:w-48 h-48 object-cover rounded-xl shadow-lg"
          />

          {/* Playlist Info */}
          <div className="flex-1 space-y-4">
            <div>
              <Badge className="bg-secondary/20 text-secondary border-0 mb-3">
                Collaborative Playlist
              </Badge>
              <h1 className="text-3xl text-foreground mb-2">{playlist.title}</h1>
              <p className="text-muted-foreground">{playlist.description}</p>
            </div>

            {/* Moods */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <p className="text-sm text-muted-foreground">Moods</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddMoodModal(true)}
                    className="h-6 text-xs text-primary hover:text-primary hover:bg-primary/10"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Mood
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {playlist.moods?.map((mood: string) => (
                    <Badge 
                      key={mood} 
                      className="bg-primary/20 text-primary border-0 cursor-pointer hover:bg-primary/30 transition-colors group"
                      onClick={() => handleRemoveMood(mood)}
                    >
                      {mood}
                      <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">×</span>
                    </Badge>
                  ))}
                  {(!playlist.moods || playlist.moods.length === 0) && (
                    <p className="text-sm text-muted-foreground italic">No moods added yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contributors */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Contributors</p>
              <div className="flex items-center gap-2">
                {playlist.contributors?.map((contributor: any) => (
                  <div key={contributor.id} className="relative group">
                    <Avatar className="w-10 h-10 border-2 border-primary shadow-md hover:shadow-lg transition-shadow">
                      <img src={contributor.avatar} alt={contributor.name} className="object-cover" />
                    </Avatar>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">
                      {contributor.name}
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="w-10 h-10 rounded-full border-2 border-dashed border-primary flex items-center justify-center hover:bg-primary/10 transition shadow-md hover:shadow-lg"
                >
                  <UserPlus className="w-4 h-4 text-primary" />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg hover:scale-105 transition-all"
                onClick={() => setShowInviteModal(true)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Friends
              </Button>
              <Button variant="outline" className="border-border">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={handleDeletePlaylist}
                disabled={isDeletingPlaylist}
              >
                {isDeletingPlaylist ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Delete Playlist
              </Button>
            </div>

            {/* Stats */}
            <div className="flex gap-6 pt-4 border-t border-border">
              <div>
                <p className="text-foreground">{tracks.length}</p>
                <p className="text-sm text-muted-foreground">Tracks</p>
              </div>
              <div>
                <p className="text-foreground">{playlist.contributors?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Contributors</p>
              </div>
              <div>
                <p className="text-foreground">{durationDisplay}</p>
                <p className="text-sm text-muted-foreground">Duration</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs for Tracks and Chat */}
      <Tabs defaultValue="tracks" className="w-full">
        <TabsList className="bg-card border border-border w-full md:w-auto grid grid-cols-2 gap-2 p-1">
          <TabsTrigger
            value="tracks"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
          >
            <Music className="w-4 h-4 mr-2" />
            Tracks ({tracks.length})
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-secondary data-[state=active]:to-secondary/80 data-[state=active]:text-secondary-foreground data-[state=active]:shadow-md"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Chat ({messages.length})
          </TabsTrigger>
        </TabsList>

        {/* Tracks Tab */}
        <TabsContent value="tracks" className="mt-6">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl text-foreground">Tracks</h2>
              <Button 
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg hover:scale-105 transition-all"
                onClick={() => setShowAddTrackModal(true)}
                disabled={!canModifyTracks}
              >
                <Music className="w-4 h-4 mr-2" />
                Add Track
              </Button>
            </div>

            <div className="space-y-3">
              {isLoadingTracks && (
                <div className="text-sm text-muted-foreground">Loading tracks...</div>
              )}
              {!isLoadingTracks && tracks.length === 0 && (
                <div className="text-sm text-muted-foreground border border-border rounded-lg p-4 bg-background">
                  No tracks yet. Add songs to start this collaborative playlist.
                </div>
              )}
              {tracks.map((track, index) => (
                <div
                  key={track.rowId || `${track.id}-${index}`}
                  className="flex items-center gap-4 p-4 bg-background rounded-lg hover:bg-muted transition cursor-pointer animate-slide-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={() => {
                    if (onOpenTrack) {
                      onOpenTrack({
                        id: track.id,
                        title: track.title,
                        artist: track.artist,
                        cover: track.cover || track.albumCover,
                        type: 'track',
                        album: track.album,
                        previewUrl: track.previewUrl,
                        spotifyUrl: track.spotifyUrl,
                        appleMusicUrl: track.appleMusicUrl,
                      });
                    }
                  }}
                >
                  {/* Track Number */}
                  <div className="w-8 text-center">
                    <span className="text-muted-foreground">{index + 1}</span>
                  </div>

                  {/* Album Cover */}
                  <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                    <img 
                      src={track.cover || track.albumCover || '/placeholder-album.png'} 
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground truncate">{track.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                  </div>

                  {/* Added By */}
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <img
                        src={
                          playlist?.contributors?.find((c: any) => c.name === track.addedBy)
                            ?.avatar || '/placeholder-avatar.png'
                        }
                        alt={track.addedBy}
                        className="object-cover"
                      />
                    </Avatar>
                    <div className="hidden md:block">
                      <p className="text-xs text-muted-foreground">Added by</p>
                      <p className="text-sm text-foreground">{track.addedBy}</p>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="flex items-center gap-1 text-muted-foreground flex-shrink-0">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs">{track.timestamp}</span>
                  </div>

                  {/* Remove Track */}
                  {canModifyTracks && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveTrack(track);
                      }}
                      disabled={removingTrackRowId === track.rowId}
                    >
                      {removingTrackRowId === track.rowId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat" className="mt-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl text-foreground mb-6">Playlist Chat</h2>
            
            {/* Messages */}
            <div ref={messagesContainerRef} className="space-y-4 mb-6 max-h-96 overflow-y-auto pr-2 nav-scroll">
              {messages.map((msg, index) => {
                const isCurrentUser = msg.userId === profile?.id || msg.userId === "current-user";
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 animate-slide-in ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <Avatar className="w-10 h-10 flex-shrink-0 border-2 border-primary">
                      <img src={msg.userAvatar} alt={msg.userName} className="object-cover" />
                    </Avatar>
                    
                    <div className={`flex-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                      <div className={`flex items-center gap-2 mb-1 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-sm font-medium text-foreground">
                          {msg.userName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {msg.timestamp}
                        </span>
                      </div>
                      <div
                        className={`inline-block rounded-lg max-w-md ${
                          msg.type === 'gif' || msg.type === 'image' || msg.type === 'track' ? 'p-1' : 'p-3'
                        } ${
                          msg.type === 'track' ? 'bg-card border border-border' :
                          isCurrentUser
                            ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {msg.type === 'gif' && msg.gifUrl && (
                          <img 
                            src={msg.gifUrl} 
                            alt="GIF" 
                            className="rounded-lg max-w-full h-auto max-h-48 object-cover"
                          />
                        )}
                        {msg.type === 'image' && msg.imageUrl && (
                          <img 
                            src={msg.imageUrl} 
                            alt="Shared image" 
                            className="rounded-lg max-w-full h-auto max-h-64 object-cover"
                          />
                        )}
                        {msg.type === 'track' && msg.track && (
                          <div className="p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Music className="w-4 h-4 text-primary" />
                              <span className="text-xs text-muted-foreground">Shared a track</span>
                            </div>
                            <div className="flex gap-3 bg-background p-3 rounded-lg">
                              <img
                                src={msg.track.cover}
                                alt={msg.track.title}
                                className="w-16 h-16 rounded object-cover"
                              />
                              <div>
                                <p className="text-sm text-foreground">{msg.track.title}</p>
                                <p className="text-xs text-muted-foreground">{msg.track.artist}</p>
                                {msg.track.rating && (
                                  <Badge className="bg-primary/20 text-primary border-0 mt-1">
                                    ★ {msg.track.rating}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        {msg.message && <p className="text-sm">{msg.message}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Selected Image Preview */}
            {selectedImage && (
              <div className="mb-4 relative inline-block">
                <img 
                  src={selectedImage} 
                  alt="Selected" 
                  className="max-h-32 rounded-lg border-2 border-primary"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-2 -right-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full w-6 h-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Message Input */}
            <div className="flex gap-2">
              <div className="flex gap-1 flex-shrink-0">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="image-upload"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => document.getElementById('image-upload')?.click()}
                  className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                  title="Add Image"
                >
                  <Image className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowGifModal(true)}
                  className="text-muted-foreground hover:text-accent hover:bg-accent/10"
                  title="Add GIF"
                >
                  <Smile className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowShareTrackModal(true)}
                  className="text-muted-foreground hover:text-secondary hover:bg-secondary/10"
                  title="Share Track"
                >
                  <Music className="w-5 h-5" />
                </Button>
              </div>
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-background border-2 border-border focus:border-primary"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() && !selectedImage}
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow-md hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Track Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="bg-card border-border max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Invite Friends</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Invite users who follow you back to collaborate on this playlist
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search mutual followers..."
                value={inviteSearchQuery}
                onChange={(e) => setInviteSearchQuery(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto nav-scroll">
              {isLoadingInviteFriends && (
                <div className="p-4 text-center text-sm text-muted-foreground">Loading mutual followers...</div>
              )}

              {!isLoadingInviteFriends && filteredInviteFriends.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground border border-border rounded-lg bg-background">
                  No mutual followers found to invite.
                </div>
              )}

              {!isLoadingInviteFriends && filteredInviteFriends.map((friend) => {
                const isAlreadyContributor = (playlist?.contributors || []).some((c: any) => c.id === friend.id);
                const isSelected = selectedInvitees.includes(friend.id);

                return (
                  <button
                    key={friend.id}
                    type="button"
                    disabled={isAlreadyContributor}
                    onClick={() => toggleInviteSelection(friend.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition text-left ${
                      isAlreadyContributor
                        ? "border-border/50 bg-muted/30 opacity-60 cursor-not-allowed"
                        : isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:border-primary/50"
                    }`}
                  >
                    <Avatar className="w-10 h-10">
                      <img src={friend.avatar} alt={friend.name} className="object-cover" />
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{friend.name}</p>
                      <p className="text-xs text-muted-foreground">{isAlreadyContributor ? "Already a collaborator" : "Tap to select"}</p>
                    </div>
                    {isSelected && !isAlreadyContributor && (
                      <Badge className="bg-primary text-primary-foreground border-0">Selected</Badge>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteSearchQuery("");
                  setSelectedInvitees([]);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleInviteFriends} disabled={isSendingInvites || selectedInvitees.length === 0}>
                {isSendingInvites ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Invites ({selectedInvitees.length})
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Track Modal */}
      <Dialog open={showAddTrackModal} onOpenChange={setShowAddTrackModal}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Track to Playlist</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Search for tracks to add to the collaborative playlist
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search for tracks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>

            {/* Search Results */}
            <div className="space-y-2 max-h-96 overflow-y-auto nav-scroll">
              {searchResults.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center gap-4 p-3 bg-background rounded-lg hover:bg-muted transition cursor-pointer group"
                >
                  <img
                    src={track.cover}
                    alt={track.title}
                    className="w-12 h-12 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground truncate">{track.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{track.artist}{track.album ? ` • ${track.album}` : ""}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAddTrack(track)}
                    disabled={isAddingTrack || !canModifyTracks}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {isAddingTrack ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Mood Modal */}
      <Dialog open={showAddMoodModal} onOpenChange={setShowAddMoodModal}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Mood Tags</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Choose from suggestions or create your own custom mood
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Custom Mood Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Type a custom mood..."
                value={newMood}
                onChange={(e) => setNewMood(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleAddMood(newMood);
                  }
                }}
                className="flex-1 bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
              <Button
                onClick={() => handleAddMood(newMood)}
                disabled={!newMood.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Mood Suggestions */}
            <div>
              <p className="text-sm text-muted-foreground mb-3">Popular Moods</p>
              <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto nav-scroll">
                {moodSuggestions
                  .filter(mood => !playlist.moods?.includes(mood))
                  .map((mood) => (
                    <Badge
                      key={mood}
                      className="bg-primary/10 text-primary border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
                      onClick={() => handleAddMood(mood)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {mood}
                    </Badge>
                  ))}
              </div>
            </div>

            {/* Current Moods */}
            {playlist.moods && playlist.moods.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-3">Current Moods</p>
                <div className="flex flex-wrap gap-2">
                  {playlist.moods.map((mood: string) => (
                    <Badge
                      key={mood}
                      className="bg-primary/20 text-primary border-0 cursor-pointer hover:bg-primary/30 transition-colors group"
                      onClick={() => handleRemoveMood(mood)}
                    >
                      {mood}
                      <span className="ml-1 opacity-70 group-hover:opacity-100">×</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* GIF Modal */}
      <Dialog open={showGifModal} onOpenChange={setShowGifModal}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Choose a GIF</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Select a GIF to send in the chat
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* GIF Search */}
            <div className="flex gap-2">
              <Input
                placeholder="Search GIFs..."
                value={gifSearchQuery}
                onChange={(e) => setGifSearchQuery(e.target.value)}
                className="flex-1 bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
              <Button
                variant="outline"
                className="border-border text-foreground hover:bg-muted"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>

            {/* GIF Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto nav-scroll">
              {gifSuggestions.map((gif) => (
                <div
                  key={gif.id}
                  className="relative group cursor-pointer rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all aspect-square"
                  onClick={() => handleSendGif(gif.url)}
                >
                  <img
                    src={gif.url}
                    alt={gif.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      Send
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Powered by notice */}
            <p className="text-xs text-muted-foreground text-center">
              GIFs powered by GIPHY
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Track Modal */}
      <Dialog open={showShareTrackModal} onOpenChange={setShowShareTrackModal}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Share a Track</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Search and share a track to the chat
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Search Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Search for a track or album..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
              <Button
                variant="outline"
                className="border-border text-foreground hover:bg-muted"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>

            {/* Search Results */}
            <div className="space-y-2 max-h-96 overflow-y-auto nav-scroll">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : !searchQuery.trim() ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <p>Search for a track to share</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <p>No tracks found</p>
                </div>
              ) : searchResults.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center gap-4 p-3 bg-background rounded-lg hover:bg-muted transition cursor-pointer group"
                >
                  <img
                    src={track.cover}
                    alt={track.title}
                    className="w-12 h-12 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground truncate">{track.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{track.artist}{track.album ? ` • ${track.album}` : ""}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleShareTrack(track)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Share2 className="w-4 h-4 mr-1" />
                    Share
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
