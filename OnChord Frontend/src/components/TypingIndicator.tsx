import { useTypingIndicator } from '../lib/useTypingIndicator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface TypingIndicatorProps {
  contextId: string;
  contextType: 'review' | 'message' | 'comment';
}

export default function TypingIndicator({ contextId, contextType }: TypingIndicatorProps) {
  const { typingUsers, typingText, isAnyoneTyping } = useTypingIndicator({
    contextId,
    contextType,
  });

  if (!isAnyoneTyping) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Show avatars for typing users (max 3) */}
      <div className="flex -space-x-2">
        {typingUsers.slice(0, 3).map((user) => (
          <Avatar key={user.userId} className="h-6 w-6 border-2 border-background">
            <AvatarImage src={user.userAvatar} alt={user.userName} />
            <AvatarFallback className="text-xs">{user.userName.charAt(0)}</AvatarFallback>
          </Avatar>
        ))}
      </div>

      {/* Typing text */}
      <span className="italic">{typingText}</span>

      {/* Animated dots */}
      <div className="flex gap-1">
        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>
          .
        </span>
        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>
          .
        </span>
        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>
          .
        </span>
      </div>
    </div>
  );
}
