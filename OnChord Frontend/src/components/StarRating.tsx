import { Star } from "lucide-react";
import { useState } from "react";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  showNumber?: boolean;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  onHover?: (rating: number) => void;
}

export function StarRating({ 
  rating, 
  maxRating = 5, 
  size = "md",
  showNumber = false,
  interactive = false,
  onRatingChange,
  onHover
}: StarRatingProps) {
  const [hoveredHalfStar, setHoveredHalfStar] = useState<number | null>(null);
  
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };

  const renderStar = (index: number) => {
    const starValue = index + 1;
    
    // Use hovered rating if available, otherwise use actual rating
    const displayRating = hoveredHalfStar !== null ? hoveredHalfStar : rating;
    
    const isFilled = displayRating >= starValue;
    const isHalfFilled = !isFilled && displayRating >= starValue - 0.5;
    const isEmpty = !isFilled && !isHalfFilled;

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive || !onRatingChange) return;
      
      // Get click position relative to the star
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const starWidth = rect.width;
      const isLeftHalf = clickX < starWidth / 2;
      
      // If clicking left half, set to half star, otherwise full star
      if (isLeftHalf) {
        onRatingChange(starValue - 0.5);
      } else {
        onRatingChange(starValue);
      }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive) return;
      
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const starWidth = rect.width;
      const isLeftHalf = mouseX < starWidth / 2;
      
      setHoveredHalfStar(isLeftHalf ? starValue - 0.5 : starValue);
      onHover?.(starValue);
    };

    // When hovering, show slightly different styling
    const isHovering = hoveredHalfStar !== null;

    return (
      <div 
        key={index} 
        className={`relative inline-flex ${interactive ? 'cursor-pointer select-none' : ''}`}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => interactive && onHover?.(starValue)}
      >
        {/* Background star (always shown for empty/half states) */}
        <Star
          className={`${sizeClasses[size]} ${
            isEmpty 
              ? 'text-muted' 
              : 'text-muted/30'
          } transition-all`}
        />
        
        {/* Full star overlay */}
        {isFilled && (
          <div className="absolute inset-0 pointer-events-none">
            <Star
              className={`${sizeClasses[size]} ${
                isHovering 
                  ? 'text-primary/70 fill-primary/70' 
                  : 'text-primary fill-primary'
              } transition-all`}
            />
          </div>
        )}
        
        {/* Half star overlay */}
        {isHalfFilled && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ width: '50%' }}>
            <Star
              className={`${sizeClasses[size]} ${
                isHovering 
                  ? 'text-primary/70 fill-primary/70' 
                  : 'text-primary fill-primary'
              } transition-all`}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="flex items-center gap-1"
      onMouseLeave={() => {
        if (interactive) {
          setHoveredHalfStar(null);
          onHover?.(0);
        }
      }}
    >
      {Array.from({ length: maxRating }, (_, i) => renderStar(i))}
      {showNumber && (
        <span className={`ml-2 ${
          size === "sm" ? "text-sm" : size === "lg" ? "text-lg" : "text-base"
        } text-foreground`}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}