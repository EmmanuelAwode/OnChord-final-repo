// Typing indicator hook using Supabase Presence
import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

export interface TypingUser {
  userId: string;
  userName: string;
  userAvatar: string;
  timestamp: string;
}

interface UseTypingIndicatorOptions {
  contextId: string; // reviewId, messageThreadId, etc.
  contextType: 'review' | 'message' | 'comment';
}

export function useTypingIndicator({ contextId, contextType }: UseTypingIndicatorOptions) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    if (!contextId) return;

    const userId = localStorage.getItem('userId') || 'user-1';
    const channelName = `typing:${contextType}:${contextId}`;

    const typingChannel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    typingChannel
      .on('presence', { event: 'sync' }, () => {
        const state = typingChannel.presenceState();
        updateTypingUsers(state, userId);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // User started typing
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        // User stopped typing
      })
      .subscribe();

    setChannel(typingChannel);

    return () => {
      typingChannel.untrack();
      supabase.removeChannel(typingChannel);
    };
  }, [contextId, contextType]);

  // Broadcast that user is typing
  const startTyping = useCallback(async () => {
    if (!channel) return;

    const userId = localStorage.getItem('userId') || 'user-1';
    const userName = localStorage.getItem('userName') || 'You';
    const userAvatar = localStorage.getItem('userAvatar') || '';

    try {
      await channel.track({
        user_id: userId,
        user_name: userName,
        user_avatar: userAvatar,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to start typing indicator:', err);
    }
  }, [channel]);

  // Stop broadcasting typing status
  const stopTyping = useCallback(async () => {
    if (!channel) return;

    try {
      await channel.untrack();
    } catch (err) {
      console.error('Failed to stop typing indicator:', err);
    }
  }, [channel]);

  function updateTypingUsers(presenceState: any, currentUserId: string) {
    const users: TypingUser[] = [];
    const now = Date.now();
    const TYPING_TIMEOUT = 5000; // 5 seconds

    Object.keys(presenceState).forEach((key) => {
      // Don't show current user as typing
      if (key === currentUserId) return;

      const presences = presenceState[key];
      if (presences && presences.length > 0) {
        const latest = presences[0];
        const timestamp = new Date(latest.timestamp).getTime();
        
        // Only show users who have typed in the last 5 seconds
        if (now - timestamp < TYPING_TIMEOUT) {
          users.push({
            userId: latest.user_id,
            userName: latest.user_name,
            userAvatar: latest.user_avatar,
            timestamp: latest.timestamp,
          });
        }
      }
    });

    setTypingUsers(users);
  }

  // Format typing indicator text
  function formatTypingText(): string {
    if (typingUsers.length === 0) return '';
    if (typingUsers.length === 1) return `${typingUsers[0].userName} is typing...`;
    if (typingUsers.length === 2) {
      return `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing...`;
    }
    return `${typingUsers[0].userName}, ${typingUsers[1].userName}, and ${
      typingUsers.length - 2
    } ${typingUsers.length - 2 === 1 ? 'other' : 'others'} are typing...`;
  }

  return {
    typingUsers,
    typingText: formatTypingText(),
    isAnyoneTyping: typingUsers.length > 0,
    startTyping,
    stopTyping,
  };
}

// Hook for managing typing indicator in textarea/input
export function useTypingBroadcast(
  contextId: string,
  contextType: 'review' | 'message' | 'comment'
) {
  const { startTyping, stopTyping } = useTypingIndicator({ contextId, contextType });
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleTyping = useCallback(() => {
    // Start typing indicator
    startTyping();

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Stop typing after 3 seconds of inactivity
    const timeout = setTimeout(() => {
      stopTyping();
    }, 3000);

    setTypingTimeout(timeout);
  }, [startTyping, stopTyping, typingTimeout]);

  const handleStopTyping = useCallback(() => {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    stopTyping();
  }, [stopTyping, typingTimeout]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      stopTyping();
    };
  }, []);

  return {
    handleTyping,
    handleStopTyping,
  };
}
