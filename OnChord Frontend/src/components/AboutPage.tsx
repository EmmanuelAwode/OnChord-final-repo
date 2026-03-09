import { Card } from "./ui/card";
import { Music, Users, Sparkles, Heart, TrendingUp, Globe } from "lucide-react";
import { BackButton } from "./BackButton";

interface AboutPageProps {
  onNavigate?: (page: string) => void;
  onBack?: () => void;
  canGoBack?: boolean;
}

export function AboutPage({ onNavigate, onBack, canGoBack }: AboutPageProps = {}) {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Back Button */}
      {onBack && (
        <BackButton onClick={onBack} label={canGoBack ? "Back" : "Back to Home"} />
      )}
      
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-glow-primary">
            <Music className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-4xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          About OnChord
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Your social music discovery and journaling platform, inspired by the way we share and celebrate music
        </p>
      </div>

      {/* Mission */}
      <Card className="p-8 bg-gradient-to-br from-card to-card/80 border-border shadow-soft">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Heart className="w-6 h-6 text-primary" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl text-foreground">Our Mission</h2>
            <p className="text-muted-foreground leading-relaxed">
              OnChord was born from a simple idea: music deserves the same thoughtful discussion and discovery platform that film has with Letterboxd. We believe that every album, every track, and every musical moment tells a story worth sharing.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Our mission is to create a vibrant community where music lovers can discover, review, and connect over the sounds that move them. Whether you're a casual listener or a devoted audiophile, OnChord is your space to explore and express your musical journey.
            </p>
          </div>
        </div>
      </Card>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 bg-card border-border hover:border-primary/50 transition-all">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-secondary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-foreground">Community-Driven</h3>
              <p className="text-sm text-muted-foreground">
                Connect with fellow music enthusiasts, share your reviews, and discover new artists through our AI-powered taste matching system.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border hover:border-primary/50 transition-all">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-chart-3/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-chart-3" />
            </div>
            <div className="space-y-2">
              <h3 className="text-foreground">AI-Powered Insights</h3>
              <p className="text-sm text-muted-foreground">
                Get personalized music recommendations, track your listening patterns, and discover your unique music personality profile.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border hover:border-primary/50 transition-all">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-accent" />
            </div>
            <div className="space-y-2">
              <h3 className="text-foreground">Track Your Journey</h3>
              <p className="text-sm text-muted-foreground">
                Keep a detailed diary of your music experiences with our calendar-based review system and comprehensive statistics.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border hover:border-primary/50 transition-all">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-chart-5/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-chart-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-foreground">Seamless Integration</h3>
              <p className="text-sm text-muted-foreground">
                Connect with Spotify and Apple Music to automatically sync your listening history and favorite tracks.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Stats */}
      <Card className="p-8 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center space-y-2">
            <p className="text-3xl text-primary">50K+</p>
            <p className="text-sm text-muted-foreground">Active Users</p>
          </div>
          <div className="text-center space-y-2">
            <p className="text-3xl text-secondary">2M+</p>
            <p className="text-sm text-muted-foreground">Reviews Posted</p>
          </div>
          <div className="text-center space-y-2">
            <p className="text-3xl text-accent">500K+</p>
            <p className="text-sm text-muted-foreground">Albums Reviewed</p>
          </div>
          <div className="text-center space-y-2">
            <p className="text-3xl text-chart-3">100K+</p>
            <p className="text-sm text-muted-foreground">Playlists Created</p>
          </div>
        </div>
      </Card>

      {/* Team */}
      <Card className="p-8 bg-card border-border">
        <div className="space-y-4 text-center">
          <h2 className="text-2xl text-foreground">Built with Passion</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            OnChord is developed by a small team of music lovers and tech enthusiasts who believe in the power of music to bring people together. We're constantly working to improve your experience and add new features.
          </p>
          <p className="text-sm text-muted-foreground">
            Want to get in touch? Reach us at <span className="text-primary">hello@onchord.com</span>
          </p>
        </div>
      </Card>
    </div>
  );
}