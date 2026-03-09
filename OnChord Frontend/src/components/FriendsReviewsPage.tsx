import { useState, useEffect } from "react";
import { Star, Heart, MessageCircle, ArrowLeft, Calendar as CalendarIcon, Music, Disc, Edit, Share2, Loader2 } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { CommentsModal } from "./CommentsModal";
import { reviewComments } from "../lib/useReviewComments";
import { toast } from "sonner";
import { useReviews } from "../lib/useUserInteractions";
import { useSupabaseLikes } from "../lib/useSupabaseLikes";
import { BackButton } from "./BackButton";
import { getFriendsReviews } from "../lib/api/reviews";
import { supabase } from "../lib/supabaseClient";

interface FriendsReviewsPageProps {
  onNavigate?: (page: string) => void;
  onOpenAlbum?: () => void;
  onBack?: () => void;
  canGoBack?: boolean;
}

export function FriendsReviewsPage({ onNavigate, onOpenAlbum, onBack, canGoBack }: FriendsReviewsPageProps) {
  const { toggleReviewLike, isReviewLiked, getReviewLikes, isLoading: isLikesLoading } = useSupabaseLikes();
  const [friendsReviews, setFriendsReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [reviewDetailModalOpen, setReviewDetailModalOpen] = useState(false);
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const [selectedCommentReview, setSelectedCommentReview] = useState<any>(null);

  // Fetch friends' reviews
  useEffect(() => {
    async function loadFriendsReviews() {
      try {
        const reviews = await getFriendsReviews(50);
        setFriendsReviews(reviews);
      } catch (error) {
        console.error("Failed to load friends' reviews:", error);
        toast.error("Failed to load friends' reviews");
      } finally {
        setIsLoading(false);
      }
    }
    loadFriendsReviews();
  }, []);

  const handleToggleLike = (e: React.MouseEvent, reviewId: string, initialLikes: number) => {
    e.stopPropagation();
    toggleReviewLike(reviewId, initialLikes);
  };

  const handleReviewClick = (review: any) => {
    setSelectedReview(review);
    setReviewDetailModalOpen(true);
  };

  const handleShare = (review: any) => {
    // Simulate copying link to clipboard
    toast.success("Link copied to clipboard!", {
      description: `Share ${review.userName}'s review of ${review.albumTitle}`
    });
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-4">
          <BackButton onClick={onBack || (() => onNavigate?.("your-space-followers"))} label={canGoBack ? "Back" : "Back to Followers"} />
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl text-foreground">Friends' Reviews</h1>
            <p className="text-sm text-muted-foreground mt-1">
              See what your friends are listening to
            </p>
          </div>
        </div>
      </div>

      {/* Reviews Grid */}
      <div className="space-y-4">
        {friendsReviews.map((review) => {
          const isLiked = isReviewLiked(review.id);
          const likeCount = getReviewLikes(review.id, review.likes);
          const commentCount = reviewComments[review.id]?.length || review.comments || 0;
          
          return (
          <Card
            key={review.id}
            onClick={() => handleReviewClick(review)}
            className="p-4 md:p-6 bg-card border-border hover:border-primary/50 transition-all shadow-soft hover:shadow-medium cursor-pointer"
          >
            <div className="flex gap-4">
              {/* Album Cover */}
              <div
                className="flex-shrink-0 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAlbum?.();
                }}
              >
                <img
                  src={review.albumCover}
                  alt={review.albumTitle}
                  className="w-20 h-20 md:w-24 md:h-24 rounded-lg object-cover hover:scale-105 transition-transform"
                />
              </div>

              <div className="flex-1 min-w-0">
                {/* User Info */}
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={review.userAvatar}
                    alt={review.userName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{review.userName}</p>
                    <p className="text-xs text-muted-foreground">{review.timestamp}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-primary/20 px-3 py-1 rounded-full">
                    <Star className="w-4 h-4 text-primary fill-primary" />
                    <span className="text-foreground">{review.rating}</span>
                  </div>
                </div>

                {/* Album Info */}
                <div className="mb-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-foreground truncate">{review.albumTitle}</h3>
                    {review.type === "track" && (
                      <Badge className="bg-secondary/15 text-secondary border-secondary/30 border px-1.5 py-0 text-xs flex-shrink-0">
                        <Music className="w-3 h-3 mr-0.5" />
                        Track
                      </Badge>
                    )}
                    {review.type === "album" && (
                      <Badge className="bg-chart-3/15 text-chart-3 border-chart-3/30 border px-1.5 py-0 text-xs flex-shrink-0">
                        <Disc className="w-3 h-3 mr-0.5" />
                        Album
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{review.albumArtist}</p>
                </div>

                {/* Personality Tags */}
                {(review.mood || review.whereListened || review.whenListened || review.favoriteTrack) && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    {review.mood && (
                      <Badge className="bg-gradient-to-r from-primary/15 to-primary/5 text-foreground border-primary/20 border text-xs px-2 py-0.5 whitespace-normal">
                        {review.mood}
                      </Badge>
                    )}
                    {review.whereListened && (
                      <Badge className="bg-gradient-to-r from-secondary/15 to-secondary/5 text-foreground border-secondary/20 border text-xs px-2 py-0.5 whitespace-normal">
                        {review.whereListened}
                      </Badge>
                    )}
                    {review.whenListened && (
                      <Badge className="bg-gradient-to-r from-accent/15 to-accent/5 text-foreground border-accent/20 border text-xs px-2 py-0.5 whitespace-normal">
                        {review.whenListened}
                      </Badge>
                    )}
                    {review.favoriteTrack && (
                      <Badge className="bg-gradient-to-r from-chart-3/15 to-chart-3/5 text-foreground border-chart-3/20 border text-xs px-2 py-0.5 whitespace-normal">
                        ♫ {review.favoriteTrack}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Tags */}
                {review.tags && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {review.tags.map((tag: string) => (
                      <Badge key={tag} className="bg-primary/10 text-primary border-0 text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Review Content */}
                <p className="text-foreground mb-3 text-sm line-clamp-2">{review.content}</p>

                {/* Actions */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <button
                    onClick={(e) => handleToggleLike(e, review.id, review.likes)}
                    className={`flex items-center gap-1 transition ${
                      isLiked ? "text-secondary" : "hover:text-secondary"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? "fill-secondary" : ""}`} />
                    {likeCount}
                  </button>
                  <button className="flex items-center gap-1 hover:text-primary transition">
                    <MessageCircle className="w-4 h-4" />
                    {commentCount}
                  </button>
                  <span className="ml-auto text-xs">{review.timestamp}</span>
                </div>
              </div>
            </div>
          </Card>
        );
        })}
      </div>

      {/* Review Detail Modal */}
      <Dialog open={reviewDetailModalOpen} onOpenChange={setReviewDetailModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] p-0 gap-0">
          {selectedReview && (
            <>
              <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border bg-gradient-to-br from-primary/10 to-secondary/10">
                <DialogTitle className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/20">
                    <Star className="w-5 h-5 text-primary fill-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg text-foreground">Review by {selectedReview.userName}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {selectedReview.timestamp}
                    </p>
                  </div>
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Full details of {selectedReview.userName}'s review for {selectedReview.albumTitle}
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[calc(90vh-120px)]">
                <div className="p-4 sm:p-6 space-y-6">
                  {/* User Info */}
                  <div className="flex items-center gap-3 pb-4 border-b border-border">
                    <img
                      src={selectedReview.userAvatar}
                      alt={selectedReview.userName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <p className="text-base text-foreground">{selectedReview.userName}</p>
                      <p className="text-sm text-muted-foreground">{selectedReview.timestamp}</p>
                    </div>
                  </div>

                  {/* Album Info */}
                  <div className="flex gap-4 sm:gap-6">
                    <div
                      className="flex-shrink-0 cursor-pointer group/cover"
                      onClick={() => {
                        setReviewDetailModalOpen(false);
                        onOpenAlbum?.();
                      }}
                    >
                      <img
                        src={selectedReview.albumCover}
                        alt={selectedReview.albumTitle}
                        className="w-32 h-32 sm:w-40 sm:h-40 rounded-lg object-cover shadow-medium group-hover/cover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-2 flex-wrap">
                        <h3 className="text-xl sm:text-2xl text-foreground">
                          {selectedReview.albumTitle}
                        </h3>
                        {selectedReview.type === "track" && (
                          <Badge className="bg-secondary/15 text-secondary border-secondary/30 border px-2 py-1 text-xs">
                            <Music className="w-3 h-3 mr-1" />
                            Track
                          </Badge>
                        )}
                        {selectedReview.type === "album" && (
                          <Badge className="bg-chart-3/15 text-chart-3 border-chart-3/30 border px-2 py-1 text-xs">
                            <Disc className="w-3 h-3 mr-1" />
                            Album
                          </Badge>
                        )}
                      </div>
                      <p className="text-base text-muted-foreground mb-4">
                        {selectedReview.albumArtist}
                      </p>

                      {/* Rating */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star
                              key={i}
                              className={`w-5 h-5 ${
                                i < Math.floor(selectedReview.rating)
                                  ? "text-primary fill-primary"
                                  : "text-muted-foreground/30"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xl text-foreground">
                          {selectedReview.rating}
                        </span>
                      </div>

                      {/* Date */}
                      {selectedReview.date && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CalendarIcon className="w-4 h-4" />
                          {new Date(selectedReview.date).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Personality Tags */}
                  {(selectedReview.mood || selectedReview.whereListened || selectedReview.whenListened || selectedReview.favoriteTrack) && (
                    <div className="space-y-3">
                      <h4 className="text-sm text-muted-foreground uppercase tracking-wide">
                        Listening Experience
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedReview.mood && (
                          <Badge className="bg-gradient-to-r from-primary/15 to-primary/5 text-foreground border-primary/20 border text-sm px-3 py-1.5 whitespace-normal">
                            Mood: {selectedReview.mood}
                          </Badge>
                        )}
                        {selectedReview.whereListened && (
                          <Badge className="bg-gradient-to-r from-secondary/15 to-secondary/5 text-foreground border-secondary/20 border text-sm px-3 py-1.5 whitespace-normal">
                            Where: {selectedReview.whereListened}
                          </Badge>
                        )}
                        {selectedReview.whenListened && (
                          <Badge className="bg-gradient-to-r from-accent/15 to-accent/5 text-foreground border-accent/20 border text-sm px-3 py-1.5 whitespace-normal">
                            When: {selectedReview.whenListened}
                          </Badge>
                        )}
                        {selectedReview.favoriteTrack && (
                          <Badge className="bg-gradient-to-r from-chart-3/15 to-chart-3/5 text-foreground border-chart-3/20 border text-sm px-3 py-1.5 whitespace-normal">
                            ♫ Favorite Track: {selectedReview.favoriteTrack}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Review Content */}
                  {selectedReview.content && (
                    <div className="space-y-3">
                      <h4 className="text-sm text-muted-foreground uppercase tracking-wide">
                        Their Thoughts
                      </h4>
                      <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
                        {selectedReview.content}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {selectedReview.tags && selectedReview.tags.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm text-muted-foreground uppercase tracking-wide">
                        Tags
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedReview.tags.map((tag: string, i: number) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="bg-muted/50 text-foreground border-0 text-sm px-3 py-1.5"
                          >
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interactions */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center gap-6 text-muted-foreground">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleLike(e, selectedReview.id, selectedReview.likes);
                        }}
                        className="flex items-center gap-2 hover:text-primary transition group"
                      >
                        <Heart className={`w-5 h-5 ${isReviewLiked(selectedReview.id) ? "fill-secondary text-secondary" : ""} group-hover:fill-secondary group-hover:text-secondary transition`} />
                        <span className="text-base">
                          {getReviewLikes(selectedReview.id, selectedReview.likes)} Likes
                        </span>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setReviewDetailModalOpen(false);
                          setSelectedCommentReview(selectedReview);
                          setCommentsModalOpen(true);
                        }}
                        className="flex items-center gap-2 hover:text-primary transition"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-base">{selectedReview.comments} Comments</span>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(selectedReview);
                        }}
                        className="flex items-center gap-2 hover:text-primary transition ml-auto"
                      >
                        <Share2 className="w-5 h-5" />
                        <span className="text-base">Share</span>
                      </button>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Comments Modal */}
      {selectedCommentReview && (
        <CommentsModal
          isOpen={commentsModalOpen}
          onClose={() => {
            setCommentsModalOpen(false);
            setSelectedCommentReview(null);
          }}
          review={selectedCommentReview}
        />
      )}
    </div>
  );
}