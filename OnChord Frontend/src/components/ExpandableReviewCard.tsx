import { useState } from "react";
import { Card } from "./ui/card";
import { handleImageError } from "./ui/utils";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";
import { Star, Heart, MessageCircle, ChevronDown, ChevronUp, Music } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ExpandableReviewCardProps {
  review: {
    id: string;
    userName: string;
    userAvatar: string;
    timestamp: string;
    rating: number;
    content: string;
    likes: number;
    comments: number;
    mood?: string;
    listeningContext?: string;
    favoriteTrack?: string;
  };
}

export function ExpandableReviewCard({ review }: ExpandableReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="p-4 md:p-6 bg-card border-border hover:border-primary/30 transition-all">
      <div className="flex gap-3 md:gap-4">
        <Avatar className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0">
          <img src={review.userAvatar} alt={review.userName} className="object-cover" onError={handleImageError} />
        </Avatar>
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-foreground">{review.userName}</p>
              <p className="text-sm text-muted-foreground">{review.timestamp}</p>
            </div>
            <div className="flex items-center gap-1 bg-primary/20 px-3 py-1 rounded-full flex-shrink-0">
              <Star className="w-4 h-4 text-primary fill-primary" />
              <span className="text-foreground">{review.rating}</span>
            </div>
          </div>

          {/* Review Content - Collapsed Preview */}
          {!isExpanded && (
            <div className="mb-3">
              <p className="text-foreground line-clamp-2">{review.content}</p>
            </div>
          )}

          {/* Expandable Full Details */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-4 mb-4">
                  {/* Full Review Text */}
                  <p className="text-foreground whitespace-pre-wrap">{review.content}</p>

                  {/* Review Details */}
                  <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg p-4 space-y-3 border border-primary/10">
                    {/* Rating Detail */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-5 h-5 ${
                              star <= review.rating
                                ? "text-primary fill-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground ml-2">
                        {review.rating === 1 && "Terrible"}
                        {review.rating === 2 && "Not good"}
                        {review.rating === 3 && "It's okay"}
                        {review.rating === 4 && "Really good"}
                        {review.rating === 5 && "Masterpiece"}
                      </span>
                    </div>

                    {/* Mood */}
                    {review.mood && (
                      <div className="flex items-start gap-2">
                        <span className="text-sm text-muted-foreground min-w-[100px]">Mood:</span>
                        <Badge className="bg-primary/20 text-primary border-0 hover:bg-primary/30">
                          {review.mood}
                        </Badge>
                      </div>
                    )}

                    {/* Listening Context */}
                    {review.listeningContext && (
                      <div className="flex items-start gap-2">
                        <span className="text-sm text-muted-foreground min-w-[100px]">Context:</span>
                        <Badge className="bg-secondary/20 text-secondary border-0 hover:bg-secondary/30">
                          {review.listeningContext}
                        </Badge>
                      </div>
                    )}

                    {/* Favorite Track */}
                    {review.favoriteTrack && (
                      <div className="flex items-start gap-2">
                        <span className="text-sm text-muted-foreground min-w-[100px]">Favorite Track:</span>
                        <div className="flex items-center gap-2 text-foreground">
                          <Music className="w-4 h-4 text-accent" />
                          <span className="text-sm">{review.favoriteTrack}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex items-center gap-4 text-sm">
            <button className="flex items-center gap-1 text-muted-foreground hover:text-primary transition">
              <Heart className="w-4 h-4" />
              {review.likes}
            </button>
            <button className="flex items-center gap-1 text-muted-foreground hover:text-primary transition">
              <MessageCircle className="w-4 h-4" />
              {review.comments}
            </button>
            
            {/* Expand/Collapse Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-auto flex items-center gap-1 text-primary hover:text-primary/80 transition"
            >
              <span>{isExpanded ? "See Less" : "See More Info"}</span>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
