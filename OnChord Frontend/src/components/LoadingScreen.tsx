import { Logo } from "./Logo";

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <Logo size="lg" showText={true} />

        {/* Tagline */}
        <p className="text-muted-foreground">Your music journey starts here</p>

        {/* Loading bars */}
        <div className="flex items-end gap-1.5 h-12">
          {[0.6, 0.8, 1, 0.7, 0.9, 0.5, 0.8].map((height, i) => (
            <div
              key={i}
              className="w-2 bg-gradient-to-t from-primary to-accent rounded-full animate-beat"
              style={{ 
                height: "100%",
                transform: `scaleY(${height})`,
                animationDelay: `${i * 0.1}s`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
