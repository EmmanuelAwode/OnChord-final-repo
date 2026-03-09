import { Card } from "./ui/card";
import { FileText, CheckCircle, XCircle, AlertTriangle, Scale } from "lucide-react";
import { BackButton } from "./BackButton";

interface TermsPageProps {
  onNavigate?: (page: string) => void;
  onBack?: () => void;
  canGoBack?: boolean;
}

export function TermsPage({ onNavigate, onBack, canGoBack }: TermsPageProps = {}) {
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
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl text-foreground">Terms of Service</h1>
            <p className="text-sm text-muted-foreground">Last updated: October 2, 2025</p>
          </div>
        </div>
        <p className="text-muted-foreground">
          Welcome to OnChord! By using our platform, you agree to these terms. Please read them carefully.
        </p>
      </div>

      {/* Acceptance */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl text-foreground mb-2">Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using OnChord, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.
            </p>
          </div>
        </div>
      </Card>

      {/* User Accounts */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h2 className="text-xl text-foreground mb-2">User Accounts</h2>
            <p className="text-muted-foreground mb-4">
              When you create an account on OnChord, you agree to:
            </p>
          </div>
        </div>
        <div className="space-y-3 ml-14">
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-secondary mt-2 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Provide accurate, current, and complete information during registration
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-secondary mt-2 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Maintain the security of your password and account
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-secondary mt-2 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Be responsible for all activities that occur under your account
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-secondary mt-2 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Notify us immediately of any unauthorized use of your account
            </p>
          </div>
        </div>
      </Card>

      {/* User Content */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 bg-chart-3/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Scale className="w-5 h-5 text-chart-3" />
          </div>
          <div>
            <h2 className="text-xl text-foreground mb-2">User-Generated Content</h2>
            <p className="text-muted-foreground mb-4">
              You retain ownership of content you post on OnChord (reviews, comments, playlists), but grant us certain rights:
            </p>
          </div>
        </div>
        <div className="space-y-3 ml-14">
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-chart-3 mt-2 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              You grant OnChord a non-exclusive, worldwide license to use, display, and distribute your content on the platform
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-chart-3 mt-2 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              You confirm that you have the rights to share the content you post
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-chart-3 mt-2 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              You agree not to post content that infringes on copyrights, trademarks, or other intellectual property rights
            </p>
          </div>
        </div>
      </Card>

      {/* Prohibited Activities */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <XCircle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl text-foreground mb-2">Prohibited Activities</h2>
            <p className="text-muted-foreground mb-4">
              When using OnChord, you agree NOT to:
            </p>
          </div>
        </div>
        <div className="space-y-3 ml-14">
          <div className="flex items-start gap-3">
            <XCircle className="w-4 h-4 text-destructive mt-1 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Post harmful, threatening, abusive, harassing, defamatory, or discriminatory content
            </p>
          </div>
          <div className="flex items-start gap-3">
            <XCircle className="w-4 h-4 text-destructive mt-1 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Spam, solicit, or advertise commercial products or services without permission
            </p>
          </div>
          <div className="flex items-start gap-3">
            <XCircle className="w-4 h-4 text-destructive mt-1 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Attempt to gain unauthorized access to other users' accounts or our systems
            </p>
          </div>
          <div className="flex items-start gap-3">
            <XCircle className="w-4 h-4 text-destructive mt-1 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Use automated scripts or bots to access or interact with the platform
            </p>
          </div>
          <div className="flex items-start gap-3">
            <XCircle className="w-4 h-4 text-destructive mt-1 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Interfere with or disrupt the platform's functionality or security
            </p>
          </div>
        </div>
      </Card>

      {/* Intellectual Property */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Scale className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-xl text-foreground mb-2">Intellectual Property</h2>
            <p className="text-muted-foreground">
              OnChord and its original content, features, and functionality are owned by OnChord and are protected by international copyright, trademark, and other intellectual property laws.
            </p>
          </div>
        </div>
      </Card>

      {/* Disclaimer */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-chart-5/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-chart-5" />
          </div>
          <div className="space-y-3">
            <h2 className="text-xl text-foreground">Disclaimer</h2>
            <p className="text-muted-foreground">
              OnChord is provided "as is" without warranties of any kind, either express or implied. We do not guarantee that the service will be uninterrupted, secure, or error-free. We are not responsible for the accuracy or reliability of user-generated content.
            </p>
          </div>
        </div>
      </Card>

      {/* Termination */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl text-foreground mb-2">Termination</h2>
            <p className="text-muted-foreground">
              We reserve the right to suspend or terminate your account and access to OnChord at our discretion, without notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties, or for any other reason.
            </p>
          </div>
        </div>
      </Card>

      {/* Changes to Terms */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div className="space-y-3">
            <h2 className="text-xl text-foreground">Changes to Terms</h2>
            <p className="text-muted-foreground">
              We may update these Terms of Service from time to time. We will notify you of any changes by posting the new terms on this page and updating the "Last updated" date. You are advised to review these terms periodically for any changes.
            </p>
          </div>
        </div>
      </Card>

      {/* Contact */}
      <Card className="p-6 bg-card border-border">
        <div className="text-center space-y-3">
          <h2 className="text-xl text-foreground">Questions About Our Terms?</h2>
          <p className="text-muted-foreground">
            If you have any questions about these Terms of Service, please contact us at:
          </p>
          <p className="text-primary">legal@onchord.com</p>
        </div>
      </Card>
    </div>
  );
}