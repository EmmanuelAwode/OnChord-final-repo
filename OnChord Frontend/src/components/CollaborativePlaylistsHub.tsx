import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Users, Plus, Music, Search, UserPlus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "./BackButton";
import { useProfile } from "../lib/useProfile";
import { getMutualFollows } from "../lib/api/follows";
import { getProfiles } from "../lib/api/profiles";
import { supabase } from "../lib/supabaseClient";

interface CollaborativePlaylistsHubProps {
  onNavigate?: (page: string) => void;
  onOpenPlaylist?: (playlistId: string) => void;
  playlists: any[];
  setPlaylists: (playlists: any[]) => void;
  onBack?: () => void;
  canGoBack?: boolean;
}

const nonFatalReadErrorCodes = new Set(["42P01", "PGRST205", "42P17"]);
let hasWarnedPolicyRecursion = false;
let forceLegacyCollabMode = false;

function isNonFatalReadError(error: any): boolean {
  return !!error && nonFatalReadErrorCodes.has(error.code);
}

function isPolicyRecursionError(error: any): boolean {
  return !!error && error.code === "42P17";
}

function warnOnceForPolicyRecursion(error: any): void {
  if (!error || !isPolicyRecursionError(error) || hasWarnedPolicyRecursion) {
    return;
  }

  forceLegacyCollabMode = true;
  hasWarnedPolicyRecursion = true;
  console.warn(
    "Collaborative playlist policy recursion detected (42P17). Using legacy playlist fallback mode until 021_fix_collab_policy_recursion.sql is applied."
  );
}

function formatLastUpdated(value: string | null | undefined): string {
  if (!value) return "Just now";

  const updated = new Date(value).getTime();
  if (Number.isNaN(updated)) return "Just now";

  const diffMs = Date.now() - updated;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes <= 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function CollaborativePlaylistsHub({ onNavigate, onOpenPlaylist, playlists, setPlaylists, onBack, canGoBack }: CollaborativePlaylistsHubProps) {
  const { profile } = useProfile();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [playlistTitle, setPlaylistTitle] = useState("");
  const [playlistDescription, setPlaylistDescription] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [friends, setFriends] = useState<Array<{ id: string; name: string; avatar: string }>>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  // Load playlists from DB so accepted invites show up as real collaborative lists.
  useEffect(() => {
    if (!profile?.id) {
      setPlaylists([]);
      return;
    }

    let active = true;

    async function loadPlaylistsFromDb() {
      const currentUserId = profile.id;

      type BasePlaylist = {
        id: string;
        title: string;
        description: string;
        cover: string;
        updatedAtRaw: string | null;
      };

      const basePlaylists = new Map<string, BasePlaylist>();
      const contributorIdsByPlaylist = new Map<string, Set<string>>();

      const ensureContributorSet = (playlistId: string) => {
        const existing = contributorIdsByPlaylist.get(playlistId);
        if (existing) return existing;
        const created = new Set<string>();
        contributorIdsByPlaylist.set(playlistId, created);
        return created;
      };

      const ensureBasePlaylist = (playlistId: string, fallback?: Partial<BasePlaylist>) => {
        const existing = basePlaylists.get(playlistId);
        if (existing) return existing;

        const created: BasePlaylist = {
          id: playlistId,
          title: fallback?.title || "Collaborative Playlist",
          description: fallback?.description || "A collaborative playlist",
          cover: fallback?.cover || `https://api.dicebear.com/7.x/shapes/svg?seed=${playlistId}`,
          updatedAtRaw: fallback?.updatedAtRaw || null,
        };
        basePlaylists.set(playlistId, created);
        return created;
      };

      const shouldQueryModernTables = !forceLegacyCollabMode;

      const [modernPlaylistsRes, modernCollaboratorsRes, legacyPlaylistsRes, legacyContributorsRes] =
        await Promise.all([
          shouldQueryModernTables
            ? supabase.from("collaborative_playlists").select("*").order("updated_at", { ascending: false })
            : Promise.resolve({ data: null, error: null } as any),
          shouldQueryModernTables
            ? supabase.from("playlist_collaborators").select("playlist_id,user_id")
            : Promise.resolve({ data: null, error: null } as any),
          supabase.from("playlists").select("*").order("updated_at", { ascending: false }),
          shouldQueryModernTables
            ? supabase.from("playlist_contributors").select("playlist_id,user_id")
            : Promise.resolve({ data: null, error: null } as any),
        ]);

      if (!modernPlaylistsRes.error && modernPlaylistsRes.data) {
        for (const row of modernPlaylistsRes.data as any[]) {
          const id = String(row.id || "");
          if (!id) continue;

          ensureBasePlaylist(id, {
            title: row.title || row.name || "Collaborative Playlist",
            description: row.description || "A collaborative playlist",
            cover: row.cover_url || row.cover_image || `https://api.dicebear.com/7.x/shapes/svg?seed=${id}`,
            updatedAtRaw: row.updated_at || row.created_at || null,
          });

          if (row.creator_id) ensureContributorSet(id).add(String(row.creator_id));
          if (row.created_by) ensureContributorSet(id).add(String(row.created_by));
        }
      } else if (modernPlaylistsRes.error) {
        warnOnceForPolicyRecursion(modernPlaylistsRes.error);
        if (!isNonFatalReadError(modernPlaylistsRes.error)) {
          console.error("Failed to load collaborative_playlists:", modernPlaylistsRes.error);
        }
      }

      if (!modernCollaboratorsRes.error && modernCollaboratorsRes.data) {
        for (const row of modernCollaboratorsRes.data as any[]) {
          const playlistId = String(row.playlist_id || "");
          const userId = String(row.user_id || "");
          if (!playlistId || !userId) continue;

          ensureBasePlaylist(playlistId);
          ensureContributorSet(playlistId).add(userId);
        }
      } else if (modernCollaboratorsRes.error) {
        warnOnceForPolicyRecursion(modernCollaboratorsRes.error);
        if (!isNonFatalReadError(modernCollaboratorsRes.error)) {
          console.error("Failed to load playlist_collaborators:", modernCollaboratorsRes.error);
        }
      }

      if (!legacyPlaylistsRes.error && legacyPlaylistsRes.data) {
        for (const row of legacyPlaylistsRes.data as any[]) {
          const id = String(row.id || "");
          if (!id) continue;

          ensureBasePlaylist(id, {
            title: row.title || row.name || "Collaborative Playlist",
            description: row.description || "A collaborative playlist",
            cover: row.cover_url || row.cover_image || `https://api.dicebear.com/7.x/shapes/svg?seed=${id}`,
            updatedAtRaw: row.updated_at || row.created_at || null,
          });

          if (row.creator_id) ensureContributorSet(id).add(String(row.creator_id));
          if (Array.isArray(row.collaborators)) {
            for (const collaboratorId of row.collaborators) {
              if (collaboratorId) ensureContributorSet(id).add(String(collaboratorId));
            }
          }
        }
      } else if (legacyPlaylistsRes.error) {
        warnOnceForPolicyRecursion(legacyPlaylistsRes.error);
        if (!isNonFatalReadError(legacyPlaylistsRes.error)) {
          console.error("Failed to load playlists:", legacyPlaylistsRes.error);
        }
      }

      if (!legacyContributorsRes.error && legacyContributorsRes.data) {
        for (const row of legacyContributorsRes.data as any[]) {
          const playlistId = String(row.playlist_id || "");
          const userId = String(row.user_id || "");
          if (!playlistId || !userId) continue;

          ensureBasePlaylist(playlistId);
          ensureContributorSet(playlistId).add(userId);
        }
      } else if (legacyContributorsRes.error) {
        warnOnceForPolicyRecursion(legacyContributorsRes.error);
        if (!isNonFatalReadError(legacyContributorsRes.error)) {
          console.error("Failed to load playlist_contributors:", legacyContributorsRes.error);
        }
      }

      // Only keep playlists where current user is a contributor/member.
      const playlistIds = Array.from(basePlaylists.keys()).filter((id) =>
        (contributorIdsByPlaylist.get(id) || new Set<string>()).has(currentUserId)
      );

      if (playlistIds.length === 0) {
        if (active) setPlaylists([]);
        return;
      }

      const [pendingInvitesRes, trackRowsRes] = await Promise.all([
        supabase
          .from("notifications")
          .select("playlist_id")
          .eq("type", "playlist_invite")
          .eq("action_user_id", currentUserId)
          .eq("is_read", false),
        supabase.from("playlist_tracks").select("playlist_id").in("playlist_id", playlistIds),
      ]);

      const pendingByPlaylist = new Map<string, number>();
      if (!pendingInvitesRes.error && pendingInvitesRes.data) {
        for (const row of pendingInvitesRes.data as any[]) {
          const playlistId = String(row.playlist_id || "");
          if (!playlistId) continue;
          pendingByPlaylist.set(playlistId, (pendingByPlaylist.get(playlistId) || 0) + 1);
        }
      }

      const tracksByPlaylist = new Map<string, number>();
      if (!trackRowsRes.error && trackRowsRes.data) {
        for (const row of trackRowsRes.data as any[]) {
          const playlistId = String(row.playlist_id || "");
          if (!playlistId) continue;
          tracksByPlaylist.set(playlistId, (tracksByPlaylist.get(playlistId) || 0) + 1);
        }
      }

      const allContributorIds = Array.from(
        new Set(
          playlistIds.flatMap((id) => Array.from(contributorIdsByPlaylist.get(id) || new Set<string>()))
        )
      );

      let profilesById = new Map<string, any>();
      if (allContributorIds.length > 0) {
        try {
          const profileRows = await getProfiles(allContributorIds);
          profilesById = new Map(profileRows.map((p) => [p.id, p]));
        } catch (error) {
          console.error("Failed to load collaborator profiles:", error);
        }
      }

      const normalized = playlistIds
        .map((id) => {
          const base = basePlaylists.get(id)!;
          const contributorIds = Array.from(contributorIdsByPlaylist.get(id) || new Set<string>());
          const contributors = contributorIds.map((userId) => {
            const contributorProfile = profilesById.get(userId);
            return {
              id: userId,
              name:
                contributorProfile?.display_name ||
                contributorProfile?.username ||
                (userId === currentUserId
                  ? profile?.display_name || profile?.username || "You"
                  : "Collaborator"),
              avatar:
                contributorProfile?.avatar_url ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
            };
          });

          return {
            id: base.id,
            title: base.title,
            description: base.description,
            cover: base.cover,
            trackCount: tracksByPlaylist.get(id) || 0,
            pendingInviteCount: pendingByPlaylist.get(id) || 0,
            contributors:
              contributors.length > 0
                ? contributors
                : [
                    {
                      id: currentUserId,
                      name: profile?.display_name || profile?.username || "You",
                      avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserId}`,
                    },
                  ],
            lastUpdated: formatLastUpdated(base.updatedAtRaw),
            moods: ["Collaborative", "Fresh", "New"],
            updatedAtRaw: base.updatedAtRaw || new Date(0).toISOString(),
          };
        })
        .sort(
          (a, b) =>
            new Date(b.updatedAtRaw || 0).getTime() - new Date(a.updatedAtRaw || 0).getTime()
        )
        .map(({ updatedAtRaw, ...playlistData }) => playlistData);

      if (active) {
        setPlaylists(normalized);
      }
    }

    loadPlaylistsFromDb();

    const syncChannel = supabase
      .channel(`collab_playlists_sync_${profile.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "playlist_collaborators" }, loadPlaylistsFromDb)
      .on("postgres_changes", { event: "*", schema: "public", table: "playlist_contributors" }, loadPlaylistsFromDb)
      .on("postgres_changes", { event: "*", schema: "public", table: "collaborative_playlists" }, loadPlaylistsFromDb)
      .on("postgres_changes", { event: "*", schema: "public", table: "playlists" }, loadPlaylistsFromDb)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${profile.id}` },
        loadPlaylistsFromDb
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(syncChannel);
    };
  }, [profile?.id, profile?.display_name, profile?.username, profile?.avatar_url, setPlaylists]);

  // Fetch invite candidates (mutual follows only)
  useEffect(() => {
    if (!showCreateModal) {
      return;
    }

    let active = true;

    async function loadMutualFollowProfiles() {
      setIsLoadingFriends(true);
      try {
        const mutualFollowIds = await getMutualFollows();

        if (!active) return;

        if (mutualFollowIds.length === 0) {
          setFriends([]);
          return;
        }

        const followingProfiles = await getProfiles(mutualFollowIds);

        if (!active) return;

        setFriends(
          followingProfiles.map((f) => ({
            id: f.id,
            name: f.display_name || f.username || "Music Lover",
            avatar: f.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.id}`,
          }))
        );
      } catch (error) {
        console.error("Failed to load mutual follow profiles:", error);
        if (active) setFriends([]);
      } finally {
        if (active) setIsLoadingFriends(false);
      }
    }

    loadMutualFollowProfiles();

    return () => {
      active = false;
    };
  }, [showCreateModal]);

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleCreatePlaylist = async () => {
    if (!playlistTitle.trim()) {
      toast.error("Please enter a playlist title");
      return;
    }
    if (selectedFriends.length === 0) {
      toast.error("Please select at least one friend to collaborate with");
      return;
    }

    const mutualFollowIds = await getMutualFollows(500, 0);
    const mutualFollowSet =
      mutualFollowIds.length > 0
        ? new Set(mutualFollowIds)
        : new Set(friends.map((friend) => friend.id));
    const eligibleSelectedFriends = selectedFriends.filter((id) => mutualFollowSet.has(id));

    if (eligibleSelectedFriends.length === 0) {
      toast.error("You can only invite users who follow you back.");
      return;
    }

    if (eligibleSelectedFriends.length !== selectedFriends.length) {
      toast.warning("Some selected users are no longer mutual followers and were removed.");
      setSelectedFriends(eligibleSelectedFriends);
    }

    const selectedCollaborators = eligibleSelectedFriends
      .map((friendId) => friends.find((f) => f.id === friendId))
      .filter((f): f is { id: string; name: string; avatar: string } => !!f);

    if (selectedCollaborators.length === 0) {
      toast.error("Could not resolve selected collaborators. Please try again.");
      return;
    }

    setIsCreatingPlaylist(true);

    let playlistDbId: string | null = null;
    let createdInTable: "collaborative_playlists" | "playlists" = "collaborative_playlists";

    try {
      const { data: session } = await supabase.auth.getSession();
      const currentUserId = session.session?.user?.id;

      if (!currentUserId) {
        toast.error("Please sign in to create a collaborative playlist");
        return;
      }

      // Create playlist in DB (supports legacy and newer schema variants).
      const playlistDescriptionText = playlistDescription || "A new collaborative playlist";
      const coverSeedUrl = `https://api.dicebear.com/7.x/shapes/svg?seed=${Date.now()}`;
      const generatedPlaylistId = crypto.randomUUID();

      const modernCreateAttempts: Array<{
        table: "collaborative_playlists";
        payload: Record<string, unknown>;
      }> = [
        {
          table: "collaborative_playlists",
          payload: {
            id: generatedPlaylistId,
            title: playlistTitle,
            description: playlistDescriptionText,
            cover_url: coverSeedUrl,
            created_by: currentUserId,
            creator_id: currentUserId,
          },
        },
        {
          table: "collaborative_playlists",
          payload: {
            id: generatedPlaylistId,
            name: playlistTitle,
            description: playlistDescriptionText,
            cover_image: coverSeedUrl,
            creator_id: currentUserId,
            is_public: false,
          },
        },
        {
          table: "collaborative_playlists",
          payload: {
            id: generatedPlaylistId,
            title: playlistTitle,
            description: playlistDescriptionText,
            cover_url: coverSeedUrl,
            created_by: currentUserId,
          },
        },
      ];

      const legacyCreateAttempts: Array<{
        table: "playlists";
        payload: Record<string, unknown>;
      }> = [
        {
          table: "playlists",
          payload: {
            id: generatedPlaylistId,
            name: playlistTitle,
            description: playlistDescriptionText,
            cover_image: coverSeedUrl,
            creator_id: currentUserId,
            collaborators: [],
            is_public: false,
          },
        },
        {
          table: "playlists",
          payload: {
            id: generatedPlaylistId,
            name: playlistTitle,
            description: playlistDescriptionText,
            cover_image: coverSeedUrl,
            creator_id: currentUserId,
          },
        },
      ];

      const createAttempts: Array<{
        table: "collaborative_playlists" | "playlists";
        payload: Record<string, unknown>;
      }> = forceLegacyCollabMode
        ? [...legacyCreateAttempts, ...modernCreateAttempts]
        : [...modernCreateAttempts, ...legacyCreateAttempts];

      let createdPlaylistId: string | null = null;
      const createErrors: string[] = [];

      for (const attempt of createAttempts) {
        const { error: playlistError } = await supabase
          .from(attempt.table)
          .insert(attempt.payload);

        if (!playlistError) {
          createdPlaylistId = generatedPlaylistId;
          createdInTable = attempt.table;
          break;
        }

        if (isPolicyRecursionError(playlistError)) {
          forceLegacyCollabMode = true;
        }

        createErrors.push(
          `${attempt.table}: ${playlistError.code || "ERR"} ${playlistError.message || "Unknown error"}`
        );
      }

      if (!createdPlaylistId) {
        throw new Error(`Could not create playlist with current database schema. ${createErrors.join(" | ")}`);
      }

      playlistDbId = createdPlaylistId;

      if (createdInTable === "collaborative_playlists") {
        let shouldMirrorToLegacyTable = false;

        // Try to backfill creator_id for schemas that support it.
        const { error: creatorBackfillError } = await supabase
          .from("collaborative_playlists")
          .update({ creator_id: currentUserId })
          .eq("id", playlistDbId);

        if (isPolicyRecursionError(creatorBackfillError)) {
          forceLegacyCollabMode = true;
          shouldMirrorToLegacyTable = true;
        }

        // Add creator as an initial contributor. Ignore failures if trigger already handled owner row.
        const { error: collaboratorInsertError } = await supabase.from("playlist_collaborators").upsert(
          {
            playlist_id: playlistDbId,
            user_id: currentUserId,
            role: "owner",
          },
          { onConflict: "playlist_id,user_id" }
        );

        if (collaboratorInsertError) {
          if (isPolicyRecursionError(collaboratorInsertError)) {
            forceLegacyCollabMode = true;
            shouldMirrorToLegacyTable = true;
          } else {
            const { error: contributorInsertError } = await supabase.from("playlist_contributors").upsert(
              {
                playlist_id: playlistDbId,
                user_id: currentUserId,
              },
              { onConflict: "playlist_id,user_id" }
            );

            if (contributorInsertError) {
              if (isPolicyRecursionError(contributorInsertError)) {
                forceLegacyCollabMode = true;
                shouldMirrorToLegacyTable = true;
              }
              console.warn("Could not insert owner collaborator row:", collaboratorInsertError, contributorInsertError);
            }
          }
        }

        if (shouldMirrorToLegacyTable) {
          const { error: legacyMirrorError } = await supabase.from("playlists").upsert(
            {
              id: playlistDbId,
              name: playlistTitle,
              description: playlistDescriptionText,
              cover_image: coverSeedUrl,
              creator_id: currentUserId,
              collaborators: [currentUserId],
              is_public: false,
            },
            { onConflict: "id" }
          );

          if (legacyMirrorError) {
            console.warn("Could not mirror collaborative playlist to legacy table:", legacyMirrorError);
          }
        }
      } else {
        // Legacy table path: ensure creator is in collaborators array.
        const { data: playlistRow } = await supabase
          .from("playlists")
          .select("collaborators")
          .eq("id", playlistDbId)
          .maybeSingle();

        const existingCollaborators: string[] = Array.isArray(playlistRow?.collaborators)
          ? playlistRow.collaborators
          : [];

        const updatedCollaborators = Array.from(new Set([...existingCollaborators, currentUserId]));

        await supabase
          .from("playlists")
          .update({ collaborators: updatedCollaborators })
          .eq("id", playlistDbId);
      }

      // Send invite notifications to selected collaborators.
      const inviterName = profile?.display_name || profile?.username || "A user";
      const inviterAvatar = profile?.avatar_url || null;

      const inviteRows = selectedCollaborators.map((collab) => ({
        user_id: collab.id,
        type: "playlist_invite",
        title: "Playlist collaboration invite",
        message: `${inviterName} invited you to collaborate on \"${playlistTitle}\".`,
        action_user_id: currentUserId,
        action_user_name: inviterName,
        action_user_avatar: inviterAvatar,
        playlist_id: playlistDbId,
        is_read: false,
      }));

      const { error: inviteError } = await supabase.from("notifications").insert(inviteRows);
      if (inviteError) throw inviteError;
    } catch (error) {
      console.error("Failed to create collaborative playlist invites:", error);
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message || "Please try again.")
          : "Please try again.";
      toast.error(`Failed to create playlist invites: ${message}`);
      return;
    } finally {
      setIsCreatingPlaylist(false);
    }

    // Create new playlist object
    const newPlaylist = {
      id: playlistDbId || `collab-${Date.now()}`,
      title: playlistTitle,
      description: playlistDescription || "A new collaborative playlist",
      cover: `https://api.dicebear.com/7.x/shapes/svg?seed=${Date.now()}`,
      trackCount: 0,
      pendingInviteCount: selectedCollaborators.length,
      contributors: [
        {
          id: profile?.id || "current-user",
          name: profile?.display_name || profile?.username || "You",
          avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=user`,
        },
      ],
      lastUpdated: "Just now",
      moods: ["New", "Fresh", "Collaborative"],
    };

    // Add to the beginning of the playlists array
    setPlaylists([newPlaylist, ...playlists]);

    toast.success(
      `Invites sent to ${selectedCollaborators.length} collaborator${selectedCollaborators.length > 1 ? 's' : ''}!`
    );
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
                    {(playlist.pendingInviteCount || 0) > 0 && (
                      <Badge className="bg-amber-500/20 text-amber-400 border-0 text-[10px] ml-1">
                        {playlist.pendingInviteCount} pending
                      </Badge>
                    )}
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
                {isLoadingFriends && (
                  <div className="p-4 text-center text-sm text-muted-foreground">Loading mutual followers...</div>
                )}

                {!isLoadingFriends && friends.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground border border-border rounded-lg bg-background">
                    No mutual followers found yet. You can invite users only when you follow each other.
                  </div>
                )}

                {!isLoadingFriends && friends.map((friend) => (
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
              disabled={isCreatingPlaylist || isLoadingFriends}
              className="flex-1 bg-gradient-to-r from-primary to-accent"
            >
              {isCreatingPlaylist ? "Sending Invites..." : "Create Playlist"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}