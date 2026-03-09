import { X, Star, Heart, MessageCircle, Calendar, Music, Headphones, MapPin, Clock, Globe, Users, Lock, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { handleImageError } from "./ui/utils";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";
import { EditedIndicator } from "./EditedIndicator";
import { useSupabaseLikes } from "../lib/useSupabaseLikes";

interface ReviewDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: {
    id: string;
    userId?: string;
    userName?: string;
    userAvatar?: string;
    albumId?: string;
    albumTitle: string;
    albumArtist: string;
    albumCover: string;
    albumUrl?: string;
    rating: number;
    content: string;
    timestamp: string;
    date?: string;
    likes: number;
    comments: number;
    tags?: string[];
    mood?: string;
    whereListened?: string;
    whenListened?: string;
    listeningContext?: string;
    favoriteTrack?: string;
    type?: "album" | "track";
    trackDuration?: string;
    isEdited?: boolean;
    editedAt?: string;
    visibility?: "public" | "friends" | "private";
  } | null;
  onOpenComments?: () => void;
  onOpenAlbum?: () => void;
  onEditReview?: (review: any) => void;
  onDeleteReview?: (reviewId: string) => void;
}

export function ReviewDetailModal({ 
  isOpen, 
  onClose, 
  review,
  onOpenComments,
  onOpenAlbum,
  onEditReview,
  onDeleteReview
}: ReviewDetailModalProps) {
  const { toggleReviewLike, isReviewLiked, getReviewLikes, isLoading: isLikesLoading } = useSupabaseLikes();
  
  // Early return if review is null
  if (!review) {
    return null;
  }
  
  const currentLikes = getReviewLikes(review.id);
  const isLiked = isReviewLiked(review.id);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleReviewLike(review.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Hidden accessible title and description for screen readers */}
        <DialogTitle className="sr-only">
          Review Details: {review.albumTitle} by {review.albumArtist}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Full review details including rating, content, tags, and listening context for {review.albumTitle}
        </DialogDescription>

        {/* Header with Album Info */}
        <div className="relative bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/10 p-6 pr-14 border-b border-border">
          {/* Album Cover & Info */}
          <div className="flex gap-6">
            <div 
              className="flex-shrink-0 cursor-pointer group"
              onClick={() => {
                onOpenAlbum?.();
                onClose();
              }}
            >
              <img
                src={review.albumCover}
                alt={review.albumTitle}
                className="w-32 h-32 rounded-lg object-cover shadow-lg group-hover:scale-105 transition-transform"
                onError={handleImageError}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl text-foreground mb-1 line-clamp-2">
                    {review.albumTitle}
                  </h2>
                  <p className="text-muted-foreground mb-2">
                    {review.albumArtist}
                  </p>
                  {review.type === "track" && review.trackDuration && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Music className="w-3 h-3" />
                      <span>{review.trackDuration}</span>
                    </div>
                  )}
                  {review.albumUrl && (
                    <a
                      href={review.albumUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-sm text-primary hover:text-primary/80 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open in iTunes</span>
                    </a>
                  )}
                </div>

                {/* Rating Badge */}
                <div className="flex items-center gap-1.5 bg-primary/20 px-4 py-2 rounded-full">
                  <Star className="w-5 h-5 text-primary fill-primary" />
                  <span className="text-xl text-foreground">{review.rating}</span>
                </div>
              </div>

              {/* Reviewer Info */}
              {review.userName && (
                <div className="flex items-center gap-2 flex-wrap">
                  {review.userAvatar && (
                    <Avatar className="w-8 h-8">
                      <img src={review.userAvatar} alt={review.userName} />
                    </Avatar>
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{review.userName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{review.timestamp}</span>
                      {review.isEdited && review.editedAt && (
                        <>
                          <span>•</span>
                          <EditedIndicator isEdited={review.isEdited} editedAt={review.editedAt} />
                        </>
                      )}
                    </div>
                  </div>
                  {/* Visibility Badge */}
                  {review.visibility && (
                    <Badge 
                      className={
                        review.visibility === "public"
                          ? "bg-secondary/20 text-secondary border-0 text-xs"
                          : review.visibility === "friends"
                          ? "bg-primary/20 text-primary border-0 text-xs"
                          : "bg-muted text-muted-foreground border-0 text-xs"
                      }
                    >
                      {review.visibility === "public" && <Globe className="w-3 h-3 mr-1" />}
                      {review.visibility === "friends" && <Users className="w-3 h-3 mr-1" />}
                      {review.visibility === "private" && <Lock className="w-3 h-3 mr-1" />}
                      {review.visibility === "public" && "Public"}
                      {review.visibility === "friends" && "Friends"}
                      {review.visibility === "private" && "Private"}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-250px)] p-6 space-y-6">
          {/* Tags */}
          {review.tags && review.tags.length > 0 && (
            <div>
              <h3 className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-primary rounded-full"></span>
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {review.tags.map((tag) => (
                  <Badge 
                    key={tag} 
                    className="bg-primary/10 text-primary border-0"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Review Content */}
          <div>
            <h3 className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-primary rounded-full"></span>
              Review
            </h3>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
              {review.content}
            </p>
          </div>

          {/* Listening Context */}
          {(review.mood || review.whereListened || review.whenListened || review.listeningContext || review.favoriteTrack) && (
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-3">
                {review.mood && (
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 flex-shrink-0">
                      <span className="text-xl">
                        {review.mood.includes('') ? '😊' :
                         review.mood.includes('😔') ? '😔' :
                         review.mood.includes('😤') ? '😤' :
                         review.mood.includes('😌') ? '😌' :
                         review.mood.includes('🔥') ? '🔥' :
                         review.mood.includes('🧠') ? '🧠' :
                         review.mood.includes('💪') ? '💪' :
                         review.mood.includes('😭') ? '😭' :
                         review.mood.includes('😴') ? '😴' :
                         review.mood.includes('🎉') ? '🎉' :
                         review.mood.includes('🧘') ? '🧘' :
                         '🎵'}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Mood</p>
                      <p className="text-sm text-foreground">
                        {review.mood.replace(/😊|😔|😤|😌|🔥|🧠|💪|😭|😴|🎉|🧘/g, '').trim() || review.mood}
                      </p>
                    </div>
                  </div>
                )}

                {review.whereListened && (
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary/10 flex-shrink-0">
                      <MapPin className="w-4 h-4 text-secondary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Where</p>
                      <p className="text-sm text-foreground">{review.whereListened}</p>
                    </div>
                  </div>
                )}

                {review.whenListened && (
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10 flex-shrink-0">
                      <Clock className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">When</p>
                      <p className="text-sm text-foreground">{review.whenListened}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-3">
                {review.listeningContext && (
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 flex-shrink-0">
                      <Headphones className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Context</p>
                      <p className="text-sm text-foreground">{review.listeningContext}</p>
                    </div>
                  </div>
                )}

                {review.favoriteTrack && (
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary/10 flex-shrink-0">
                      <Music className="w-4 h-4 text-secondary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Favorite Track</p>
                      <p className="text-sm text-foreground">{review.favoriteTrack}</p>
                    </div>
                  </div>
                )}

                {review.date && (
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10 flex-shrink-0">
                      <Calendar className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="text-sm text-foreground">{review.date}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        <div className="p-6 pt-4 border-t border-border bg-muted/20 flex items-center gap-4">
          <button 
            onClick={handleLikeClick}
            className={`flex items-center gap-2 transition-colors ${
              isLiked 
                ? 'text-accent hover:text-accent/80' 
                : 'text-muted-foreground hover:text-primary'
            }`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-accent' : ''}`} />
            <span>{currentLikes}</span>
          </button>
          
          <button 
            onClick={() => {
              onOpenComments?.();
              onClose();
            }}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            <span>{review.comments}</span>
          </button>

          {/* Edit/Delete for owner */}
          {review.userId === (window.currentUser?.id || window.localStorage.getItem('userId')) && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto border-border hover:border-primary hover:text-primary"
                onClick={() => {
                  onClose();
                  window.onEditReview?.(review);
                }}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="border-border ml-2"
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this review?')) {
                    window.onDeleteReview?.(review.id);
                    onClose();
                  }
                }}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}