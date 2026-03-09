import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Music, MapPin, Disc, Save, Plus, X, Smile, Clock, Navigation, Search, Loader2 } from "lucide-react";
import { searchAlbums, searchTracks, type Album as SearchAlbum, type Track as SearchTrack } from "../lib/api/musicSearch";
import { getSonglinkData } from "../lib/api/songlink";
import { StarRating } from "./StarRating";
import { ReviewConfirmation } from "./ReviewConfirmation";
import { PageHeader } from "./PageHeader";
import { toast } from "sonner";
import { useReviews } from "../lib/useUserInteractions";
import { supabase } from "../lib/supabaseClient";

const tags = ["chill", "roadtrip", "study", "workout", "party", "emotional", "upbeat", "mellow"];

// Mood emoji options
const moodEmojis = [
  "😊", "😌", "😍", "🥰", "😭", "😢", "😤", "😔",
  "🔥", "💯", "✨", "💫", "🌟", "⭐", "💖", "💔",
  "🎵", "🎶", "🎧", "🎤", "🌙", "☀️", "🌧️", "⚡",
  "💭", "🙏", "👌", "🤘", "✊", "💪", "🌊", "🌈"
];

// Helper function to count words
const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

// Helper function to format duration from ms to MM:SS
const formatDuration = (ms?: number): string => {
  if (!ms) return "--:--";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

interface CreateReviewPageProps {
  onNavigate?: (page: string) => void;
  onBack?: () => void;
  editingReview?: any;
  onClearEdit?: () => void;
}

export function CreateReviewPage({ onNavigate, onBack, editingReview, onClearEdit }: CreateReviewPageProps) {
  const { addReview, updateReview } = useReviews();
  const [reviewType, setReviewType] = useState<"album" | "track">(editingReview?.type || "album");
  const [rating, setRating] = useState(editingReview?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState(editingReview?.content || "");
  const [mood, setMood] = useState(editingReview?.mood || "");
  const [whereListened, setWhereListened] = useState(editingReview?.whereListened || "");
  const [whenListened, setWhenListened] = useState(editingReview?.whenListened || "");
  const [favoriteTrack, setFavoriteTrack] = useState(editingReview?.favoriteTrack || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(editingReview?.tags || []);
  const [customTagInput, setCustomTagInput] = useState("");
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(editingReview?.isPublic !== undefined ? editingReview.isPublic : true);
  const [isPublished, setIsPublished] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  
  // Music search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ albums: SearchAlbum[]; tracks: SearchTrack[] }>({ albums: [], tracks: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchOffset, setSearchOffset] = useState(0);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const SEARCH_PAGE_SIZE = 15;
  const SEARCH_TOTAL_LIMIT = 50;
  
  // Selected album/track - use editing review's album if available, otherwise null until user selects
  const [selectedAlbum, setSelectedAlbum] = useState<{ id: string; title: string; artist: string; cover: string; genre?: string; duration?: number } | null>(editingReview 
    ? {
        id: editingReview.albumId,
        title: editingReview.albumTitle,
        artist: editingReview.albumArtist,
        cover: editingReview.albumCover,
      }
    : null);
  
  const album = selectedAlbum;
  
  // Clear editing state when component unmounts
  useEffect(() => {
    return () => {
      onClearEdit?.();
    };
  }, []);
  
  // Clear search results when review type changes
  useEffect(() => {
    setSearchResults({ albums: [], tracks: [] });
    setShowSearchResults(false);
    setSearchQuery("");
    // Don't reset selection when editing
    if (!editingReview) {
      setSelectedAlbum(null);
    }
  }, [reviewType]);
  
  // All fetched results (full set from API)
  const [allResults, setAllResults] = useState<{ albums: SearchAlbum[]; tracks: SearchTrack[] }>({ albums: [], tracks: [] });

  // Search for music with debounce — fetch full batch, show first page
  useEffect(() => {
    const delaySearch = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults({ albums: [], tracks: [] });
        setAllResults({ albums: [], tracks: [] });
        setShowSearchResults(false);
        setSearchOffset(0);
        setHasMoreResults(false);
        return;
      }
      
      setIsSearching(true);
      setShowSearchResults(true);
      setSearchOffset(0);
      
      try {
        if (reviewType === "album") {
          const albums = await searchAlbums(searchQuery, SEARCH_TOTAL_LIMIT);
          // Deduplicate by id
          const unique = albums.filter((a, i, arr) => arr.findIndex(x => x.id === a.id) === i);
          setAllResults({ albums: unique, tracks: [] });
          setSearchResults({ albums: unique.slice(0, SEARCH_PAGE_SIZE), tracks: [] });
          setHasMoreResults(unique.length > SEARCH_PAGE_SIZE);
          setSearchOffset(SEARCH_PAGE_SIZE);
        } else {
          const tracks = await searchTracks(searchQuery, SEARCH_TOTAL_LIMIT);
          const unique = tracks.filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i);
          setAllResults({ albums: [], tracks: unique });
          setSearchResults({ albums: [], tracks: unique.slice(0, SEARCH_PAGE_SIZE) });
          setHasMoreResults(unique.length > SEARCH_PAGE_SIZE);
          setSearchOffset(SEARCH_PAGE_SIZE);
        }
      } catch (error) {
        console.error("Search error:", error);
        toast.error("Failed to search music");
      } finally {
        setIsSearching(false);
      }
    }, 500);
    
    return () => clearTimeout(delaySearch);
  }, [searchQuery, reviewType]);
  
  // Load more results locally from the already-fetched set
  const loadMoreResults = useCallback(() => {
    if (isLoadingMore || !hasMoreResults) return;
    
    setIsLoadingMore(true);
    
    if (reviewType === "album") {
      const nextBatch = allResults.albums.slice(searchOffset, searchOffset + SEARCH_PAGE_SIZE);
      setSearchResults(prev => ({ ...prev, albums: [...prev.albums, ...nextBatch] }));
      const newOffset = searchOffset + SEARCH_PAGE_SIZE;
      setSearchOffset(newOffset);
      setHasMoreResults(newOffset < allResults.albums.length);
    } else {
      const nextBatch = allResults.tracks.slice(searchOffset, searchOffset + SEARCH_PAGE_SIZE);
      setSearchResults(prev => ({ ...prev, tracks: [...prev.tracks, ...nextBatch] }));
      const newOffset = searchOffset + SEARCH_PAGE_SIZE;
      setSearchOffset(newOffset);
      setHasMoreResults(newOffset < allResults.tracks.length);
    }
    
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMoreResults, reviewType, searchOffset, allResults]);

  const handleSearchScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
      loadMoreResults();
    }
  }, [loadMoreResults]);

  const handleSelectAlbum = async (selectedItem: SearchAlbum) => {
    const albumData: any = {
      id: selectedItem.id,
      title: selectedItem.title,
      artist: selectedItem.artist,
      cover: selectedItem.cover,
      genre: selectedItem.genre,
      url: selectedItem.url,
      previewUrl: selectedItem.previewUrl,
    };
    setSelectedAlbum(albumData);
    setSearchQuery("");
    setShowSearchResults(false);
    toast.success(`Selected: ${selectedItem.title}`);

    // Resolve cross-platform links in background
    if (selectedItem.url) {
      const links = await getSonglinkData(selectedItem.url);
      setSelectedAlbum((prev: any) => prev ? { ...prev, spotifyUrl: links.spotifyUrl, appleMusicUrl: links.appleMusicUrl } : prev);
    }
  };
  
  const handleSelectTrack = async (selectedItem: SearchTrack) => {
    const trackData: any = {
      id: selectedItem.id,
      title: selectedItem.title,
      artist: selectedItem.artist,
      cover: selectedItem.albumCover,
      duration: selectedItem.duration,
      url: selectedItem.url,
      previewUrl: selectedItem.previewUrl,
    };
    setSelectedAlbum(trackData);
    setSearchQuery("");
    setShowSearchResults(false);
    toast.success(`Selected: ${selectedItem.title}`);

    // Resolve cross-platform links in background
    if (selectedItem.url) {
      const links = await getSonglinkData(selectedItem.url);
      setSelectedAlbum((prev: any) => prev ? { ...prev, spotifyUrl: links.spotifyUrl, appleMusicUrl: links.appleMusicUrl } : prev);
    }
  };
  
  // Word counts
  const moodWordCount = countWords(mood);
  const whereWordCount = countWords(whereListened);
  const whenWordCount = countWords(whenListened);

  const handleAddEmoji = (emoji: string) => {
    const newMood = mood + emoji;
    if (countWords(newMood) <= 50) {
      setMood(newMood);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = () => {
    const trimmedTag = customTagInput.trim().toLowerCase();
    
    if (!trimmedTag) return;
    
    // Check if tag already exists (in preset or custom)
    if (tags.includes(trimmedTag) || customTags.includes(trimmedTag)) {
      toast.error("This tag already exists!");
      return;
    }
    
    // Limit tag length
    if (trimmedTag.length > 20) {
      toast.error("Tag must be 20 characters or less");
      return;
    }
    
    // Add to custom tags and select it
    setCustomTags((prev) => [...prev, trimmedTag]);
    setSelectedTags((prev) => [...prev, trimmedTag]);
    setCustomTagInput("");
    toast.success(`Added custom tag: ${trimmedTag}`);
  };

  const handleRemoveCustomTag = (tag: string) => {
    setCustomTags((prev) => prev.filter((t) => t !== tag));
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCustomTag();
    }
  };

const handlePublish = async () => {
  if (!album) {
    toast.error("Please select an album or track to review");
    return;
  }

  setIsPublishing(true);

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("You are not logged in. Please log in again.");

    const uid = user.id;

    // Get real profile data
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, username, avatar_url")
      .eq("id", uid)
      .single();

    const userName = profile?.display_name || profile?.username || user.email?.split("@")[0] || "user";
    const userAvatar = profile?.avatar_url || null;

    const dbRating = rating;

    const payload = {
      uid,
      user_name: userName,
      user_avatar: userAvatar,

      album_id: album.id,
      album_title: album.title,
      album_artist: album.artist,
      album_url: album.url ?? null,
      preview_url: album.previewUrl ?? null,
      spotify_url: album.spotifyUrl ?? null,

      rating: dbRating,
      review_type: reviewType,
      content: reviewText,
      tags: selectedTags,
      is_public: isPublic,

      album_cover: album.cover ?? null,
      mood: mood || null,
      where_listened: whereListened || null,
      when_listened: whenListened || null,
      favorite_track: favoriteTrack || null,
    };

    if (editingReview) {
      // ✅ UPDATE
      const { error } = await supabase
        .from("reviews")
        .update(payload)
        .eq("id", editingReview.id)
        .eq("uid", uid); // prevents editing someone else's

      if (error) throw error;

      toast.success("Review updated successfully!");
      onClearEdit?.();
      onBack?.();
      return;
    }

    // ✅ INSERT (do NOT send id, let default gen_random_uuid() handle it)
    const { error } = await supabase.from("reviews").insert(payload);

    if (error) throw error;

    setIsPublished(true);
    toast.success("Review published successfully!");
  } catch (e: any) {
    toast.error(e?.message ?? "Failed to publish review");
  } finally {
    setIsPublishing(false);
  }
};


  const handleSaveDraft = () => {
    // Save to localStorage
    const draft = {
      reviewType,
      rating,
      reviewText,
      mood,
      whereListened,
      whenListened,
      favoriteTrack,
      selectedTags,
      isPublic,
      albumId: album.id,
      timestamp: new Date().toISOString(),
    };
    
    const drafts = JSON.parse(localStorage.getItem("review-drafts") || "[]");
    drafts.push(draft);
    localStorage.setItem("review-drafts", JSON.stringify(drafts));
    
    toast.success("Draft saved! You can continue later.");
  };

  const handleReset = () => {
    setRating(0);
    setReviewText("");
    setMood("");
    setWhereListened("");
    setWhenListened("");
    setFavoriteTrack("");
    setSelectedTags([]);
    setCustomTagInput("");
    setCustomTags([]);
    setIsPublic(true);
    setIsPublished(false);
  };

  if (isPublished) {
    return (
      <ReviewConfirmation
        onViewReview={() => onNavigate?.("your-space-reviews")}
        onShareReview={() => toast.success("Sharing options coming soon!")}
        onWriteAnother={handleReset}
        onGoHome={onBack || (() => onNavigate?.("home"))}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title={editingReview ? "Edit Review" : "Write a Review"}
        subtitle={editingReview ? "Update your thoughts and ratings" : "Share your thoughts about music you love"}
        showBackButton={!!onBack}
        onBack={onBack}
      />

      {/* Review Type Selector */}
      <Card className="p-4 md:p-6 bg-card border-border">
        <Label className="text-foreground mb-3 block text-sm md:text-base">What are you reviewing?</Label>
        <Tabs value={reviewType} onValueChange={(v) => setReviewType(v as "album" | "track")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="album" className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base">
              <Disc className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Album
            </TabsTrigger>
            <TabsTrigger value="track" className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base">
              <Music className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Track
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </Card>

      {/* Music Search */}
      <Card className="p-4 md:p-6 bg-card border-border !overflow-visible">
        <Label className="text-foreground mb-3 block text-sm md:text-base">Search for {reviewType === "album" ? "an Album" : "a Track"}</Label>
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${reviewType === "album" ? "albums" : "tracks"}... (e.g., "good kid m.A.A.d city")`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.albums.length > 0 || searchResults.tracks.length > 0) {
                  setShowSearchResults(true);
                }
              }}
              className="pl-10 bg-background border-border text-foreground text-sm md:text-base"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
            )}
          </div>
          
          {/* Search Results */}
          {showSearchResults && (searchResults.albums.length > 0 || searchResults.tracks.length > 0) && (
            <div 
              ref={searchResultsRef}
              onScroll={handleSearchScroll}
              className="mt-3 rounded-lg border border-border bg-background visible-scrollbar"
              style={{ 
                maxHeight: '300px', 
                overflowY: 'scroll',
              }}
            >
              <div className="p-2 space-y-1">
                {reviewType === "album" && searchResults.albums.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectAlbum(item)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-primary/10 transition-colors text-left"
                  >
                    <img
                      src={item.cover}
                      alt={item.title}
                      className="w-12 h-12 rounded object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.artist}</p>
                      {item.year && (
                        <p className="text-xs text-muted-foreground">{item.year}</p>
                      )}
                    </div>
                  </button>
                ))}
                
                {reviewType === "track" && searchResults.tracks.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTrack(item)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-primary/10 transition-colors text-left"
                  >
                    <img
                      src={item.albumCover}
                      alt={item.title}
                      className="w-12 h-12 rounded object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.artist}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.album}</p>
                    </div>
                  </button>
                ))}

                {/* Loading more indicator */}
                {isLoadingMore && (
                  <div className="flex items-center justify-center py-3">
                    <Loader2 className="w-4 h-4 text-primary animate-spin mr-2" />
                    <span className="text-xs text-muted-foreground">Loading more...</span>
                  </div>
                )}

                {/* End of results */}
                {!hasMoreResults && !isLoadingMore && (
                  (reviewType === "album" ? searchResults.albums.length : searchResults.tracks.length) >= SEARCH_PAGE_SIZE && (
                    <p className="text-xs text-muted-foreground text-center py-2">No more results</p>
                  )
                )}
              </div>
            </div>
          )}
          
          {showSearchResults && !isSearching && searchQuery.trim().length >= 2 && 
           searchResults.albums.length === 0 && searchResults.tracks.length === 0 && (
            <div className="mt-3 rounded-lg border border-border bg-background p-4 text-center">
              <p className="text-sm text-muted-foreground">No results found for "{searchQuery}"</p>
              <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Search for any {reviewType} by name or artist
        </p>
      </Card>

      {/* Album/Track Info */}
      <Card className="p-4 md:p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-3">
          <Label className="text-foreground text-sm md:text-base">Selected {reviewType === "album" ? "Album" : "Track"}</Label>
          {!editingReview && album && (
            <Badge variant="outline" className="text-xs text-primary border-primary/30">
              <Music className="w-3 h-3 mr-1" />
              Ready to review
            </Badge>
          )}
        </div>
        {album ? (
          <div className="flex gap-3 md:gap-4">
            <img
              src={album.cover}
              alt={album.title}
              className="w-20 h-20 md:w-24 md:h-24 rounded-lg object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-1 flex-wrap">
                <h3 className="text-base md:text-xl text-foreground truncate">{album.title}</h3>
                <Badge className={`text-xs flex-shrink-0 ${reviewType === "track" ? "bg-secondary/20 text-secondary border-0" : "bg-chart-3/20 text-chart-3 border-0"}`}>
                  {reviewType === "track" ? "Track" : "Album"}
                </Badge>
              </div>
              <p className="text-sm md:text-base text-muted-foreground mb-2 truncate">{album.artist}</p>
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                {album.genre && (
                  <Badge className="bg-muted/50 text-foreground border-0 text-xs">
                    {album.genre}
                  </Badge>
                )}
                {reviewType === "track" && album.duration && (
                  <Badge className="bg-muted/50 text-foreground border-0 text-xs">
                    {formatDuration(album.duration)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-center">
            <div className="space-y-2">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">
                Search and select {reviewType === "album" ? "an album" : "a track"} above to get started
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Rating */}
      <Card className="p-4 md:p-6 bg-card border-border">
        <Label className="text-foreground mb-3 block text-sm md:text-base">Your Rating</Label>
        <p className="text-xs md:text-sm text-muted-foreground mb-4">
          Click the left side of a star for a half rating, or the right side for a full rating
        </p>
        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          <StarRating 
            rating={hoveredRating || rating} 
            size="lg" 
            interactive
            onRatingChange={setRating}
            onHover={setHoveredRating}
          />
          {rating > 0 && (
            <span className="text-xl md:text-2xl text-foreground">{rating.toFixed(1)}</span>
          )}
        </div>
      </Card>

      {/* Review Text */}
      <Card className="p-4 md:p-6 bg-card border-border">
        <Label className="text-foreground mb-3 block text-sm md:text-base">Your Review</Label>
        <Textarea
          placeholder="What did you think about this album? Share your detailed thoughts..."
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          className="min-h-[120px] md:min-h-[150px] bg-background border-border text-foreground resize-none text-sm md:text-base"
        />
        <p className="text-xs text-muted-foreground mt-2">
          {reviewText.length} / 500 characters
        </p>
      </Card>

      {/* Listening Context - Mood, Where, When */}
      <Card className="p-4 md:p-6 bg-card border-border space-y-4 md:space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Smile className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            <Label className="text-foreground text-sm md:text-base">Mood</Label>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mb-3">
            How did this music make you feel? Click emojis to add them!
          </p>
          
          {/* Emoji Picker */}
          <div className="flex flex-wrap gap-1.5 mb-3 p-3 bg-background/50 rounded-lg border border-border">
            {moodEmojis.map((emoji, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleAddEmoji(emoji)}
                className="text-xl md:text-2xl hover:scale-125 transition-transform active:scale-110 p-1 hover:bg-primary/10 rounded"
                title={`Add ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
          
          <Textarea
            placeholder="e.g., Feeling nostalgic and reflective 🌙💭 This album transported me back..."
            value={mood}
            onChange={(e) => {
              const text = e.target.value;
              if (countWords(text) <= 50) {
                setMood(text);
              }
            }}
            className="min-h-[80px] bg-background border-border text-foreground resize-none text-sm md:text-base"
          />
          <p className={`text-xs mt-2 ${moodWordCount > 45 ? 'text-accent' : 'text-muted-foreground'}`}>
            {moodWordCount} / 50 words
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Navigation className="w-4 h-4 md:w-5 md:h-5 text-secondary" />
            <Label className="text-foreground text-sm md:text-base">Where</Label>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mb-3">
            Where were you when you listened?
          </p>
          <Textarea
            placeholder="e.g., Late night drive through the city. Windows down, lights blurring by..."
            value={whereListened}
            onChange={(e) => {
              const text = e.target.value;
              if (countWords(text) <= 50) {
                setWhereListened(text);
              }
            }}
            className="min-h-[80px] bg-background border-border text-foreground resize-none text-sm md:text-base"
          />
          <p className={`text-xs mt-2 ${whereWordCount > 45 ? 'text-accent' : 'text-muted-foreground'}`}>
            {whereWordCount} / 50 words
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 md:w-5 md:h-5 text-accent" />
            <Label className="text-foreground text-sm md:text-base">When</Label>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mb-3">
            When did you experience this? Time, date, or context.
          </p>
          <Textarea
            placeholder="e.g., 3am on a Saturday morning. Couldn't sleep, needed something familiar..."
            value={whenListened}
            onChange={(e) => {
              const text = e.target.value;
              if (countWords(text) <= 50) {
                setWhenListened(text);
              }
            }}
            className="min-h-[80px] bg-background border-border text-foreground resize-none text-sm md:text-base"
          />
          <p className={`text-xs mt-2 ${whenWordCount > 45 ? 'text-accent' : 'text-muted-foreground'}`}>
            {whenWordCount} / 50 words
          </p>
        </div>
      </Card>

      {/* Favorite Track (only for albums) */}
      {reviewType === "album" && (
        <Card className="p-4 md:p-6 bg-card border-border">
          <Label className="text-foreground mb-3 block text-sm md:text-base">Favorite Track (Optional)</Label>
          <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
            Which track stood out to you the most?
          </p>
          <Input
            placeholder="e.g., Let It Happen"
            value={favoriteTrack}
            onChange={(e) => setFavoriteTrack(e.target.value)}
            className="bg-background border-border text-foreground text-sm md:text-base"
          />
        </Card>
      )}

      {/* Tags */}
      <Card className="p-4 md:p-6 bg-card border-border">
        <Label className="text-foreground mb-3 block text-sm md:text-base">Add Tags</Label>
        
        {/* Preset Tags */}
        <div className="flex flex-wrap gap-1.5 md:gap-2 mb-4">
          {tags.map((tag) => (
            <Badge
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`cursor-pointer transition hover:scale-105 text-xs md:text-sm ${
                selectedTags.includes(tag)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-muted/80"
              }`}
            >
              {tag}
            </Badge>
          ))}
        </div>

        {/* Custom Tags */}
        {customTags.length > 0 && (
          <div className="mb-4">
            <Label className="text-foreground mb-2 block text-xs md:text-sm text-muted-foreground">Your Custom Tags</Label>
            <div className="flex flex-wrap gap-1.5 md:gap-2">
              {customTags.map((tag) => (
                <Badge
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`cursor-pointer transition hover:scale-105 text-xs md:text-sm group relative pr-7 ${
                    selectedTags.includes(tag)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  {tag}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveCustomTag(tag);
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Add Custom Tag Input */}
        <div className="space-y-2">
          <Label className="text-foreground text-xs md:text-sm text-muted-foreground">Create Your Own Tag</Label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., nostalgic, vibes, lyrical..."
              value={customTagInput}
              onChange={(e) => setCustomTagInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="bg-background border-border text-foreground text-sm md:text-base flex-1"
              maxLength={20}
            />
            <Button
              type="button"
              onClick={handleAddCustomTag}
              disabled={!customTagInput.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0"
              size="sm"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Press Enter or click + to add. Max 20 characters.
          </p>
        </div>
      </Card>

      {/* Preview */}
      {album && (rating > 0 || reviewText || mood || whereListened || whenListened) && (
        <Card className="p-4 md:p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20 mb-6">
          <Label className="text-foreground mb-3 md:mb-4 block text-sm md:text-base font-semibold">Preview</Label>
          <Card className="p-3 md:p-5 bg-card border-border">
            <div className="flex gap-3 md:gap-4">
              <img
                src={album.cover}
                alt={album.title}
                className="w-16 h-16 md:w-24 md:h-24 rounded-lg object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 md:gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm md:text-base text-foreground mb-0.5 truncate">{album.title}</h4>
                    <p className="text-xs md:text-sm text-muted-foreground truncate">{album.artist}</p>
                  </div>
                  {rating > 0 && (
                    <div className="flex items-center gap-1 md:gap-1.5 bg-gradient-to-br from-primary/15 to-primary/5 px-2 py-1 md:px-3 md:py-1.5 rounded-full flex-shrink-0">
                      <StarRating rating={rating} size="sm" showNumber />
                    </div>
                  )}
                </div>

                {/* Context Preview */}
                {(mood || whereListened || whenListened || favoriteTrack) && (
                  <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                    {mood && (
                      <Badge className="bg-gradient-to-r from-primary/15 to-primary/5 text-foreground border-primary/20 border px-1.5 py-0.5 md:px-2 text-xs">
                        <Smile className="w-3 h-3 mr-1 inline" />
                        <span className="text-[10px] md:text-xs line-clamp-1">{mood}</span>
                      </Badge>
                    )}
                    {whereListened && (
                      <Badge className="bg-gradient-to-r from-secondary/15 to-secondary/5 text-foreground border-secondary/20 border px-1.5 py-0.5 md:px-2 text-xs">
                        <Navigation className="w-3 h-3 mr-1 inline" />
                        <span className="text-[10px] md:text-xs line-clamp-1">{whereListened}</span>
                      </Badge>
                    )}
                    {whenListened && (
                      <Badge className="bg-gradient-to-r from-accent/15 to-accent/5 text-foreground border-accent/20 border px-1.5 py-0.5 md:px-2 text-xs">
                        <Clock className="w-3 h-3 mr-1 inline" />
                        <span className="text-[10px] md:text-xs line-clamp-1">{whenListened}</span>
                      </Badge>
                    )}
                    {favoriteTrack && (
                      <Badge className="bg-gradient-to-r from-chart-3/15 to-chart-3/5 text-foreground border-chart-3/20 border px-1.5 py-0.5 md:px-2 text-xs">
                        <span className="text-[10px] md:text-xs">♫ {favoriteTrack}</span>
                      </Badge>
                    )}
                  </div>
                )}

                {reviewText && (
                  <p className="text-xs md:text-sm text-foreground/90 leading-relaxed line-clamp-3 mb-2 md:mb-3">
                    {reviewText}
                  </p>
                )}

                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 md:gap-1.5">
                    {selectedTags.map((tag) => (
                      <Badge
                        key={tag}
                        className="bg-muted/50 text-muted-foreground border-0 text-[10px] md:text-xs"
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
          <div className="border-t border-border my-4" />
          <p className="text-center text-xs md:text-sm text-muted-foreground">Looks good? If so, publish below!</p>
        </Card>
      )}

      {/* Privacy & Submit */}
      <Card className="p-4 md:p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-4 md:mb-6 gap-3">
          <div className="flex-1">
            <Label className="text-foreground mb-1 block text-sm md:text-base">Share with Community</Label>
            <p className="text-xs md:text-sm text-muted-foreground">
              Post this review to your community feed
            </p>
          </div>
          <Switch checked={isPublic} onCheckedChange={setIsPublic} className="flex-shrink-0" />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
          <Button 
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-sm md:text-base"
            disabled={!album || rating === 0 || !reviewText || isPublishing}
            onClick={handlePublish}
          >
            <Music className="w-3.5 h-3.5 md:w-4 md:h-4 mr-2" />
            {isPublishing ? (editingReview ? "Saving..." : "Publishing...") : (editingReview ? "Save Changes" : "Publish Review")}
          </Button>
          {(!rating || !reviewText) && (
            <p className="text-xs text-destructive mt-2">Please provide both a rating and a review before publishing.</p>
          )}
          {editingReview ? (
            <Button 
              variant="outline" 
              className="border-border text-sm md:text-base sm:w-auto"
              onClick={() => {
                onClearEdit?.();
                onBack?.();
              }}
            >
              <X className="w-3.5 h-3.5 md:w-4 md:h-4 mr-2" />
              Cancel
            </Button>
          ) : (
            <Button 
              variant="outline" 
              className="border-border text-sm md:text-base sm:w-auto"
              onClick={handleSaveDraft}
              disabled={!reviewText && rating === 0}
            >
              <Save className="w-3.5 h-3.5 md:w-4 md:h-4 mr-2" />
              Save Draft
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}