import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { Play, Pause, Volume2, VolumeX, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";

interface PreviewContextType {
  currentPreview: string | null;
  isPlaying: boolean;
  playPreview: (previewUrl: string, trackName: string, artist: string) => void;
  pausePreview: () => void;
  stopPreview: () => void;
}

const PreviewContext = createContext<PreviewContextType | null>(null);

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [currentPreview, setCurrentPreview] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<{ name: string; artist: string } | null>(null);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState([70]);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const playPreview = (previewUrl: string, trackName: string, artist: string) => {
    // If same track is already playing, pause it
    if (currentPreview === previewUrl && audioRef.current && !audioRef.current.paused) {
      pausePreview();
      return;
    }

    // Stop current preview if any
    stopPreview();

    try {
      // Create new audio element
      const audio = new Audio(previewUrl);
      audio.volume = isMuted ? 0 : volume[0] / 100;
      audioRef.current = audio;
      setCurrentPreview(previewUrl);
      setCurrentTrack({ name: trackName, artist });
      setProgress(0);

      // Handle errors silently
      audio.onerror = () => {
        // Silently fail - preview URLs may not be available
        stopPreview();
      };

      // Handle successful load
      audio.onloadeddata = () => {
        audio.play().catch(() => {
          stopPreview();
        });
      };

      setIsPlaying(true);

      // Track progress every 100ms
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      
      progressIntervalRef.current = window.setInterval(() => {
        if (audio.currentTime >= 10) {
          stopPreview();
        } else {
          setProgress((audio.currentTime / 10) * 100);
        }
      }, 100);

      // Auto stop after 10 seconds
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = window.setTimeout(() => {
        stopPreview();
      }, 10500); // Add small buffer

      // Handle ended event
      audio.onended = () => {
        stopPreview();
      };
    } catch (error) {
      // Silently fail - preview URLs may not be available
      stopPreview();
    }
  };

  const pausePreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
  };

  const stopPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPlaying(false);
    setCurrentPreview(null);
    setCurrentTrack(null);
    setProgress(0);
  };

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : newVolume[0] / 100;
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.volume = !isMuted ? 0 : volume[0] / 100;
    }
  };

  const resumePreview = () => {
    if (audioRef.current && !isPlaying) {
      audioRef.current.play().catch(() => {
        stopPreview();
      });
      setIsPlaying(true);
      
      // Restart progress tracking
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      
      progressIntervalRef.current = window.setInterval(() => {
        if (audioRef.current) {
          if (audioRef.current.currentTime >= 10) {
            stopPreview();
          } else {
            setProgress((audioRef.current.currentTime / 10) * 100);
          }
        }
      }, 100);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, []);

  return (
    <PreviewContext.Provider
      value={{
        currentPreview,
        isPlaying,
        playPreview,
        pausePreview,
        stopPreview,
      }}
    >
      {children}
      
      {/* Global Preview Player Bar */}
      <AnimatePresence>
        {currentPreview && currentTrack && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
          >
            <div className="bg-card border border-border rounded-lg shadow-2xl overflow-hidden backdrop-blur-xl">
              {/* Progress bar */}
              <div className="h-1 bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="p-4">
                <div className="flex items-center gap-3">
                  {/* Play/Pause Button */}
                  <Button
                    size="sm"
                    onClick={() => (isPlaying ? pausePreview() : resumePreview())}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4" fill="currentColor" />
                    ) : (
                      <Play className="w-4 h-4" fill="currentColor" />
                    )}
                  </Button>

                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{currentTrack.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
                  </div>

                  {/* Volume Control */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={toggleMute}
                      className="text-muted-foreground hover:text-foreground transition"
                    >
                      {isMuted ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    <div className="w-16 hidden sm:block">
                      <Slider
                        value={volume}
                        onValueChange={handleVolumeChange}
                        max={100}
                        step={1}
                        className="cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Close Button */}
                  <button
                    onClick={stopPreview}
                    className="text-muted-foreground hover:text-foreground transition flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Time remaining */}
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>{Math.ceil((progress / 100) * 10)}s</span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    10s preview
                  </span>
                  <span>10s</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PreviewContext.Provider>
  );
}

export function usePreview() {
  const context = useContext(PreviewContext);
  if (!context) {
    throw new Error("usePreview must be used within PreviewProvider");
  }
  return context;
}

// Preview Button Component
interface PreviewButtonProps {
  previewUrl: string;
  trackName: string;
  artist: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "ghost" | "outline";
}

export function PreviewButton({ 
  previewUrl, 
  trackName, 
  artist, 
  size = "md",
  variant = "ghost" 
}: PreviewButtonProps) {
  const { currentPreview, isPlaying, playPreview } = usePreview();
  const isCurrentlyPlaying = currentPreview === previewUrl && isPlaying;

  const iconSize = size === "sm" ? "w-3 h-3" : size === "lg" ? "w-5 h-5" : "w-4 h-4";
  const buttonSize = size === "sm" ? "sm" : size === "lg" ? "default" : "sm";

  return (
    <Button
      size={buttonSize}
      variant={variant}
      onClick={(e) => {
        e.stopPropagation();
        playPreview(previewUrl, trackName, artist);
      }}
      className={`group relative ${
        isCurrentlyPlaying ? "bg-primary/20 text-primary" : ""
      }`}
      title="Play 10s preview"
    >
      {isCurrentlyPlaying ? (
        <Pause className={iconSize} fill="currentColor" />
      ) : (
        <Play className={iconSize} fill="currentColor" />
      )}
      {isCurrentlyPlaying && (
        <span className="absolute -inset-1 rounded-md border-2 border-primary animate-pulse" />
      )}
    </Button>
  );
}
