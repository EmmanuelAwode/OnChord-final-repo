import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import { Heart, Send, Star, MessageCircle } from "lucide-react";
import { reviewComments } from "../lib/useReviewComments";

interface Reply {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: string;
  likes: number;
}

interface Comment {
  id: string;
  reviewId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: string;
  likes: number;
  replies?: Reply[];
}

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: {
    id: string;
    albumTitle: string;
    albumArtist: string;
    albumCover: string;
    userName: string;
    userAvatar: string;
    rating: number;
    content: string;
    timestamp: string;
    tags?: string[];
    comments: number;
  };
}

export function CommentsModal({ isOpen, onClose, review }: CommentsModalProps) {
  const [newComment, setNewComment] = useState("");
  const [likedComments, setLikedComments] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [localComments, setLocalComments] = useState<Comment[]>(() => 
    reviewComments[review.id] || []
  );

  const handleLikeComment = (commentId: string) => {
    setLikedComments(prev => 
      prev.includes(commentId) 
        ? prev.filter(id => id !== commentId)
        : [...prev, commentId]
    );
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: `rc-new-${Date.now()}`,
      reviewId: review.id,
      userId: "user-1",
      userName: "Marcus Williams",
      userAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
      content: newComment,
      timestamp: "Just now",
      likes: 0,
      replies: [],
    };

    setLocalComments([comment, ...localComments]);
    setNewComment("");
  };

  const handleAddReply = (commentId: string) => {
    if (!replyText.trim()) return;

    const reply: Reply = {
      id: `reply-${Date.now()}`,
      userId: "user-1",
      userName: "Marcus Williams",
      userAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
      content: replyText,
      timestamp: "Just now",
      likes: 0,
    };

    setLocalComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), reply],
        };
      }
      return comment;
    }));

    setReplyText("");
    setReplyingTo(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleAddComment();
    }
  };

  const handleReplyKeyPress = (e: React.KeyboardEvent, commentId: string) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleAddReply(commentId);
    }
  };

  const totalComments = localComments.reduce((total, comment) => {
    return total + 1 + (comment.replies?.length || 0);
  }, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 bg-card border-border overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Comments</DialogTitle>
          <DialogDescription>
            View and add comments to this review
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 pt-6 max-h-[calc(90vh-300px)]">
          {/* Original Review */}
          <div className="pb-4 border-b border-border mb-6">
            <div className="flex gap-4 mb-4">
              <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
                <img
                  src={review.albumCover}
                  alt={review.albumTitle}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <h3 className="text-foreground truncate">{review.albumTitle}</h3>
                    <p className="text-sm text-muted-foreground truncate">{review.albumArtist}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-primary/20 px-3 py-1 rounded-full flex-shrink-0">
                    <Star className="w-4 h-4 text-primary fill-primary" />
                    <span className="text-foreground">{review.rating}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-primary">
                  {review.userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm text-foreground">{review.userName}</p>
                <p className="text-xs text-muted-foreground">{review.timestamp}</p>
              </div>
            </div>

            {review.tags && (
              <div className="flex flex-wrap gap-2 mb-3">
                {review.tags.map((tag) => (
                  <Badge key={tag} className="bg-primary/10 text-primary border-0 text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <p className="text-foreground text-sm">{review.content}</p>
          </div>

          {/* Comments List */}
          <div className="space-y-4 pb-4">
            <h4 className="text-sm text-muted-foreground">
              {totalComments} {totalComments === 1 ? 'Comment' : 'Comments'}
            </h4>
            
            {localComments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-2">No comments yet</p>
                <p className="text-sm text-muted-foreground">Be the first to share your thoughts!</p>
              </div>
            ) : (
              localComments.map((comment) => (
                <div key={comment.id} className="space-y-3">
                  {/* Main Comment */}
                  <div className="flex gap-3 p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition animate-fade-in">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm text-primary">
                        {comment.userName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm text-foreground">{comment.userName}</p>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
                      </div>
                      <p className="text-sm text-foreground mb-2">{comment.content}</p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleLikeComment(comment.id)}
                          className={`flex items-center gap-1 text-xs transition ${
                            likedComments.includes(comment.id)
                              ? "text-secondary"
                              : "text-muted-foreground hover:text-secondary"
                          }`}
                        >
                          <Heart
                            className={`w-3 h-3 ${
                              likedComments.includes(comment.id) ? "fill-secondary" : ""
                            }`}
                          />
                          {comment.likes + (likedComments.includes(comment.id) ? 1 : 0)}
                        </button>
                        <button
                          onClick={() => {
                            setReplyingTo(replyingTo === comment.id ? null : comment.id);
                            setReplyText("");
                          }}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition"
                        >
                          <MessageCircle className="w-3 h-3" />
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-12 space-y-3">
                      {comment.replies.map((reply) => (
                        <div 
                          key={reply.id}
                          className="flex gap-3 p-3 rounded-lg bg-muted/10 hover:bg-muted/20 transition"
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs text-primary">
                              {reply.userName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm text-foreground">{reply.userName}</p>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">{reply.timestamp}</span>
                            </div>
                            <p className="text-sm text-foreground mb-2">{reply.content}</p>
                            <button
                              onClick={() => handleLikeComment(reply.id)}
                              className={`flex items-center gap-1 text-xs transition ${
                                likedComments.includes(reply.id)
                                  ? "text-secondary"
                                  : "text-muted-foreground hover:text-secondary"
                              }`}
                            >
                              <Heart
                                className={`w-3 h-3 ${
                                  likedComments.includes(reply.id) ? "fill-secondary" : ""
                                }`}
                              />
                              {reply.likes + (likedComments.includes(reply.id) ? 1 : 0)}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Input */}
                  {replyingTo === comment.id && (
                    <div className="ml-12 flex gap-2 animate-fade-in">
                      <Textarea
                        placeholder="Write a reply... (Cmd/Ctrl + Enter to post)"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => handleReplyKeyPress(e, comment.id)}
                        className="flex-1 min-h-[60px] bg-input-background border-border resize-none text-sm"
                        autoFocus
                      />
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => handleAddReply(comment.id)}
                          disabled={!replyText.trim()}
                          size="sm"
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          <Send className="w-3 h-3" />
                        </Button>
                        <Button
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyText("");
                          }}
                          size="sm"
                          variant="outline"
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Add Comment */}
        <div className="p-6 pt-4 border-t border-border bg-card">
          <div className="flex gap-3">
            <Textarea
              placeholder="Add a comment... (Cmd/Ctrl + Enter to post)"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyPress}
              className="flex-1 min-h-[80px] bg-input-background border-border resize-none"
            />
            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground self-end"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press Cmd/Ctrl + Enter to post
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
