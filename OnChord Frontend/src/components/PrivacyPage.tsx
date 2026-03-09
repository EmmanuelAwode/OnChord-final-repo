import { Card } from "./ui/card";
import { Shield, Lock, Eye, Database, UserCheck, AlertCircle } from "lucide-react";
import { BackButton } from "./BackButton";

interface PrivacyPageProps {
  onNavigate?: (page: string) => void;
  onBack?: () => void;
  canGoBack?: boolean;
}

export function PrivacyPage({ onNavigate, onBack, canGoBack }: PrivacyPageProps = {}) {
  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      {/* Back Button */}
      {onBack && (
        <BackButton onClick={onBack} label={canGoBack ? "Back" : "Back to Home"} />
      )}
      
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-soft">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl text-foreground">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Last updated: October 2, 2025</p>
          </div>
        </div>
        <p className="text-muted-foreground">
          At OnChord, your privacy is our priority. This policy explains how we collect, use, and protect your personal information.
        </p>
      </div>

      {/* Information We Collect */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl text-foreground mb-2">Information We Collect</h2>
            <p className="text-muted-foreground mb-4">
              We collect information to provide you with the best music discovery experience:
            </p>
          </div>
        </div>
        <div className="space-y-4 ml-14">
          <div>
            <h3 className="text-foreground mb-2">Account Information</h3>
            <p className="text-sm text-muted-foreground">
              When you create an account, we collect your name, email address, username, and profile preferences.
            </p>
          </div>
          <div>
            <h3 className="text-foreground mb-2">Music Data</h3>
            <p className="text-sm text-muted-foreground">
              We access your listening history, favorite tracks, and playlists through your connected streaming services (with your permission).
            </p>
          </div>
          <div>
            <h3 className="text-foreground mb-2">Usage Information</h3>
            <p className="text-sm text-muted-foreground">
              We collect data about how you use OnChord, including reviews you write, albums you rate, and interactions with other users.
            </p>
          </div>
        </div>
      </Card>

      {/* How We Use Your Data */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <UserCheck className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h2 className="text-xl text-foreground mb-2">How We Use Your Data</h2>
            <p className="text-muted-foreground mb-4">
              Your information helps us deliver personalized experiences:
            </p>
          </div>
        </div>
        <div className="space-y-3 ml-14">
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Generate personalized music recommendations based on your listening history and preferences
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Match you with other users who share similar musical tastes
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Improve our AI algorithms and platform features
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Send you notifications about community activity and new features (you can opt out anytime)
            </p>
          </div>
        </div>
      </Card>

      {/* Data Security */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 bg-chart-3/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Lock className="w-5 h-5 text-chart-3" />
          </div>
          <div>
            <h2 className="text-xl text-foreground mb-2">Data Security</h2>
            <p className="text-muted-foreground">
              We implement industry-standard security measures to protect your personal information:
            </p>
          </div>
        </div>
        <div className="space-y-3 ml-14">
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-chart-3 mt-2 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              All data is encrypted in transit using SSL/TLS protocols
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-chart-3 mt-2 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Passwords are hashed and never stored in plain text
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-chart-3 mt-2 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Regular security audits and updates to protect against vulnerabilities
            </p>
          </div>
        </div>
      </Card>

      {/* Your Privacy Rights */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Eye className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-xl text-foreground mb-2">Your Privacy Rights</h2>
            <p className="text-muted-foreground mb-4">You have complete control over your data:</p>
          </div>
        </div>
        <div className="space-y-3 ml-14">
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground">Access:</span> Request a copy of all data we have about you
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground">Correction:</span> Update or correct any inaccurate information
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground">Deletion:</span> Request deletion of your account and associated data
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground">Portability:</span> Export your data in a machine-readable format
            </p>
          </div>
        </div>
      </Card>

      {/* Third-Party Services */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-chart-5/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-chart-5" />
          </div>
          <div className="space-y-3">
            <h2 className="text-xl text-foreground">Third-Party Services</h2>
            <p className="text-muted-foreground">
              OnChord integrates with third-party services like Spotify and Apple Music. When you connect these services, their respective privacy policies also apply to the data they collect and share with us.
            </p>
            <p className="text-sm text-muted-foreground">
              We only request the minimum permissions necessary to provide our features, and you can disconnect these services at any time from your settings.
            </p>
          </div>
        </div>
      </Card>

      {/* Contact */}
      <Card className="p-6 bg-card border-border">
        <div className="text-center space-y-3">
          <h2 className="text-xl text-foreground">Questions About Privacy?</h2>
          <p className="text-muted-foreground">
            If you have any questions or concerns about our privacy practices, please contact us at:
          </p>
          <p className="text-primary">privacy@onchord.com</p>
        </div>
      </Card>
    </div>
  );
}