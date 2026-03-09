import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';

export interface Reminder {
  id: string;
  user_id?: string;
  type: 'event' | 'album' | 'custom';
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD format
  time?: string; // HH:MM format
  eventId?: string;
  albumId?: string;
  thumbnail?: string;
  location?: string;
  createdAt: string;
  notified?: boolean;
  // Optional event data for event reminders
  eventData?: {
    venue?: string;
    city?: string;
    thumbnail?: string;
    url?: string;
    time?: string;
    price?: string;
  };
}

// Database column mapping (snake_case to camelCase)
interface ReminderRow {
  id: string;
  user_id: string;
  type: 'event' | 'album' | 'custom';
  title: string;
  description?: string;
  date: string;
  time?: string;
  event_id?: string;
  album_id?: string;
  thumbnail?: string;
  location?: string;
  created_at: string;
  notified?: boolean;
}

function rowToReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    title: row.title,
    description: row.description,
    date: row.date,
    time: row.time,
    eventId: row.event_id,
    albumId: row.album_id,
    thumbnail: row.thumbnail,
    location: row.location,
    createdAt: row.created_at,
    notified: row.notified,
  };
}

// Custom event for cross-component synchronization
const REMINDERS_UPDATED_EVENT = 'onchord_reminders_updated';

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isSyncing = useRef(false);

  // Load reminders from Supabase on mount
  const loadReminders = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setReminders([]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (error) {
        console.error('Failed to load reminders:', error);
        setReminders([]);
      } else {
        setReminders((data || []).map(rowToReminder));
      }
    } catch (error) {
      console.error('Failed to load reminders:', error);
      setReminders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  // Listen for updates from other components
  useEffect(() => {
    const handleUpdate = () => {
      if (!isSyncing.current) {
        loadReminders();
      }
    };

    window.addEventListener(REMINDERS_UPDATED_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(REMINDERS_UPDATED_EVENT, handleUpdate);
    };
  }, [loadReminders]);

  // Set up real-time subscription
  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('reminders_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reminders',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadReminders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();
  }, [loadReminders]);

  const addReminder = async (reminder: Omit<Reminder, 'id' | 'createdAt' | 'user_id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const newReminder = {
        user_id: user.id,
        type: reminder.type,
        title: reminder.title,
        description: reminder.description || null,
        date: reminder.date,
        time: reminder.time || null,
        event_id: reminder.eventId || null,
        album_id: reminder.albumId || null,
        thumbnail: reminder.thumbnail || null,
        location: reminder.location || null,
        notified: false,
      };

      isSyncing.current = true;
      const { data, error } = await supabase
        .from('reminders')
        .insert(newReminder)
        .select()
        .single();

      if (error) {
        console.error('Failed to add reminder:', error);
        throw error;
      }

      const addedReminder = rowToReminder(data);
      setReminders(prev => [...prev, addedReminder]);
      window.dispatchEvent(new Event(REMINDERS_UPDATED_EVENT));
      isSyncing.current = false;
      
      return addedReminder;
    } catch (error) {
      isSyncing.current = false;
      throw error;
    }
  };

  const removeReminder = async (reminderId: string) => {
    try {
      isSyncing.current = true;
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', reminderId);

      if (error) {
        console.error('Failed to remove reminder:', error);
        throw error;
      }

      setReminders(prev => prev.filter(r => r.id !== reminderId));
      window.dispatchEvent(new Event(REMINDERS_UPDATED_EVENT));
      isSyncing.current = false;
    } catch (error) {
      isSyncing.current = false;
      throw error;
    }
  };

  const updateReminder = async (reminderId: string, updates: Partial<Reminder>) => {
    try {
      // Convert camelCase to snake_case for database
      const dbUpdates: Record<string, any> = {};
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.date !== undefined) dbUpdates.date = updates.date;
      if (updates.time !== undefined) dbUpdates.time = updates.time;
      if (updates.eventId !== undefined) dbUpdates.event_id = updates.eventId;
      if (updates.albumId !== undefined) dbUpdates.album_id = updates.albumId;
      if (updates.thumbnail !== undefined) dbUpdates.thumbnail = updates.thumbnail;
      if (updates.location !== undefined) dbUpdates.location = updates.location;
      if (updates.notified !== undefined) dbUpdates.notified = updates.notified;

      isSyncing.current = true;
      const { error } = await supabase
        .from('reminders')
        .update(dbUpdates)
        .eq('id', reminderId);

      if (error) {
        console.error('Failed to update reminder:', error);
        throw error;
      }

      setReminders(prev =>
        prev.map(r => (r.id === reminderId ? { ...r, ...updates } : r))
      );
      window.dispatchEvent(new Event(REMINDERS_UPDATED_EVENT));
      isSyncing.current = false;
    } catch (error) {
      isSyncing.current = false;
      throw error;
    }
  };

  const getUpcomingReminders = () => {
    const now = new Date();
    const nowStr = now.toISOString().split('T')[0];
    
    return reminders
      .filter(r => r.date >= nowStr)
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        if (a.time && b.time) return a.time.localeCompare(b.time);
        return 0;
      });
  };

  const getPastReminders = () => {
    const now = new Date();
    const nowStr = now.toISOString().split('T')[0];
    
    return reminders
      .filter(r => r.date < nowStr)
      .sort((a, b) => b.date.localeCompare(a.date));
  };

  const getRemindersForDate = (date: string) => {
    return reminders.filter(r => r.date === date);
  };

  const hasReminderOnDate = (date: string) => {
    return reminders.some(r => r.date === date);
  };

  const getReminderCount = () => {
    return getUpcomingReminders().length;
  };

  return {
    reminders,
    isLoading,
    upcomingReminders: getUpcomingReminders(),
    pastReminders: getPastReminders(),
    addReminder,
    removeReminder,
    updateReminder,
    getRemindersForDate,
    hasReminderOnDate,
    reminderCount: getReminderCount(),
    refreshReminders: loadReminders,
  };
}
