import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Avatar } from "./ui/avatar";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Send, Music, Share2, MoreVertical, Image, Smile, X, Search, Plus, Loader2, MessageCirclePlus, ArrowLeft, User, Trash2, Ban } from "lucide-react";
import { toast } from "sonner";
import { useDirectMessages, type Conversation, type DirectMessage } from "../lib/useDirectMessages";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { searchAlbums } from "../lib/api/musicSearch";
import { formatDateForDisplay } from "../lib/localeFormatting";

interface Album {
  id: string;
  title: string;
  artist: string;
  cover: string;
  year?: string;
  genre?: string;
}

interface MessagingPageProps {
  onBack?: () => void;
  canGoBack?: boolean;
  onNavigate?: (page: string) => void;
  onViewProfile?: (userId: string) => void;
  onOpenAlbum?: (album: { id: string; title?: string; artist?: string; cover?: string; type?: string } | string) => void;
  targetUserId?: string; // Auto-open conversation with this user
}

export function MessagingPage({ onBack, canGoBack, onNavigate, onViewProfile, onOpenAlbum, targetUserId }: MessagingPageProps) {
  const [userId, setUserId] = useState<string | null>(null);
  
  // Get user on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id || null);
    });
  }, []);
  
  const dm = useDirectMessages(userId);
  
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [conversationMessages, setConversationMessages] = useState<DirectMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Auto-initialize conversation with target user if provided
  useEffect(() => {
    if (!targetUserId || !userId || dm.conversations.length === 0) return;
    
    // Find existing conversation or create new one
    const existingConv = dm.conversations.find(c => 
      c.other_user?.id === targetUserId || c.participants?.includes(targetUserId)
    );
    
    if (existingConv) {
      setSelectedConversation(existingConv);
    } else {
      // Create new conversation with target user
      (async () => {
        const conversationId = await dm.getOrCreateConversation(targetUserId);
        if (conversationId) {
          await dm.fetchConversations();
          const conv = dm.conversations.find(c => c.id === conversationId);
          if (conv) setSelectedConversation(conv);
        }
      })();
    }
  }, [targetUserId, userId, dm.conversations]);
  
  const [showGifModal, setShowGifModal] = useState(false);
  const [showShareTrackModal, setShowShareTrackModal] = useState(false);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [gifSearchQuery, setGifSearchQuery] = useState("");
  const [emojiSearchQuery, setEmojiSearchQuery] = useState("");
  const [emojiCategory, setEmojiCategory] = useState<"smileys" | "gestures" | "music">("smileys");
  const [searchQuery, setSearchQuery] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [trackSearchResults, setTrackSearchResults] = useState<Album[]>([]);
  const [isSearchingTracks, setIsSearchingTracks] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const emojiGroups: Record<"smileys" | "gestures" | "music", string[]> = {
    smileys: [
      "😀", "😃", "😄", "😁", "😆", "😂", "🤣", "🙂", "😉", "😊", "😍", "😘",
      "😜", "🤪", "🤩", "🥳", "😎", "🤓", "🫠", "🥹", "😭", "😴", "🤔", "😬",
    ],
    gestures: [
      "👍", "👎", "👏", "🙌", "🙏", "🤝", "💪", "👀", "💯", "🔥", "❤️", "✨",
      "🤞", "👌", "✌️", "🤌", "🫶", "👊", "🫡", "🙈", "🙉", "🙊", "💥", "🚀",
    ],
    music: [
      "🎵", "🎶", "🎼", "🎤", "🎧", "🎸", "🥁", "🎹", "🎺", "🎷", "🪩", "💃",
      "🕺", "🎙️", "📀", "💿", "🎚️", "🎛️", "🎬", "📻", "🎟️", "🎉", "🤘", "⚡",
    ],
  };

  // Debounced track search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setTrackSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingTracks(true);
      try {
        const results = await searchAlbums(searchQuery, 10);
        setTrackSearchResults(results.map(r => ({
          id: r.id,
          title: r.title,
          artist: r.artist,
          cover: r.cover,
          year: r.year,
          genre: r.genre,
        })));
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearchingTracks(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch conversations on mount
  useEffect(() => {
    dm.fetchConversations();
  }, []);

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesContainerRef.current) {
      const scrollHeight = messagesContainerRef.current.scrollHeight;
      messagesContainerRef.current.scrollTo({
        top: scrollHeight,
        behavior: smooth ? "smooth" : "auto"
      });
    }
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      setIsLoadingMessages(true);
      dm.fetchMessages(selectedConversation.id).then(msgs => {
        setConversationMessages(msgs);
        setIsLoadingMessages(false);
        setTimeout(() => scrollToBottom(false), 50);
      });
      dm.markAsRead(selectedConversation.id);
      
      // Subscribe to new messages
      channelRef.current = dm.subscribeToMessages(selectedConversation.id, (newMsg) => {
        setConversationMessages(prev => [...prev, newMsg]);
        if (newMsg.sender_id !== userId) {
          dm.markAsRead(selectedConversation.id);
        }
      });
    }
    
    return () => {
      if (channelRef.current) {
        dm.unsubscribe(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [selectedConversation?.id]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    scrollToBottom(true);
  }, [conversationMessages, scrollToBottom]);

  // Get the other participant in a conversation
  const getOtherParticipant = (conv: Conversation) => {
    return conv.other_user;
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDateForDisplay(date, "short");
  };

  // Search for users
  const handleSearchUsers = async () => {
    if (!userSearchQuery.trim()) return;
    setIsSearchingUsers(true);
    const results = await dm.searchUsers(userSearchQuery);
    setUserSearchResults(results);
    setIsSearchingUsers(false);
  };

  // Start a new conversation with a user
  const handleStartConversation = async (otherUserId: string) => {
    const conversationId = await dm.getOrCreateConversation(otherUserId);
    if (conversationId) {
      await dm.fetchConversations();
      const conv = dm.conversations.find(c => c.id === conversationId);
      if (conv) {
        setSelectedConversation(conv);
      }
      setShowNewMessageModal(false);
      setUserSearchQuery("");
      setUserSearchResults([]);
    }
  };

  // Mock GIF suggestions
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        toast.success("Image selected! Click send to share it.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || (!messageInput.trim() && !selectedImage)) return;
    
    setIsSending(true);
    const success = await dm.sendMessage(
      selectedConversation.id,
      messageInput.trim(),
      selectedImage ? "image" : "text",
      selectedImage ? { media_url: selectedImage } : undefined
    );
    
    if (success) {
      setMessageInput("");
      setSelectedImage(null);
    } else {
      toast.error("Failed to send message");
    }
    setIsSending(false);
  };

  const handleSendGif = async (gifUrl: string) => {
    if (!selectedConversation) return;
    
    const success = await dm.sendMessage(
      selectedConversation.id,
      "",
      "gif",
      { media_url: gifUrl }
    );
    
    if (success) {
      setShowGifModal(false);
      setGifSearchQuery("");
      toast.success("GIF sent!");
    } else {
      toast.error("Failed to send GIF");
    }
  };

  const handleShareTrack = async (album: Album) => {
    if (!selectedConversation) return;
    
    const success = await dm.sendMessage(
      selectedConversation.id,
      `Check out "${album.title}" by ${album.artist}`,
      "track",
      {
        track_id: album.id,
        track_title: album.title,
        track_artist: album.artist,
        track_cover_url: album.cover
      }
    );
    
    if (success) {
      setShowShareTrackModal(false);
      setSearchQuery("");
      toast.success(`Shared "${album.title}"!`);
    } else {
      toast.error("Failed to share track");
    }
  };

  const handleInsertEmoji = (emoji: string) => {
    const input = messageInputRef.current;
    if (!input) {
      setMessageInput((prev) => `${prev}${emoji}`);
      return;
    }

    const start = input.selectionStart ?? messageInput.length;
    const end = input.selectionEnd ?? messageInput.length;
    const nextMessage = `${messageInput.slice(0, start)}${emoji}${messageInput.slice(end)}`;
    const nextCaret = start + emoji.length;

    setMessageInput(nextMessage);

    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const visibleEmojis = emojiGroups[emojiCategory].filter((emoji) => {
    if (!emojiSearchQuery.trim()) return true;
    const query = emojiSearchQuery.toLowerCase();
    const aliases: Record<string, string> = {
      "😀": "happy smile grin",
      "😂": "laugh lol tears",
      "😍": "love heart eyes",
      "😭": "cry sad tears",
      "🔥": "fire lit",
      "❤️": "love heart",
      "🎵": "music note song",
      "🎧": "headphones listening",
      "👏": "clap applause",
      "👍": "thumbs up yes",
      "👎": "thumbs down no",
      "🥳": "party celebration",
    };

    return (aliases[emoji] || "").includes(query);
  });

  return (
    <div className="animate-fade-in flex flex-col" style={{ height: 'calc(100svh - 5.5rem)' }}>

      {/* Page header — hidden on mobile when chat is open */}
      <div className={`flex items-center justify-between mb-3 flex-shrink-0 ${selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="hover:bg-muted group">
              <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
              <span className="hidden sm:inline">{canGoBack ? "Back" : "Back to Home"}</span>
            </Button>
          )}
          <h1 className="text-2xl md:text-3xl text-foreground">Messages</h1>
        </div>
        <Button onClick={() => setShowNewMessageModal(true)} className="bg-primary hover:bg-primary/90" size="sm">
          <MessageCirclePlus className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">New Message</span>
        </Button>
      </div>

      {/* Two-panel layout — flex so both panels share the same height */}
      <div className="flex gap-3 flex-1 min-h-0 overflow-hidden">

        {/* LEFT PANEL: Conversations list */}
        <Card className={`
          flex flex-col overflow-hidden bg-card border-primary/30 rounded-xl
          lg:w-[340px] lg:flex-shrink-0
          ${selectedConversation ? 'hidden lg:flex' : 'flex w-full'}
        `}>
          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto min-h-0 p-2">
            {dm.loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : dm.conversations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageCirclePlus className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No conversations yet</p>
                <p className="text-sm mt-1">Start a new message!</p>
                <Button onClick={() => setShowNewMessageModal(true)} className="mt-4 bg-primary hover:bg-primary/90" size="sm">
                  <MessageCirclePlus className="w-4 h-4 mr-2" />
                  New Message
                </Button>
              </div>
            ) : (
              <>
                <p className="px-3 pt-1 pb-3 text-[11px] uppercase tracking-widest font-medium text-muted-foreground/70">Recent conversations</p>
                <div className="flex flex-col gap-2 px-1">
                  {dm.conversations.map((conv) => {
                const otherUser = getOtherParticipant(conv);
                const unreadCount = conv.unread_count ?? 0;
                const isSelected = selectedConversation?.id === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`relative px-3 py-3 rounded-xl min-h-[72px] cursor-pointer transition-all active:scale-[0.99] border ${
                      isSelected
                        ? "bg-primary/15 border-primary/60 shadow-[0_0_0_1px_rgba(168,85,247,.25),0_0_16px_rgba(168,85,247,.10)]"
                        : "bg-muted/30 border-border/50 hover:bg-muted/60 hover:border-border"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-primary" aria-hidden="true" />
                    )}
                    <div className="flex gap-3 items-start">
                      <div className="flex-shrink-0 pt-0.5">
                        <Avatar className="w-10 h-10">
                          <img
                            src={otherUser?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser?.id}`}
                            alt={otherUser?.display_name || "User"}
                            className="object-cover"
                          />
                        </Avatar>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-foreground font-semibold truncate text-sm leading-tight">{otherUser?.display_name || "Unknown User"}</p>
                          <span className="text-[11px] text-muted-foreground/90 flex-shrink-0 pt-0.5">
                            {conv.last_message_at ? formatTimestamp(conv.last_message_at) : ""}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="text-xs text-muted-foreground truncate flex-1">
                            {conv.last_message
                              ? (conv.last_message.message_type === 'track' ? '🎵 Shared a track' :
                                 conv.last_message.message_type === 'image' ? '📷 Sent an image' :
                                 conv.last_message.message_type === 'gif' ? '🎭 Sent a GIF' :
                                 conv.last_message.content || "...")
                              : "No messages yet"}
                          </p>
                          {unreadCount > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-secondary text-secondary-foreground text-[10px] font-semibold flex items-center justify-center">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
                </div>
              </>
            )}
          </div>
        </Card>

        {/* RIGHT PANEL: Chat window */}
        <Card className={`
          flex flex-col overflow-hidden bg-card border-primary/30 rounded-xl flex-1
          ${selectedConversation ? 'flex' : 'hidden lg:flex'}
        `}>
          {!selectedConversation ? (
            /* Desktop: show placeholder when nothing selected */
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Select a conversation to start chatting</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header — fixed */}
              <div className="px-3 py-3 md:px-4 border-b border-border/80 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2 md:gap-3">
                  {/* Back arrow on mobile */}
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-muted transition active:scale-95"
                    aria-label="Back"
                  >
                    <ArrowLeft className="w-5 h-5 text-foreground" />
                  </button>
                  <Avatar className="w-9 h-9 md:w-10 md:h-10 flex-shrink-0">
                    <img
                      src={getOtherParticipant(selectedConversation)?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${getOtherParticipant(selectedConversation)?.id}`}
                      alt={getOtherParticipant(selectedConversation)?.display_name || "User"}
                      className="object-cover"
                    />
                  </Avatar>
                  <div>
                    <p className="text-foreground text-sm md:text-base font-medium leading-tight">{getOtherParticipant(selectedConversation)?.display_name || "Unknown User"}</p>
                    <p className="text-xs text-muted-foreground">Active now</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 hover:bg-muted rounded-lg transition">
                      <MoreVertical className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        const otherUser = getOtherParticipant(selectedConversation);
                        if (otherUser?.id) {
                          if (onViewProfile) onViewProfile(otherUser.id);
                          else if (onNavigate) onNavigate(`user/${otherUser.id}`);
                        }
                      }}
                    >
                      <User className="w-4 h-4 mr-2" />
                      View Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={async () => {
                        if (!selectedConversation) return;
                        const confirmed = window.confirm("Are you sure you want to clear this conversation? This will delete all messages.");
                        if (confirmed) {
                          const { error } = await supabase
                            .from('direct_messages')
                            .delete()
                            .eq('conversation_id', selectedConversation.id);
                          if (error) toast.error("Failed to clear conversation");
                          else { setConversationMessages([]); toast.success("Conversation cleared"); }
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear Chat
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => toast.info("Block feature coming soon")}>
                      <Ban className="w-4 h-4 mr-2" />
                      Block User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Messages — scrollable, fills remaining height */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto min-h-0 p-3 md:p-4 scroll-pb-24">
                <div className="w-full max-w-[760px] mx-auto space-y-3">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : conversationMessages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Music className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No messages yet</p>
                    <p className="text-sm mt-1">Say hello! 👋</p>
                  </div>
                ) : (
                  conversationMessages.map((msg) => {
                    const isOwn = msg.sender_id === userId;
                    const isMediaMessage = msg.message_type === 'gif' || msg.message_type === 'image' || msg.message_type === 'track';
                    return (
                      <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} animate-slide-in`}>
                        <div className={`${
                          isMediaMessage ? 'max-w-[260px] md:max-w-[320px] p-1' : 'max-w-[min(70%,42ch)] px-3 py-2 md:px-4 md:py-3'
                        } rounded-2xl ${
                          msg.message_type === 'track' ? 'bg-card border border-border' :
                          isOwn ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                        }`}>
                          {msg.message_type === 'gif' && msg.media_url && (
                            <img src={msg.media_url} alt="GIF" className="rounded-xl max-w-full h-auto max-h-[260px] object-cover" />
                          )}
                          {msg.message_type === 'image' && msg.media_url && (
                            <img src={msg.media_url} alt="Shared image" className="rounded-xl max-w-full h-auto max-h-[260px] object-cover" />
                          )}
                          {msg.message_type === 'track' && msg.track_id && (
                            <div className="p-2 md:p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Music className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                                <span className="text-xs text-muted-foreground">Shared a track</span>
                              </div>
                              <button
                                onClick={() => onOpenAlbum?.({
                                  id: msg.track_id!,
                                  title: msg.track_title ?? undefined,
                                  artist: msg.track_artist ?? undefined,
                                  cover: msg.track_cover_url ?? undefined,
                                  type: "song",
                                })}
                                className="w-full flex gap-2 md:gap-3 bg-background hover:bg-muted/60 active:scale-[0.98] transition-all p-2 md:p-3 rounded-lg text-left group"
                              >
                                <img src={msg.track_cover_url || "/placeholder-album.jpg"} alt={msg.track_title || "Track"} className="w-12 h-12 md:w-16 md:h-16 rounded object-cover flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm text-foreground truncate group-hover:text-primary transition-colors">{msg.track_title}</p>
                                  <p className="text-xs text-muted-foreground truncate">{msg.track_artist}</p>
                                  {onOpenAlbum && <p className="text-[10px] text-primary/70 mt-1">Tap to open</p>}
                                </div>
                              </button>
                            </div>
                          )}
                          {msg.content && (
                            <>
                              <p className="text-sm md:text-base mb-1 break-words">{msg.content}</p>
                              <span className={`text-[10px] md:text-xs ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                {formatTimestamp(msg.created_at)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input — fixed at bottom */}
              <div className="px-3 py-3 md:px-4 border-t border-border/80 flex-shrink-0">
                <div className="w-full max-w-[760px] mx-auto">
                  {selectedImage && (
                    <div className="mb-3 relative inline-block">
                      <img src={selectedImage} alt="Selected" className="max-h-28 rounded-lg border-2 border-primary" />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedImage(null)}
                        className="absolute -top-2 -right-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full w-6 h-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center h-14 gap-2">
                    <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" id="message-image-upload" />
                    <Button variant="outline" size="icon" className="border-border flex-shrink-0 w-10 h-10" onClick={() => document.getElementById('message-image-upload')?.click()} title="Add Image">
                      <Image className="w-4 h-4" />
                    </Button>
                    <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="border-border flex-shrink-0 w-10 h-10" title="Add Emoji">
                          <span className="text-base leading-none">😀</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" side="top" className="w-[340px] p-0 bg-card border-border shadow-xl rounded-xl">
                        <div className="border-b border-border px-2 py-2">
                          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                            <button
                              type="button"
                              onClick={() => {
                                setShowEmojiPicker(false);
                                setShowGifModal(true);
                              }}
                              className="h-8 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-background transition"
                            >
                              GIFs
                            </button>
                            <button
                              type="button"
                              className="h-8 rounded-md text-xs bg-background text-foreground shadow-sm"
                            >
                              Emoji
                            </button>
                          </div>
                        </div>

                        <div className="px-3 pt-3 pb-2 border-b border-border/70">
                          <div className="flex items-center gap-2 h-9 rounded-md border border-border bg-input-background px-3">
                            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <input
                              value={emojiSearchQuery}
                              onChange={(e) => setEmojiSearchQuery(e.target.value)}
                              placeholder="Search emoji"
                              className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
                            />
                          </div>
                          <div className="mt-2 flex gap-1">
                            <button
                              type="button"
                              onClick={() => setEmojiCategory("smileys")}
                              className={`px-2 py-1 text-xs rounded-md transition ${emojiCategory === "smileys" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                            >
                              😀 Faces
                            </button>
                            <button
                              type="button"
                              onClick={() => setEmojiCategory("gestures")}
                              className={`px-2 py-1 text-xs rounded-md transition ${emojiCategory === "gestures" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                            >
                              🙌 Gestures
                            </button>
                            <button
                              type="button"
                              onClick={() => setEmojiCategory("music")}
                              className={`px-2 py-1 text-xs rounded-md transition ${emojiCategory === "music" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                            >
                              🎵 Music
                            </button>
                          </div>
                        </div>

                        <div className="max-h-[260px] overflow-y-auto p-2 nav-scroll">
                          {visibleEmojis.length === 0 ? (
                            <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
                              No emojis found
                            </div>
                          ) : (
                            <div
                              className="grid gap-1"
                              style={{ gridTemplateColumns: "repeat(8, minmax(0, 1fr))" }}
                            >
                              {visibleEmojis.map((emoji) => (
                                <button
                                  key={`${emojiCategory}-${emoji}`}
                                  type="button"
                                  onClick={() => {
                                    handleInsertEmoji(emoji);
                                    setShowEmojiPicker(false);
                                  }}
                                  className="h-9 w-full rounded-md flex items-center justify-center hover:bg-muted transition text-xl"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button variant="outline" size="icon" className="border-border flex-shrink-0 w-10 h-10" onClick={() => setShowGifModal(true)} title="Add GIF">
                      <Smile className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="border-border flex-shrink-0 w-10 h-10" onClick={() => setShowShareTrackModal(true)} title="Share Track">
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <span className="h-6 w-px bg-border/70" aria-hidden="true" />
                    <Input
                      ref={messageInputRef}
                      type="text"
                      placeholder="Message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      className="flex-1 h-10 bg-muted border-0 text-foreground text-sm md:text-base"
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && (messageInput.trim() || selectedImage)) handleSendMessage();
                      }}
                    />
                    <Button
                      className="bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0 w-10 h-10 p-0"
                      onClick={handleSendMessage}
                      disabled={isSending || (!messageInput.trim() && !selectedImage)}
                    >
                      {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* GIF Modal */}
      <Dialog open={showGifModal} onOpenChange={setShowGifModal}>
        <DialogContent className="bg-card border-border w-[95vw] max-w-2xl">
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 max-h-72 md:max-h-96 overflow-y-auto nav-scroll">
              {gifSuggestions.map((gif) => (
                <div
                  key={gif.id}
                  className="relative group cursor-pointer rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all aspect-square active:scale-95"
                  onClick={() => handleSendGif(gif.url)}
                >
                  <img
                    src={gif.url}
                    alt={gif.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm">
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
        <DialogContent className="bg-card border-border w-[95vw] max-w-md">
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
              {isSearchingTracks ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : !searchQuery.trim() ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <p>Search for a track to share</p>
                </div>
              ) : trackSearchResults.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <p>No tracks found</p>
                </div>
              ) : trackSearchResults.map((album) => (
                <div
                  key={album.id}
                  className="flex items-center gap-4 p-3 bg-background rounded-lg hover:bg-muted transition cursor-pointer group"
                >
                  <img
                    src={album.cover}
                    alt={album.title}
                    className="w-12 h-12 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground truncate">{album.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{album.artist}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleShareTrack(album)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0"
                  >
                    <Share2 className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Share</span>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Message Modal */}
      <Dialog open={showNewMessageModal} onOpenChange={setShowNewMessageModal}>
        <DialogContent className="bg-card border-border w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">New Message</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Search for a user to start a conversation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search users by name..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") handleSearchUsers();
                }}
                className="flex-1 bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
              <Button
                variant="outline"
                className="border-border text-foreground hover:bg-muted"
                onClick={handleSearchUsers}
                disabled={isSearchingUsers}
              >
                {isSearchingUsers ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {userSearchResults.length === 0 && userSearchQuery && !isSearchingUsers && (
                <p className="text-center text-muted-foreground py-4">No users found</p>
              )}
              {userSearchResults.map((searchUser) => (
                <div
                  key={searchUser.id}
                  className="flex items-center gap-3 p-3 bg-background rounded-lg hover:bg-muted transition cursor-pointer"
                  onClick={() => handleStartConversation(searchUser.id)}
                >
                  <Avatar className="w-10 h-10">
                    <img 
                      src={searchUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${searchUser.id}`} 
                      alt={searchUser.display_name} 
                      className="object-cover" 
                    />
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground truncate">{searchUser.display_name}</p>
                    {searchUser.username && (
                      <p className="text-sm text-muted-foreground truncate">@{searchUser.username}</p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/10">
                    Message
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