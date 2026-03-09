// Real-time collaborative playlist hook using Supabase Realtime
import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { fixSpotifyImageUrl } from '../components/ui/utils';

export interface PlaylistTrack {
  id: string;
  trackId: string;
  trackTitle: string;
  trackArtist: string;
  albumCover: string;
  addedBy: string;
  addedByName: string;
  addedByAvatar: string;
  addedAt: string;
  position: number;
}

export interface PlaylistUpdate {
  id: string;
  playlistId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  action: 'add' | 'remove' | 'reorder';
  trackTitle?: string;
  trackArtist?: string;
  timestamp: string;
}

export interface CollaborativePlaylist {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  creatorId: string;
  tracks: PlaylistTrack[];
  collaborators: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UseCollaborativePlaylistOptions {
  playlistId: string;
  enabled?: boolean;
}

export function useCollaborativePlaylist({
  playlistId,
  enabled = true,
}: UseCollaborativePlaylistOptions) {
  const [playlist, setPlaylist] = useState<CollaborativePlaylist | null>(null);
  const [recentUpdates, setRecentUpdates] = useState<PlaylistUpdate[]>([]);
  const [activeCollaborators, setActiveCollaborators] = useState<Map<string, any>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load playlist data
  useEffect(() => {
    if (!enabled || !playlistId) return;
    loadPlaylist();
  }, [playlistId, enabled]);

  // Subscribe to real-time playlist changes
  useEffect(() => {
    if (!enabled || !playlistId) return;

    const userId = localStorage.getItem('userId') || 'user-1';
    const userName = localStorage.getItem('userName') || 'You';
    const userAvatar = localStorage.getItem('userAvatar') || '';

    // Subscribe to playlist track changes
    const playlistChannel = supabase
      .channel(`playlist:${playlistId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'playlist_tracks',
          filter: `playlist_id=eq.${playlistId}`,
        },
        (payload) => {
          handleTrackAdded(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'playlist_tracks',
          filter: `playlist_id=eq.${playlistId}`,
        },
        (payload) => {
          handleTrackRemoved(payload.old);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'playlist_tracks',
          filter: `playlist_id=eq.${playlistId}`,
        },
        (payload) => {
          handleTrackUpdated(payload.new);
        }
      )
      .subscribe();

    // Subscribe to presence (active collaborators)
    const presenceChannel = supabase.channel(`playlist:${playlistId}:presence`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        updateActiveCollaborators(state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // Collaborator joined
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        // Collaborator left
      })
      .subscribe();

    // Track presence
    presenceChannel.track({
      user_id: userId,
      user_name: userName,
      user_avatar: userAvatar,
      online_at: new Date().toISOString(),
    });

    return () => {
      presenceChannel.untrack();
      supabase.removeChannel(playlistChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [playlistId, enabled]);

  async function loadPlaylist() {
    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('collaborative_playlists')
        .select(
          `
          *,
          tracks:playlist_tracks(
            *,
            profiles:added_by(id, username, full_name, avatar_url)
          ),
          collaborators:playlist_collaborators(user_id, role)
        `
        )
        .eq('id', playlistId)
        .single();

      if (fetchError) throw fetchError;

      const transformedPlaylist = transformPlaylist(data);
      setPlaylist(transformedPlaylist);
      setError(null);
    } catch (err) {
      console.error('Failed to load playlist:', err);
      setError(err as Error);
      setPlaylist(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function addTrack(track: {
    trackId: string;
    trackTitle: string;
    trackArtist: string;
    albumCover: string;
  }) {
    if (!playlist) return;

    const userId = localStorage.getItem('userId') || 'user-1';
    const userName = localStorage.getItem('userName') || 'You';
    const userAvatar = localStorage.getItem('userAvatar') || '';

    // Optimistic update
    const newTrack: PlaylistTrack = {
      id: `temp-${Date.now()}`,
      ...track,
      addedBy: userId,
      addedByName: userName,
      addedByAvatar: userAvatar,
      addedAt: new Date().toISOString(),
      position: playlist.tracks.length,
    };

    setPlaylist((prev) =>
      prev ? { ...prev, tracks: [...prev.tracks, newTrack] } : null
    );

    // Add update notification
    addUpdateNotification({
      action: 'add',
      userName,
      userAvatar,
      trackTitle: track.trackTitle,
      trackArtist: track.trackArtist,
    });

    try {
      setIsSyncing(true);
      const { error: insertError } = await supabase.from('playlist_tracks').insert({
        playlist_id: playlistId,
        track_id: track.trackId,
        track_title: track.trackTitle,
        track_artist: track.trackArtist,
        album_cover: track.albumCover,
        added_by: userId,
        position: playlist.tracks.length,
      });

      if (insertError) throw insertError;
    } catch (err) {
      console.error('Failed to add track:', err);
      // Revert optimistic update on error
      setPlaylist((prev) =>
        prev
          ? {
              ...prev,
              tracks: prev.tracks.filter((t) => t.id !== newTrack.id),
            }
          : null
      );
    } finally {
      setIsSyncing(false);
    }
  }

  async function removeTrack(trackId: string) {
    if (!playlist) return;

    const track = playlist.tracks.find((t) => t.id === trackId);
    if (!track) return;

    const userId = localStorage.getItem('userId') || 'user-1';
    const userName = localStorage.getItem('userName') || 'You';
    const userAvatar = localStorage.getItem('userAvatar') || '';

    // Optimistic update
    setPlaylist((prev) =>
      prev
        ? {
            ...prev,
            tracks: prev.tracks.filter((t) => t.id !== trackId),
          }
        : null
    );

    // Add update notification
    addUpdateNotification({
      action: 'remove',
      userName,
      userAvatar,
      trackTitle: track.trackTitle,
      trackArtist: track.trackArtist,
    });

    try {
      setIsSyncing(true);
      const { error: deleteError } = await supabase
        .from('playlist_tracks')
        .delete()
        .eq('id', trackId);

      if (deleteError) throw deleteError;
    } catch (err) {
      console.error('Failed to remove track:', err);
      // Revert optimistic update on error
      loadPlaylist();
    } finally {
      setIsSyncing(false);
    }
  }

  async function reorderTracks(newOrder: PlaylistTrack[]) {
    if (!playlist) return;

    const userId = localStorage.getItem('userId') || 'user-1';
    const userName = localStorage.getItem('userName') || 'You';
    const userAvatar = localStorage.getItem('userAvatar') || '';

    const previousTracks = playlist.tracks;

    // Optimistic update
    setPlaylist((prev) => (prev ? { ...prev, tracks: newOrder } : null));

    // Add update notification
    addUpdateNotification({
      action: 'reorder',
      userName,
      userAvatar,
    });

    try {
      setIsSyncing(true);
      // Update positions in database
      const updates = newOrder.map((track, index) => ({
        id: track.id,
        position: index,
      }));

      for (const update of updates) {
        await supabase
          .from('playlist_tracks')
          .update({ position: update.position })
          .eq('id', update.id);
      }
    } catch (err) {
      console.error('Failed to reorder tracks:', err);
      // Revert optimistic update on error
      setPlaylist((prev) => (prev ? { ...prev, tracks: previousTracks } : null));
    } finally {
      setIsSyncing(false);
    }
  }

  function handleTrackAdded(data: any) {
    const newTrack: PlaylistTrack = {
      id: data.id,
      trackId: data.track_id,
      trackTitle: data.track_title,
      trackArtist: data.track_artist,
      albumCover: fixSpotifyImageUrl(data.album_cover),
      addedBy: data.added_by,
      addedByName: data.added_by_name,
      addedByAvatar: data.added_by_avatar,
      addedAt: data.added_at,
      position: data.position,
    };

    setPlaylist((prev) =>
      prev ? { ...prev, tracks: [...prev.tracks, newTrack] } : null
    );
  }

  function handleTrackRemoved(data: any) {
    setPlaylist((prev) =>
      prev
        ? {
            ...prev,
            tracks: prev.tracks.filter((t) => t.id !== data.id),
          }
        : null
    );
  }

  function handleTrackUpdated(data: any) {
    setPlaylist((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        tracks: prev.tracks.map((track) =>
          track.id === data.id ? { ...track, position: data.position } : track
        ),
      };
    });
  }

  function updateActiveCollaborators(presenceState: any) {
    const collaborators = new Map<string, any>();
    
    Object.keys(presenceState).forEach((key) => {
      const presences = presenceState[key];
      if (presences && presences.length > 0) {
        collaborators.set(key, presences[0]);
      }
    });
    
    setActiveCollaborators(collaborators);
  }

  function addUpdateNotification(update: {
    action: 'add' | 'remove' | 'reorder';
    userName: string;
    userAvatar: string;
    trackTitle?: string;
    trackArtist?: string;
  }) {
    const userId = localStorage.getItem('userId') || 'user-1';
    
    const newUpdate: PlaylistUpdate = {
      id: `update-${Date.now()}`,
      playlistId,
      userId,
      userName: update.userName,
      userAvatar: update.userAvatar,
      action: update.action,
      trackTitle: update.trackTitle,
      trackArtist: update.trackArtist,
      timestamp: new Date().toISOString(),
    };

    setRecentUpdates((prev) => [newUpdate, ...prev.slice(0, 19)]);

    // Remove update after 5 seconds
    setTimeout(() => {
      setRecentUpdates((prev) => prev.filter((u) => u.id !== newUpdate.id));
    }, 5000);
  }

  function transformPlaylist(data: any): CollaborativePlaylist {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      coverImage: fixSpotifyImageUrl(data.cover_image),
      creatorId: data.creator_id,
      tracks:
        data.tracks?.map((t: any) => ({
          id: t.id,
          trackId: t.track_id,
          trackTitle: t.track_title,
          trackArtist: t.track_artist,
          albumCover: fixSpotifyImageUrl(t.album_cover),
          addedBy: t.added_by,
          addedByName: t.profiles?.full_name || t.profiles?.username || 'Unknown',
          addedByAvatar: t.profiles?.avatar_url || '',
          addedAt: t.added_at,
          position: t.position,
        })) || [],
      collaborators: data.collaborators?.map((c: any) => c.user_id) || [],
      isPublic: data.is_public,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  return {
    playlist,
    recentUpdates,
    activeCollaborators: Array.from(activeCollaborators.values()),
    isLoading,
    isSyncing,
    error,
    addTrack,
    removeTrack,
    reorderTracks,
    reload: loadPlaylist,
  };
}
