// Real-time notifications hook using Supabase Realtime
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { formatDateForDisplay } from './localeFormatting';

export interface Notification {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'playlist_invite' | 'review_reply';
  title: string;
  message: string;
  actionUserId?: string;
  actionUserName?: string;
  actionUserAvatar?: string;
  reviewId?: string;
  playlistId?: string;
  isRead: boolean;
  timestamp: string;
  createdAt: string;
}

export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user ID from Supabase auth
  useEffect(() => {
    const getUser = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setCurrentUserId(session.user.id);
      } else if (error) {
        console.error('Failed to get auth session:', error);
      }
    };
    getUser();
  }, []);

  // Load initial notifications
  useEffect(() => {
    if (currentUserId) {
      loadNotifications();
    }
  }, [currentUserId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!currentUserId) return;
    
    // Subscribe to new notifications for this user only
    const channel = supabase
      .channel(`notifications-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`, // Only this user's notifications
        },
        (payload) => {
          const newNotification = transformNotification(payload.new);
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
          
          // Show browser notification if permitted
          showBrowserNotification(newNotification);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`, // Only this user's notifications
        },
        (payload) => {
          const updatedNotification = transformNotification(payload.new);
          setNotifications((prev) =>
            prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
          );
          
          // Update unread count
          if (updatedNotification.isRead) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  async function loadNotifications() {
    if (!currentUserId) return;
    
    try {
      setIsLoading(true);
      
      // Only fetch notifications for the current user
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      const transformedNotifications = data?.map(transformNotification) || [];
      
      setNotifications(transformedNotifications);
      setUnreadCount(transformedNotifications.filter((n) => !n.isRead).length);
      setError(null);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError(err as Error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }

  async function markAsRead(notificationId: string) {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (updateError) throw updateError;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }

  async function markAllAsRead() {
    if (!currentUserId) return;
    
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', currentUserId)
        .eq('is_read', false);

      if (updateError) throw updateError;

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }

  async function deleteNotification(notificationId: string) {
    try {
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (deleteError) throw deleteError;

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  }

  function transformNotification(data: any): Notification {
    return {
      id: data.id,
      userId: data.user_id,
      type: data.type,
      title: data.title,
      message: data.message,
      actionUserId: data.action_user_id,
      actionUserName: data.action_user_name,
      actionUserAvatar: data.action_user_avatar,
      reviewId: data.review_id,
      playlistId: data.playlist_id,
      isRead: data.is_read,
      timestamp: formatTimestamp(data.created_at),
      createdAt: data.created_at,
    };
  }

  function formatTimestamp(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return formatDateForDisplay(date, 'short');
  }

  function showBrowserNotification(notification: Notification) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: notification.actionUserAvatar || '/logo.png',
        badge: '/logo.png',
      });
    }
  }

  // Request browser notification permission
  async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    reload: loadNotifications,
    requestNotificationPermission,
  };
}
