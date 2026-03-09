import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  showBackButton?: boolean;
  canGoBack?: boolean;
  actions?: React.ReactNode;
}

export function PageHeader({ 
  title, 
  subtitle, 
  onBack, 
  showBackButton = false,
  canGoBack = false,
  actions 
}: PageHeaderProps) {
  return (
    <div className="mb-6 animate-fade-in">
      {showBackButton && onBack && (
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4 hover:bg-muted group -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          {canGoBack ? "Back" : "Back to Home"}
        </Button>
      )}
      
      {/* Also show back button when onBack is provided without explicit showBackButton flag */}
      {!showBackButton && onBack && (
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4 hover:bg-muted group -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          {canGoBack ? "Back" : "Back to Home"}
        </Button>
      )}
      
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl text-foreground mb-2">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}