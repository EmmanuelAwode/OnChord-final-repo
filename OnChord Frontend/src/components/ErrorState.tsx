import { Button } from "./ui/button";
import { AlertCircle, Wifi, WifiOff } from "lucide-react";

interface ErrorStateProps {
  type?: "error" | "offline";
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  type = "error",
  title,
  description,
  onRetry,
}: ErrorStateProps) {
  const isOffline = type === "offline";

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className={`p-6 rounded-full mb-6 ${isOffline ? 'bg-muted/30' : 'bg-destructive/10'}`}>
        {isOffline ? (
          <WifiOff className="w-12 h-12 text-muted-foreground" />
        ) : (
          <AlertCircle className="w-12 h-12 text-destructive" />
        )}
      </div>
      <h3 className="text-foreground mb-2">
        {title || (isOffline ? "You're Offline" : "Something Went Wrong")}
      </h3>
      <p className="text-muted-foreground max-w-md mb-6">
        {description || (isOffline
          ? "Check your internet connection and try again."
          : "We couldn't load this content. Please try again.")}
      </p>
      {onRetry && (
        <Button
          onClick={onRetry}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {isOffline ? "Retry Connection" : "Try Again"}
        </Button>
      )}
    </div>
  );
}
