'use client';

import { formatDistanceToNow } from 'date-fns';

interface CommentItemProps {
  comment: {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    user: {
      name: string;
      avatar_url: string | null;
    };
  };
}

export function CommentItem({ comment }: CommentItemProps) {
  return (
    <div className="flex gap-3 py-3">
      <div className="flex-shrink-0 w-8 h-8 bg-muted rounded-full flex items-center justify-center overflow-hidden">
        {comment.user.avatar_url && comment.user.avatar_url.startsWith('http') ? (
          <img 
            src={comment.user.avatar_url} 
            alt={comment.user.name}
            className="h-full w-full object-cover"
          />
        ) : comment.user.avatar_url && comment.user.avatar_url.length <= 2 ? (
          <span className="text-sm">{comment.user.avatar_url}</span>
        ) : (
          <span className="text-xs font-medium">
            {comment.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-medium text-sm">
            {comment.user.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
      </div>
    </div>
  );
}