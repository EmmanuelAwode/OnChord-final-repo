import { motion } from "motion/react";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className = "", showText = true, size = "md" }: LogoProps) {
  const sizes = {
    sm: { container: "w-8 h-8", icon: "w-4 h-4", text: "text-base" },
    md: { container: "w-10 h-10", icon: "w-5 h-5", text: "text-xl" },
    lg: { container: "w-16 h-16", icon: "w-8 h-8", text: "text-3xl" }
  };

  const currentSize = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Vinyl Record with Musical Note */}
      <div className="relative group">
        {/* Vinyl disc - outer ring */}
        <motion.div 
          className={`${currentSize.container} bg-gradient-to-br from-primary via-accent to-secondary rounded-full shadow-glow-primary relative overflow-hidden`}
          whileHover={{ rotate: 180, scale: 1.05 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          {/* Grooves effect */}
          <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
          <div className="absolute inset-1 rounded-full border-2 border-white/10"></div>
          <div className="absolute inset-2 rounded-full border border-white/10"></div>
          
          {/* Center label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1/3 h-1/3 bg-gradient-to-br from-card to-background rounded-full shadow-inner flex items-center justify-center">
              {/* Musical note */}
              <svg 
                className={`${currentSize.icon} text-primary drop-shadow-lg`}
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>
          </div>
          
          {/* Spinning highlight */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>

        {/* Pulsing glow on hover */}
        <motion.div 
          className={`absolute inset-0 ${currentSize.container} bg-primary/20 rounded-full blur-xl -z-10`}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Text Logo - Plain White */}
      {showText && (
        <motion.div 
          className="flex items-center gap-1"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className={`${currentSize.text} text-white font-bold tracking-tight`}>
            OnChord
          </h2>
        </motion.div>
      )}
    </div>
  );
}
