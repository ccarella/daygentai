'use client';

import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { sanitizeImageUrl } from '@/lib/url-validation';

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
  const safeAvatarUrl = sanitizeImageUrl(comment.user.avatar_url);
  const initials = comment.user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex gap-3 py-3">
      <div className="flex-shrink-0 w-8 h-8 bg-muted rounded-full flex items-center justify-center overflow-hidden">
        {safeAvatarUrl ? (
          <Image 
            src={safeAvatarUrl} 
            alt={comment.user.name}
            width={32}
            height={32}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xs font-medium">
            {initials}
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