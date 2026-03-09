import { useState, useEffect, useRef } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { UserPlus, Share2, Music, Clock, Tag, Sparkles, MessageSquare, Send, Search, Plus, Image, Smile, X, Loader2 } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { BackButton } from "./BackButton";
import { useProfile } from "../lib/useProfile";
import { searchAlbums } from "../lib/api/musicSearch";

interface Album {
  id: string;
  title: string;
  artist: string;
  cover: string;
  year?: string;
  genre?: string;
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

export function CollaborativePlaylistPage({ onNavigate, playlistId, playlists, setPlaylists, onBack, canGoBack, onOpenTrack }: CollaborativePlaylistPageProps) {
  const { profile } = useProfile();
  // Find the current playlist
  const playlist = playlists.find(p => p.id === playlistId) || playlists[0];
  const [newMessage, setNewMessage] = useState("");
  const [showAddTrackModal, setShowAddTrackModal] = useState(false);
  const [showAddMoodModal, setShowAddMoodModal] = useState(false);
  const [showGifModal, setShowGifModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMood, setNewMood] = useState("");
  const [gifSearchQuery, setGifSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showShareTrackModal, setShowShareTrackModal] = useState(false);
  const [tracks, setTracks] = useState(playlist?.tracks || []);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [searchResults, setSearchResults] = useState<Album[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Debounced album search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchAlbums(searchQuery, 10);
        setSearchResults(results.map(r => ({
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
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Different messages for each playlist (start empty, real messages would come from backend)
  const getInitialMessages = (_playlistId: string) => {
    // In a real implementation, messages would be fetched from Supabase
    return [];
  };

  const [messages, setMessages] = useState(getInitialMessages(playlistId || "default"));

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

  // Scroll to bottom when new messages are added
  useEffect(() => {
    scrollToBottom(true);
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() && !selectedImage) return;
    
    const msg = {
      id: `msg${Date.now()}`,
      userId: profile?.id || "current-user",
      userName: profile?.display_name || profile?.username || "You",
      userAvatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=user`,
      message: newMessage,
      timestamp: "Just now",
      type: selectedImage ? "image" : "text",
      imageUrl: selectedImage || undefined,
    };
    
    setMessages([...messages, msg]);
    setNewMessage("");
    setSelectedImage(null);
  };

  const handleSendGif = (gifUrl: string) => {
    const msg = {
      id: `msg${Date.now()}`,
      userId: profile?.id || "current-user",
      userName: profile?.display_name || profile?.username || "You",
      userAvatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=user`,
      message: "",
      timestamp: "Just now",
      type: "gif",
      gifUrl: gifUrl,
    };
    
    setMessages([...messages, msg]);
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

  const handleShareTrack = (album: Album) => {
    const msg = {
      id: `msg${Date.now()}`,
      userId: profile?.id || "current-user",
      userName: profile?.display_name || profile?.username || "You",
      userAvatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=user`,
      message: "",
      timestamp: "Just now",
      type: "track",
      track: {
        title: album.title,
        artist: album.artist,
        cover: album.cover,
        rating: 0,
      },
    };
    
    setMessages([...messages, msg]);
    setShowShareTrackModal(false);
    setSearchQuery("");
    toast.success(`Shared "${album.title}"!`);
  };

  const handleAddTrack = (album: Album) => {
    const newTrack = {
      id: `track-${Date.now()}`,
      title: album.title,
      artist: album.artist,
      addedBy: profile?.display_name || profile?.username || "You",
      timestamp: "Just now",
    };

    setTracks([newTrack, ...tracks]);
    setShowAddTrackModal(false);
    setSearchQuery("");
    toast.success(`Added "${album.title}" to the playlist!`);
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
                <button className="w-10 h-10 rounded-full border-2 border-dashed border-primary flex items-center justify-center hover:bg-primary/10 transition shadow-md hover:shadow-lg">
                  <UserPlus className="w-4 h-4 text-primary" />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg hover:scale-105 transition-all">
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Friends
              </Button>
              <Button variant="outline" className="border-border">
                <Share2 className="w-4 h-4 mr-2" />
                Share
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
                <p className="text-foreground">2.5h</p>
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
              >
                <Music className="w-4 h-4 mr-2" />
                Add Track
              </Button>
            </div>

            <div className="space-y-3">
              {tracks.map((track, index) => (
                <div
                  key={track.id}
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
      <Dialog open={showAddTrackModal} onOpenChange={setShowAddTrackModal}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Track to Playlist</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Search for a song or album to add to the collaborative playlist
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search for songs or albums..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>

            {/* Search Results */}
            <div className="space-y-2 max-h-96 overflow-y-auto nav-scroll">
              {searchResults.map((album) => (
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
                    onClick={() => handleAddTrack(album)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Plus className="w-4 h-4 mr-1" />
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
              ) : searchResults.map((album) => (
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
