// useDirectMessages.ts - Hook for direct messaging functionality
import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: "text" | "image" | "gif" | "track";
  track_id?: string;
  track_title?: string;
  track_artist?: string;
  track_cover_url?: string;
  media_url?: string;
  read_at?: string;
  created_at: string;
  // Joined data
  sender?: {
    id: string;
    username: string;
    avatar_url: string;
  };
}

export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string;
  created_at: string;
  // Joined data - the other participant
  other_user?: {
    id: string;
    username: string;
    avatar_url: string;
    display_name?: string;
  };
  // Last message preview
  last_message?: DirectMessage;
  unread_count?: number;
}

export function useDirectMessages(currentUserId: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all conversations for the current user
  const fetchConversations = useCallback(async () => {
    if (!currentUserId) {
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get all conversations where user is a participant
      const { data: convos, error: convError } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant_1.eq.${currentUserId},participant_2.eq.${currentUserId}`)
        .order("last_message_at", { ascending: false });

      if (convError) throw convError;

      // Transform and fetch profile for other participant
      const transformedConvos: Conversation[] = [];
      
      for (const c of convos || []) {
        const isParticipant1 = c.participant_1 === currentUserId;
        const otherUserId = isParticipant1 ? c.participant_2 : c.participant_1;
        
        // Get the other user's profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, display_name")
          .eq("id", otherUserId)
          .single();
        
        transformedConvos.push({
          id: c.id,
          participant_1: c.participant_1,
          participant_2: c.participant_2,
          last_message_at: c.last_message_at,
          created_at: c.created_at,
          other_user: profile ? {
            id: profile.id,
            username: profile.username || "User",
            avatar_url: profile.avatar_url || "",
            display_name: profile.display_name,
          } : {
            id: otherUserId,
            username: "User",
            avatar_url: "",
            display_name: "Unknown User",
          },
        });
      }

      // Fetch last message and unread count for each conversation
      for (const convo of transformedConvos) {
        // Get last message
        const { data: lastMsg } = await supabase
          .from("direct_messages")
          .select("*")
          .eq("conversation_id", convo.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        
        if (lastMsg) {
          convo.last_message = lastMsg;
        }

        // Get unread count
        const { count } = await supabase
          .from("direct_messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", convo.id)
          .neq("sender_id", currentUserId)
          .is("read_at", null);
        
        convo.unread_count = count || 0;
      }

      setConversations(transformedConvos);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching conversations:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // Get or create a conversation with another user
  const getOrCreateConversation = useCallback(async (otherUserId: string): Promise<string | null> => {
    if (!currentUserId) return null;

    try {
      const { data, error } = await supabase
        .rpc("get_or_create_conversation", {
          user1_id: currentUserId,
          user2_id: otherUserId,
        });

      if (error) throw error;
      
      // Refresh conversations list
      await fetchConversations();
      
      return data;
    } catch (err: any) {
      console.error("Error creating conversation:", err);
      setError(err.message);
      return null;
    }
  }, [currentUserId, fetchConversations]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string): Promise<DirectMessage[]> => {
    try {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      return data || [];
    } catch (err: any) {
      console.error("Error fetching messages:", err);
      return [];
    }
  }, []);

  // Send a message
  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    messageType: "text" | "image" | "gif" | "track" = "text",
    extras?: {
      track_id?: string;
      track_title?: string;
      track_artist?: string;
      track_cover_url?: string;
      media_url?: string;
    }
  ): Promise<DirectMessage | null> => {
    if (!currentUserId) return null;

    try {
      const { data, error } = await supabase
        .from("direct_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: messageType === "text" ? content : null,
          message_type: messageType,
          ...extras,
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation's last_message_at
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);

      return data;
    } catch (err: any) {
      console.error("Error sending message:", err);
      return null;
    }
  }, [currentUserId]);

  // Mark messages as read
  const markAsRead = useCallback(async (conversationId: string) => {
    if (!currentUserId) return;

    try {
      await supabase
        .from("direct_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .neq("sender_id", currentUserId)
        .is("read_at", null);
      
      // Update local state
      setConversations(prev => 
        prev.map(c => 
          c.id === conversationId ? { ...c, unread_count: 0 } : c
        )
      );
    } catch (err: any) {
      console.error("Error marking messages as read:", err);
    }
  }, [currentUserId]);

  // Subscribe to new messages (realtime)
  const subscribeToMessages = useCallback((
    conversationId: string,
    onNewMessage: (message: DirectMessage) => void
  ): RealtimeChannel => {
    const channel = supabase
      .channel(`dm:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          onNewMessage(payload.new as DirectMessage);
        }
      )
      .subscribe();

    return channel;
  }, []);

  // Unsubscribe from a channel
  const unsubscribe = useCallback((channel: RealtimeChannel) => {
    supabase.removeChannel(channel);
  }, []);

  // Search users to start a conversation with
  const searchUsers = useCallback(async (query: string): Promise<any[]> => {
    if (!query.trim() || !currentUserId) return [];

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, display_name")
        .neq("id", currentUserId)
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error("Error searching users:", err);
      return [];
    }
  }, [currentUserId]);

  // Get total unread count
  const getTotalUnreadCount = useCallback((): number => {
    return conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  }, [conversations]);

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Subscribe to conversation updates
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel("conversations_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        () => {
          // Refresh conversations when any change happens
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, fetchConversations]);

  return {
    conversations,
    loading,
    error,
    fetchConversations,
    getOrCreateConversation,
    fetchMessages,
    sendMessage,
    markAsRead,
    subscribeToMessages,
    unsubscribe,
    searchUsers,
    getTotalUnreadCount,
  };
}
