import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { BackButton } from "./BackButton";
import { 
  HelpCircle, 
  Search, 
  MessageCircle, 
  Mail, 
  Book, 
  ChevronDown,
  Music,
  Star,
  Users,
  Settings,
  Sparkles,
  Calendar
} from "lucide-react";

interface FAQItemProps {
  question: string;
  answer: string;
  icon: React.ElementType;
}

function FAQItem({ question, answer, icon: Icon }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="p-4 bg-card border-border hover:border-primary/30 transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-start justify-between gap-4 text-left"
      >
        <div className="flex items-start gap-3 flex-1">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-foreground mb-1">{question}</h3>
            {isOpen && (
              <p className="text-sm text-muted-foreground mt-2 animate-fade-in">
                {answer}
              </p>
            )}
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground transition-transform flex-shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
    </Card>
  );
}

interface HelpPageProps {
  onNavigate?: (page: string) => void;
  onBack?: () => void;
  canGoBack?: boolean;
}

export function HelpPage({ onNavigate, onBack, canGoBack }: HelpPageProps = {}) {
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      {/* Back Button */}
      {onBack && (
        <BackButton onClick={onBack} label={canGoBack ? "Back" : "Back to Home"} />
      )}
      
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-glow-primary">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl text-foreground">Help Center</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Find answers to common questions and learn how to make the most of OnChord
        </p>
      </div>

      {/* Search */}
      <Card className="p-6 bg-card border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search for help..."
            className="pl-10 bg-input-background border-input"
          />
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:border-primary/50 transition-all cursor-pointer">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Book className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-foreground">User Guide</h3>
              <p className="text-sm text-muted-foreground">
                Learn the basics of OnChord with our comprehensive getting started guide
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20 hover:border-secondary/50 transition-all cursor-pointer">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-secondary/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-6 h-6 text-secondary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-foreground">Community Forum</h3>
              <p className="text-sm text-muted-foreground">
                Connect with other users, share tips, and get help from the community
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* FAQs */}
      <div className="space-y-4">
        <h2 className="text-2xl text-foreground">Frequently Asked Questions</h2>
        <div className="space-y-3">
          <FAQItem
            question="How do I connect my Spotify or Apple Music account?"
            answer="Go to Settings > Connected Accounts and click on the service you want to connect. You'll be redirected to authorize OnChord to access your listening data. We only request the minimum permissions needed to sync your library and listening history."
            icon={Settings}
          />
          <FAQItem
            question="How does the review system work?"
            answer="You can write reviews for any album or track you've listened to. Rate it from 1-5 stars, add your thoughts, tag the mood and listening context, and share it with the community. Your reviews appear on your profile and in the community feed."
            icon={Star}
          />
          <FAQItem
            question="What is AI-powered taste matching?"
            answer="Our AI analyzes your listening history, reviews, and ratings to find users with similar musical preferences. You'll get personalized recommendations based on what people with your taste profile are enjoying."
            icon={Sparkles}
          />
          <FAQItem
            question="How do collaborative playlists work?"
            answer="Create a playlist and invite friends to collaborate. Everyone can add, remove, and reorder tracks. Changes sync in real-time, and you can chat with collaborators to discuss song choices."
            icon={Users}
          />
          <FAQItem
            question="What is the review calendar?"
            answer="The calendar view lets you see all your reviews organized by date. Click on any day to see what you reviewed, track your listening patterns over time, and revisit your musical journey."
            icon={Calendar}
          />
          <FAQItem
            question="How do I discover new music?"
            answer="Use the Discover page to explore curated playlists, trending albums, and personalized recommendations. Check out the community feed to see what other users are reviewing, or use our AI-powered search to find music based on moods, genres, or similar artists."
            icon={Music}
          />
          <FAQItem
            question="Can I make my profile private?"
            answer="Yes! In Settings > Privacy, you can control who sees your reviews, listening stats, and profile. You can make your account completely private or share only with followers."
            icon={Settings}
          />
          <FAQItem
            question="How do I report inappropriate content?"
            answer="Click the three-dot menu on any review or comment and select 'Report'. Our moderation team reviews all reports within 24 hours. You can also block users directly from their profile."
            icon={MessageCircle}
          />
        </div>
      </div>


    </div>
  );
}