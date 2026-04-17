import { useState, useEffect, useRef } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Tabs, TabsContent } from "./ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { UserPlus, Share2, Music, Clock, Sparkles, Search, Plus, Loader2, Trash2, Send, Camera } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "./BackButton";
import { useProfile } from "../lib/useProfile";
import { searchTracks } from "../lib/api/musicSearch";
import { getMutualFollows } from "../lib/api/follows";
import { getProfiles } from "../lib/api/profiles";
import { supabase } from "../lib/supabaseClient";
import { respondToPlaylistInvite } from "../lib/api/collaborativeInvites";

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

function isDuplicateTrackError(error: any): boolean {
  if (!error) return false;
  const message = String(error.message || "").toLowerCase();
  const details = String(error.details || "").toLowerCase();
  return (
    error.status === 409 ||
    error.code === "23505" ||
    message.includes("duplicate") ||
    message.includes("unique") ||
    details.includes("playlist_id") && details.includes("track_id")
  );
}

function isPermissionDeniedError(error: any): boolean {
  if (!error) return false;
  const message = String(error.message || "").toLowerCase();
  return error.status === 403 || error.code === "42501" || message.includes("permission denied");
}

function isUndefinedColumnError(error: any): boolean {
  if (!error) return false;
  const message = String(error.message || "").toLowerCase();
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    message.includes("column") && message.includes("does not exist") ||
    message.includes("schema cache")
  );
}

function isMissingLegacyPlaylistFkError(error: any): boolean {
  if (!error) return false;
  const message = String(error.message || "").toLowerCase();
  const details = String(error.details || "").toLowerCase();
  return (
    error.code === "23503" &&
    (
      message.includes("playlist_tracks_playlist_id_fkey") ||
      details.includes("key is not present in table \"playlists\"") ||
      details.includes("table \"playlists\"")
    )
  );
}

interface PlaylistTrack {
  rowId?: string;
  id: string;
  title: string;
  artist: string;
  durationMs?: number;
  addedById?: string;
  addedBy: string;
  addedByAvatar?: string;
  timestamp: string;
  addedAtRaw?: string;
  cover?: string;
  albumCover?: string;
  album?: string;
  previewUrl?: string;
  spotifyUrl?: string;
  appleMusicUrl?: string;
}

interface CollaborativePlaylistPageProps {
  onNavigate?: (page: string) => void;
  playlistId?: string;
  playlists: any[];
  setPlaylists: React.Dispatch<React.SetStateAction<any[]>>;
  onBack?: () => void;
  canGoBack?: boolean;
  onOpenTrack?: (trackData: any) => void;
  pendingInvite?: {
    playlistId: string;
    notificationId: string;
    title?: string;
  };
  onInviteResolved?: () => void;
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
    addedByAvatar: row.added_by_avatar || undefined,
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

export function CollaborativePlaylistPage({ onNavigate, playlistId, playlists, setPlaylists, onBack, canGoBack, onOpenTrack, pendingInvite, onInviteResolved }: CollaborativePlaylistPageProps) {
  const { profile } = useProfile();
  const [inviteResponseLoading, setInviteResponseLoading] = useState(false);
  const [hasAcceptedInvite, setHasAcceptedInvite] = useState(false);
  const playlistFromStore = playlists.find(p => p.id === playlistId) || playlists[0];
  const playlist = playlistFromStore || (
    pendingInvite?.playlistId === playlistId
      ? {
          id: playlistId || pendingInvite.playlistId,
          title: pendingInvite.title || "Playlist collaboration invite",
          description: "You have been invited to collaborate on this playlist.",
          cover: `https://api.dicebear.com/7.x/shapes/svg?seed=${playlistId || pendingInvite.playlistId}`,
          contributors: [],
          moods: [],
          trackCount: 0,
          pendingInviteCount: 0,
        }
      : undefined
  );
  const [showAddTrackModal, setShowAddTrackModal] = useState(false);
  const [showAddMoodModal, setShowAddMoodModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteSearchQuery, setInviteSearchQuery] = useState("");
  const [inviteFriends, setInviteFriends] = useState<Array<{ id: string; name: string; avatar: string }>>([]);
  const [selectedInvitees, setSelectedInvitees] = useState<string[]>([]);
  const [isLoadingInviteFriends, setIsLoadingInviteFriends] = useState(false);
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [isDeletingPlaylist, setIsDeletingPlaylist] = useState(false);
  const [newMood, setNewMood] = useState("");
  const [tracks, setTracks] = useState<PlaylistTrack[]>((playlist?.tracks || []) as PlaylistTrack[]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [isAddingTrack, setIsAddingTrack] = useState(false);
  const [removingTrackRowId, setRemovingTrackRowId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchTrackItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const trackMetadataCacheRef = useRef<Record<string, Partial<PlaylistTrack>>>({});
  const creatorId = String(playlist?.creatorId || playlist?.creator_id || playlist?.created_by || "");
  const isCurrentUserContributor = !!currentUserId && !!playlist?.contributors?.some((c: any) => c.id === currentUserId);
  const isPlaylistCreator = !!currentUserId && !!creatorId && currentUserId === creatorId;
  const isPendingInvite = !!pendingInvite && pendingInvite.playlistId === (playlist?.id || playlistId) && !isCurrentUserContributor && !hasAcceptedInvite;
  const canModifyTracks = !!currentUserId && (isCurrentUserContributor || hasAcceptedInvite);

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
        // Use only cross-schema columns in the first query to avoid 400s
        // when optional columns are missing in legacy DB variants.
        const baseSelect = "id, track_id, track_title, track_artist, album_cover, added_by, added_at, position";
        const { data, error } = await supabase
          .from("playlist_tracks")
          .select(baseSelect)
          .eq("playlist_id", playlist.id)
          .order("position", { ascending: true })
          .order("added_at", { ascending: true });

        if (error) throw error;
        if (!active) return;

        const contributorById = new Map<string, { name: string; avatar?: string }>();
        for (const contributor of playlist?.contributors || []) {
          if (contributor?.id) {
            contributorById.set(String(contributor.id), {
              name: contributor.name || "Collaborator",
              avatar: contributor.avatar,
            });
          }
        }

        const missingProfileIds = Array.from(
          new Set(
            (data || [])
              .map((row: any) => String(row.added_by || ""))
              .filter((id) => !!id && !contributorById.has(id))
          )
        );

        if (missingProfileIds.length > 0) {
          try {
            const profiles = await getProfiles(missingProfileIds as string[]);
            for (const p of profiles) {
              contributorById.set(p.id, {
                name: p.display_name || p.username || "Collaborator",
                avatar: p.avatar_url || undefined,
              });
            }
          } catch {
            // Non-blocking enrichment fallback.
          }
        }

        const mapped = (data || []).map((row: any) => {
          const fallbackContributor = row.added_by ? contributorById.get(String(row.added_by)) : undefined;
          const cachedMetadata = trackMetadataCacheRef.current[String(row.id)] || trackMetadataCacheRef.current[String(row.track_id)] || {};
          return mapTrackRow({
            ...row,
            added_by_name: fallbackContributor?.name,
            added_by_avatar: fallbackContributor?.avatar,
            duration_ms: row.duration_ms ?? cachedMetadata.durationMs,
          });
        });
        setTracks(mapped);

        setPlaylists(
          (prev) => prev.map((p: any) =>
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
    useEffect(() => {
      if (isCurrentUserContributor) {
        setHasAcceptedInvite(true);
      }
    }, [isCurrentUserContributor]);
  
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

  const handleInviteDecision = async (decision: "accept" | "decline") => {
    if (!pendingInvite?.notificationId) {
      toast.error("Invite details are missing");
      return;
    }

    setInviteResponseLoading(true);
    try {
      if (decision === "accept") {
        await respondToPlaylistInvite(pendingInvite.notificationId, "accept");
        setHasAcceptedInvite(true);
        setPlaylists((prev) =>
          prev.map((p: any) =>
            p.id === (playlist?.id || playlistId)
              ? {
                  ...p,
                  contributors: Array.from(
                    new Map([
                      ...(p.contributors || []).map((c: any) => [c.id, c]),
                      [profile?.id || currentUserId || "current-user", {
                        id: profile?.id || currentUserId || "current-user",
                        name: profile?.display_name || profile?.username || "You",
                        avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=user`,
                      }],
                    ])
                  ).map(([, value]) => value),
                }
              : p
          )
        );
        toast.success("Invite accepted");
      } else {
        await respondToPlaylistInvite(pendingInvite.notificationId, "decline");
        toast.success("Invite declined");
        onInviteResolved?.();
        onNavigate?.("playlist");
      }
    } catch (error) {
      console.error("Failed to respond to invite:", error);
      toast.error("Could not process invite response");
    } finally {
      setInviteResponseLoading(false);
    }
  };

  const handleAddTrack = async (track: SearchTrackItem) => {
    if (!playlist?.id) {
      toast.error("Playlist not found");
      return;
    }

    // Prevent duplicate insert attempts from UI before hitting DB constraints.
    if (tracks.some((t) => t.id === track.id)) {
      toast.info("That track is already in this playlist.");
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

      const minimumInsertRow = {
        playlist_id: playlist.id,
        track_id: track.id,
        track_title: track.title,
        track_artist: track.artist,
        album_cover: track.cover,
        added_by: currentUserId,
        position: nextPosition,
      };

      const richInsertRow = {
        ...minimumInsertRow,
        duration_ms: track.durationMs ?? null,
        added_by_name: profile?.display_name || profile?.username || session.session?.user?.email || "Collaborator",
        added_by_avatar: profile?.avatar_url || null,
        preview_url: track.previewUrl || null,
        spotify_url: track.url || null,
        apple_music_url: track.url || null,
      };

      // Try a richer payload first so duration/adder metadata are stored when the
      // schema supports it, then fall back to the legacy-safe payload.
      let insertResult = await supabase
        .from("playlist_tracks")
        .insert(richInsertRow)
        .select("id, added_at")
        .single();
      let error = insertResult.error;

      if (error && isUndefinedColumnError(error)) {
        const fallbackInsert = await supabase
          .from("playlist_tracks")
          .insert(minimumInsertRow)
          .select("id, added_at")
          .single();
        insertResult = fallbackInsert;
        error = fallbackInsert.error;
      }

      // Legacy schema path: playlist_tracks may still FK to playlists(id).
      // Mirror the collaborative playlist row into playlists and retry once.
      if (error && isMissingLegacyPlaylistFkError(error)) {
        const collaboratorIds = Array.isArray(playlist?.contributors)
          ? playlist.contributors
              .map((c: any) => c?.id)
              .filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
          : [];

        const legacyMirrorPayload = {
          id: playlist.id,
          name: playlist.title || "Collaborative Playlist",
          description: playlist.description || "A collaborative playlist",
          cover_image: playlist.cover || null,
          creator_id: currentUserId,
          collaborators: Array.from(new Set([currentUserId, ...collaboratorIds])),
          is_public: false,
        };

        const mirrorAttempt = await supabase
          .from("playlists")
          .upsert(legacyMirrorPayload, { onConflict: "id" });

        if (!mirrorAttempt.error) {
          const retryInsert = await supabase
            .from("playlist_tracks")
            .insert(richInsertRow)
            .select("id, added_at")
            .single();
          if (retryInsert.error && isUndefinedColumnError(retryInsert.error)) {
            const legacyRetry = await supabase
              .from("playlist_tracks")
              .insert(minimumInsertRow)
              .select("id, added_at")
              .single();
            insertResult = legacyRetry;
            error = legacyRetry.error;
          } else {
            insertResult = retryInsert;
            error = retryInsert.error;
          }
        }
      }

      if (error) throw error;

      const insertedTrack: PlaylistTrack = {
        rowId: String(insertResult.data?.id || `${playlist.id}:${track.id}`),
        id: track.id,
        title: track.title,
        artist: track.artist,
        durationMs: typeof track.durationMs === "number" ? track.durationMs : undefined,
        addedById: currentUserId,
        addedBy: profile?.display_name || profile?.username || session.session?.user?.email || "Collaborator",
        addedByAvatar: profile?.avatar_url || undefined,
        timestamp: "Just now",
        addedAtRaw: insertResult.data?.added_at || new Date().toISOString(),
        cover: track.cover,
        albumCover: track.cover,
        album: track.album,
        previewUrl: track.previewUrl,
        appleMusicUrl: track.url,
      };

      trackMetadataCacheRef.current[insertedTrack.rowId || insertedTrack.id] = {
        durationMs: insertedTrack.durationMs,
        addedBy: insertedTrack.addedBy,
        addedById: insertedTrack.addedById,
        addedByAvatar: insertedTrack.addedByAvatar,
      };
      trackMetadataCacheRef.current[insertedTrack.id] = {
        durationMs: insertedTrack.durationMs,
        addedBy: insertedTrack.addedBy,
        addedById: insertedTrack.addedById,
        addedByAvatar: insertedTrack.addedByAvatar,
      };

      setTracks((prev) => (prev.some((t) => t.id === insertedTrack.id) ? prev : [...prev, insertedTrack]));
      setPlaylists((prev) =>
        prev.map((p: any) =>
          p.id === playlist.id
            ? { ...p, trackCount: (p.trackCount || 0) + 1, lastUpdated: "Just now" }
            : p
        )
      );

      setShowAddTrackModal(false);
      setSearchQuery("");
      toast.success(`Added "${track.title}" to the playlist`);
    } catch (error) {
      console.error("Failed to add track to collaborative playlist:", error);
      console.error("Add track error payload:", JSON.stringify(error, null, 2));
      if (isPolicyRecursionError(error)) {
        toast.error("Collaborative playlist policies are recursive. Apply migration 021_fix_collab_policy_recursion.sql.");
      } else if (isPermissionDeniedError(error)) {
        toast.error("You do not have permission to add tracks yet. Refresh after accepting the invite.");
      } else if (isDuplicateTrackError(error)) {
        toast.info("That track is already in this playlist.");
        setShowAddTrackModal(false);
        setSearchQuery("");
      } else {
        const message = (error as any)?.message || (error as any)?.details || "Failed to add track. Please try again.";
        toast.error(String(message));
      }
    } finally {
      setIsAddingTrack(false);
    }
  };

  const knownDurationMs = tracks.reduce(
    (sum, track) => sum + (typeof track.durationMs === "number" && track.durationMs > 0 ? track.durationMs : 0),
    0
  );
  const hasAnyKnownDuration = tracks.some((track) => typeof track.durationMs === "number" && track.durationMs > 0);
  const durationDisplay = tracks.length === 0 ? "0m" : hasAnyKnownDuration ? formatDurationTotal(knownDurationMs) : "Unknown";

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
      setTracks((prev) => prev.filter((t) => t.rowId !== track.rowId));
      if (track.rowId) delete trackMetadataCacheRef.current[track.rowId];
      delete trackMetadataCacheRef.current[track.id];
      setPlaylists((prev) =>
        prev.map((p: any) =>
          p.id === playlist.id
            ? { ...p, trackCount: Math.max(0, (p.trackCount || 1) - 1), lastUpdated: "Just now" }
            : p
        )
      );
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

  const handlePlaylistCoverSelect = async (event: any) => {
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

    if (!dataUrl || !playlist?.id) {
      toast.error("Failed to load image");
      return;
    }

    const updateAttempts: Array<() => Promise<{ error: any }>> = [
      () => supabase.from("playlists").update({ cover_image: dataUrl }).eq("id", playlist.id),
      () => supabase.from("collaborative_playlists").update({ cover_image: dataUrl }).eq("id", playlist.id),
      () => supabase.from("collaborative_playlists").update({ cover_url: dataUrl as any }).eq("id", playlist.id),
    ];

    let coverSaved = false;
    let lastError: any = null;

    for (const attempt of updateAttempts) {
      const { error } = await attempt();
      if (!error) {
        coverSaved = true;
        break;
      }
      if (isUndefinedColumnError(error)) {
        lastError = error;
        continue;
      }
      lastError = error;
    }

    setPlaylists((prev) =>
      prev.map((p: any) =>
        p.id === playlist.id
          ? { ...p, cover: dataUrl, lastUpdated: "Just now" }
          : p
      )
    );

    if (coverSaved) {
      toast.success("Playlist cover updated");
    } else {
      console.warn("Cover persisted only locally:", lastError);
      toast.warning("Cover updated for this session, but could not be saved to database.");
    }
  };

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

    if (!isPlaylistCreator) {
      toast.error("Only the playlist creator can invite collaborators");
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
          <div className="relative w-full md:w-48 h-48">
            <img
              src={playlist.cover}
              alt={playlist.title}
              className="w-full h-full object-cover rounded-xl shadow-lg"
            />
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePlaylistCoverSelect}
            />
            <Button
              size="sm"
              variant="outline"
              className="absolute bottom-2 right-2 bg-background/90 border-border"
              onClick={() => coverInputRef.current?.click()}
            >
              <Camera className="w-4 h-4 mr-1" />
              Cover
            </Button>
          </div>

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
                    {contributor.id === creatorId && (
                      <div className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground shadow">
                        Creator
                      </div>
                    )}
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">
                      {contributor.name}
                    </div>
                  </div>
                ))}
                {isPlaylistCreator ? (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="w-10 h-10 rounded-full border-2 border-dashed border-primary flex items-center justify-center hover:bg-primary/10 transition shadow-md hover:shadow-lg"
                  >
                    <UserPlus className="w-4 h-4 text-primary" />
                  </button>
                ) : (
                  <div className="text-xs text-muted-foreground px-2">Only the creator can add people</div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              {isPlaylistCreator ? (
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg hover:scale-105 transition-all"
                  onClick={() => setShowInviteModal(true)}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Friends
                </Button>
              ) : (
                <Button variant="outline" className="border-border text-muted-foreground" disabled>
                  Only creator can invite
                </Button>
              )}
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

      {/* Tracks */}
      <Tabs defaultValue="tracks" className="w-full">
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
                        src={track.addedByAvatar || '/placeholder-avatar.png'}
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
    </div>
  );
}
