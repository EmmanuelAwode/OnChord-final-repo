import { Edit3 } from "lucide-react";

interface EditedIndicatorProps {
  isEdited?: boolean;
  editedAt?: string;
  className?: string;
}

export function EditedIndicator({ isEdited, editedAt, className = "" }: EditedIndicatorProps) {
  if (!isEdited) return null;

  const getRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "Edited just now";
    if (diffMins < 60) return `Edited ${diffMins}m ago`;
    if (diffHours < 24) return `Edited ${diffHours}h ago`;
    if (diffDays === 1) return "Edited 1d ago";
    if (diffDays < 7) return `Edited ${diffDays}d ago`;
    return `Edited ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  return (
    <span className={`inline-flex items-center gap-1 text-xs text-muted-foreground/70 italic ${className}`}>
      <Edit3 className="w-3 h-3" />
      {editedAt ? getRelativeTime(editedAt) : "Edited"}
    </span>
  );
}
