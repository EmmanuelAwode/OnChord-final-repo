/**
 * Hook for managing review comments with Supabase
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

export interface Comment {
  id: string;
  reviewId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: string;
  likes: number;
  parentCommentId?: string;
  replies?: Comment[];
  createdAt: string;
}

interface CommentRow {
  id: string;
  review_id: string;
  user_id: string;
  content: string;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    username: string;
    avatar_url: string;
    display_name: string;
  };
}

export function useReviewComments(reviewId?: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Format timestamp for display
  const formatTimestamp = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  // Transform database row to Comment
  const transformComment = (row: CommentRow): Comment => ({
    id: row.id,
    reviewId: row.review_id,
    userId: row.user_id,
    userName: row.profiles?.display_name || row.profiles?.username || 'Unknown User',
    userAvatar: row.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${row.user_id}`,
    content: row.content,
    timestamp: formatTimestamp(row.created_at),
    likes: 0, // TODO: Add likes table for comments
    parentCommentId: row.parent_comment_id || undefined,
    createdAt: row.created_at,
  });

  // Load comments for a review
  const loadComments = useCallback(async () => {
    if (!reviewId) return;

    setIsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('review_comments')
        .select(`
          *,
          profiles:user_id (username, avatar_url, display_name)
        `)
        .eq('review_id', reviewId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      // Transform and organize comments with replies
      const allComments = (data || []).map(transformComment);
      
      // Separate top-level comments and replies
      const topLevel = allComments.filter(c => !c.parentCommentId);
      const replies = allComments.filter(c => c.parentCommentId);
      
      // Attach replies to parent comments
      const commentsWithReplies = topLevel.map(comment => ({
        ...comment,
        replies: replies.filter(r => r.parentCommentId === comment.id),
      }));

      setComments(commentsWithReplies);
      setError(null);
    } catch (err) {
      console.error('Failed to load comments:', err);
      setError(err as Error);
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  }, [reviewId]);

  // Add a new comment
  const addComment = async (content: string, parentCommentId?: string): Promise<boolean> => {
    if (!reviewId || !content.trim()) return false;

    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;
      
      if (!userId) {
        console.error('User not authenticated');
        return false;
      }

      const { error: insertError } = await supabase
        .from('review_comments')
        .insert({
          review_id: reviewId,
          user_id: userId,
          content: content.trim(),
          parent_comment_id: parentCommentId || null,
        });

      if (insertError) throw insertError;

      // Reload comments to get the new comment with profile data
      await loadComments();
      return true;
    } catch (err) {
      console.error('Failed to add comment:', err);
      return false;
    }
  };

  // Delete a comment
  const deleteComment = async (commentId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('review_comments')
        .delete()
        .eq('id', commentId);

      if (deleteError) throw deleteError;

      // Remove from local state
      setComments(prev => prev.filter(c => c.id !== commentId));
      return true;
    } catch (err) {
      console.error('Failed to delete comment:', err);
      return false;
    }
  };

  // Get comment count for a review (can be used without loading all comments)
  const getCommentCount = async (targetReviewId: string): Promise<number> => {
    try {
      const { count, error: countError } = await supabase
        .from('review_comments')
        .select('*', { count: 'exact', head: true })
        .eq('review_id', targetReviewId);

      if (countError) throw countError;
      return count || 0;
    } catch (err) {
      console.error('Failed to get comment count:', err);
      return 0;
    }
  };

  // Load comments when reviewId changes
  useEffect(() => {
    if (reviewId) {
      loadComments();
    }
  }, [reviewId, loadComments]);

  return {
    comments,
    isLoading,
    error,
    addComment,
    deleteComment,
    getCommentCount,
    reload: loadComments,
  };
}

// Export empty object for backward compatibility during migration
// Components can gradually switch to useReviewComments hook
export const reviewComments: Record<string, any[]> = {};
