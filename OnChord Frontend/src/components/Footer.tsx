import { Logo } from "./Logo";
import { Separator } from "./ui/separator";

interface FooterProps {
  onNavigate?: (page: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <Logo size="sm" showText={true} />
            <p className="text-xs text-muted-foreground">Social Music Discovery</p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <button 
              onClick={() => onNavigate?.("about")}
              className="hover:text-primary transition"
            >
              About
            </button>
            <button 
              onClick={() => onNavigate?.("privacy")}
              className="hover:text-primary transition"
            >
              Privacy
            </button>
            <button 
              onClick={() => onNavigate?.("terms")}
              className="hover:text-primary transition"
            >
              Terms
            </button>
            <button 
              onClick={() => onNavigate?.("help")}
              className="hover:text-primary transition"
            >
              Help
            </button>
          </div>

          {/* Copyright */}
          <div className="text-sm text-muted-foreground text-center md:text-right">
            <p>© {currentYear} OnChord</p>
            <p className="text-xs">All rights reserved</p>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Integration Badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-full border border-border">
            <div className="w-4 h-4 bg-primary rounded-full" />
            <span>Powered by Spotify</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-full border border-border">
            <div className="w-4 h-4 bg-secondary rounded-full" />
            <span>Apple Music Ready</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-full border border-border">
            <div className="w-4 h-4 bg-chart-4 rounded-full" />
            <span>AI-Powered Insights</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
