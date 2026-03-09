import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { User, Palette, Check } from "lucide-react";

interface OnboardingFlowProps {
  onComplete: (data: { displayName: string; accentColor: string }) => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [selectedColor, setSelectedColor] = useState("purple");

  const accentColors = [
    { name: "purple", color: "#A855F7", label: "Purple Haze" },
    { name: "blue", color: "#3B82F6", label: "Blue Note" },
    { name: "pink", color: "#EC4899", label: "Pink Noise" },
    { name: "green", color: "#10B981", label: "Green Light" },
    { name: "orange", color: "#F59E0B", label: "Golden Hour" },
  ];

  const handleNext = () => {
    if (step === 1 && displayName.trim()) {
      setStep(2);
    } else if (step === 2) {
      onComplete({ displayName, accentColor: selectedColor });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`h-2 w-16 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`h-2 w-16 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
        </div>

        {step === 1 && (
          <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
            <div className="flex items-center justify-center mb-6">
            <div className="bg-primary/20 p-4 rounded-full">
              <User className="w-8 h-8 text-primary" />
            </div>
          </div>

          <h2 className="text-center mb-2">Welcome to OnChord</h2>
          <p className="text-center text-muted-foreground mb-6">
            Let's get you set up. What should we call you?
          </p>

          <div className="space-y-4">
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Enter your display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-2"
                autoFocus
              />
            </div>

            <Button
              onClick={handleNext}
              disabled={!displayName.trim()}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Continue
            </Button>
          </div>
        </div>
        )}

        {step === 2 && (
          <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-primary/20 p-4 rounded-full">
                <Palette className="w-8 h-8 text-primary" />
              </div>
            </div>

            <h2 className="text-center mb-2">Choose Your Vibe</h2>
            <p className="text-center text-muted-foreground mb-6">
              Pick an accent color for your OnChord experience
            </p>

            <div className="space-y-4">
              <div className="grid gap-3">
                {accentColors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                      selectedColor === color.name
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:border-primary/50'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-full shadow-lg"
                      style={{ backgroundColor: color.color }}
                    />
                    <div className="flex-1 text-left">
                      <p className="text-foreground">{color.label}</p>
                    </div>
                    {selectedColor === color.name && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
