'use client';

import { CommentItem } from './comment-item';
import { CommentInput } from './comment-input';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user: {
    name: string;
    avatar_url: string | null;
  };
}

interface CommentListProps {
  comments: Comment[];
  onAddComment: (content: string) => Promise<void>;
  isLoading?: boolean;
  isSubmitting?: boolean;
}

export function CommentList({ 
  comments, 
  onAddComment, 
  isLoading = false,
  isSubmitting = false 
}: CommentListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-muted/50 animate-pulse rounded" />
        <div className="h-12 bg-muted/50 animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No comments yet. Be the first to comment!
        </p>
      ) : (
        <div className="divide-y">
          {comments.map((comment) => (
            <CommentItem 
              key={comment.id} 
              comment={comment} 
            />
          ))}
        </div>
      )}
      
      <div className="pt-4 border-t">
        <CommentInput onSubmit={onAddComment} isSubmitting={isSubmitting} />
      </div>
    </div>
  );
}