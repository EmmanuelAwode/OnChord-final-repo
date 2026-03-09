// Real-time activity feed hook using Supabase Realtime
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { fixSpotifyImageUrl } from '../components/ui/utils';

export interface Activity {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  type: 'review' | 'listening' | 'playlist_add' | 'like' | 'follow';
  action: string;
  albumTitle?: string;
  albumArtist?: string;
  albumCover?: string;
  trackTitle?: string;
  rating?: number;
  timestamp: string;
  createdAt: string;
  isLive?: boolean;
}

export function useRealtimeActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [liveListeners, setLiveListeners] = useState<Map<string, Activity>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load initial activities
  useEffect(() => {
    loadActivities();
  }, []);

  // Subscribe to real-time activity updates
  useEffect(() => {
    const userId = localStorage.getItem('userId') || 'user-1';
    
    // Subscribe to new activities from friends
    const activityChannel = supabase
      .channel('friend_activities')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activities',
        },
        (payload) => {
          const newActivity = transformActivity(payload.new);
          setActivities((prev) => [newActivity, ...prev.slice(0, 99)]);
        }
      )
      .subscribe();

    // Subscribe to live listening updates (presence channel)
    const presenceChannel = supabase
      .channel('online_listeners', {
        config: {
          presence: {
            key: userId,
          },
        },
      })
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        updateLiveListeners(state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // User joined
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        setLiveListeners((prev) => {
          const updated = new Map(prev);
          updated.delete(key);
          return updated;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(activityChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, []);

  // Broadcast current listening status
  async function broadcastListening(track: {
    title: string;
    artist: string;
    albumCover: string;
  }) {
    try {
      const userId = localStorage.getItem('userId') || 'user-1';
      const userName = localStorage.getItem('userName') || 'You';
      const userAvatar = localStorage.getItem('userAvatar') || '';

      const channel = supabase.channel('online_listeners');
      await channel.track({
        user_id: userId,
        user_name: userName,
        user_avatar: userAvatar,
        track_title: track.title,
        track_artist: track.artist,
        album_cover: track.albumCover,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to broadcast listening status:', err);
    }
  }

  async function loadActivities() {
    try {
      setIsLoading(true);
      const userId = localStorage.getItem('userId') || 'user-1';
      
      // Get friend IDs (in production, this would come from a friends table)
      const { data, error: fetchError } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;

      const transformedActivities = data?.map(transformActivity) || [];
      setActivities(transformedActivities);
      setError(null);
    } catch (err) {
      console.error('Failed to load activities:', err);
      setError(err as Error);
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  }

  function transformActivity(data: any): Activity {
    return {
      id: data.id,
      userId: data.user_id,
      userName: data.user_name,
      userAvatar: data.user_avatar,
      type: data.type,
      action: data.action,
      albumTitle: data.album_title,
      albumArtist: data.album_artist,
      albumCover: fixSpotifyImageUrl(data.album_cover),
      trackTitle: data.track_title,
      rating: data.rating,
      timestamp: formatTimestamp(data.created_at),
      createdAt: data.created_at,
    };
  }

  function updateLiveListeners(presenceState: any) {
    const listeners = new Map<string, Activity>();
    
    Object.keys(presenceState).forEach((key) => {
      const presences = presenceState[key];
      if (presences && presences.length > 0) {
        const latest = presences[0];
        listeners.set(key, {
          id: `live-${key}`,
          userId: latest.user_id,
          userName: latest.user_name,
          userAvatar: latest.user_avatar,
          type: 'listening',
          action: `is listening to ${latest.track_title}`,
          trackTitle: latest.track_title,
          albumArtist: latest.track_artist,
          albumCover: fixSpotifyImageUrl(latest.album_cover),
          timestamp: 'Now',
          createdAt: latest.timestamp,
          isLive: true,
        });
      }
    });
    
    setLiveListeners(listeners);
  }

  function formatTimestamp(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  }

  return {
    activities,
    liveListeners: Array.from(liveListeners.values()),
    isLoading,
    error,
    broadcastListening,
    reload: loadActivities,
  };
}
