import { motion } from "motion/react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Check, Share2, Eye } from "lucide-react";

interface ReviewConfirmationProps {
  onViewReview?: () => void;
  onShareReview?: () => void;
  onWriteAnother?: () => void;
  onGoHome?: () => void;
}

export function ReviewConfirmation({
  onViewReview,
  onShareReview,
  onWriteAnother,
  onGoHome,
}: ReviewConfirmationProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 bg-card border-border text-center">
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="mx-auto w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6"
          >
            <Check className="w-10 h-10 text-primary" />
          </motion.div>

          {/* Success Message */}
          <h2 className="text-foreground mb-2">Review Published!</h2>
          <p className="text-muted-foreground mb-6">
            Your review has been shared with the community.
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={onViewReview}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Review
            </Button>
            <Button
              onClick={onShareReview}
              variant="outline"
              className="w-full border-border"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share on Social
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={onWriteAnother}
                variant="outline"
                className="border-border"
              >
                Write Another
              </Button>
              <Button
                onClick={onGoHome}
                variant="outline"
                className="border-border"
              >
                Go Home
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
