import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, FileText, Music, ListPlus, Calendar, Users, X } from "lucide-react";

interface QuickActionButtonProps {
  onAction: (action: string) => void;
}

export function QuickActionButton({ onAction }: QuickActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { id: "review", label: "Add Review", icon: FileText, color: "from-purple-500 to-purple-600" },
    { id: "collab", label: "Manage Collab", icon: Music, color: "from-green-500 to-emerald-600" },
    { id: "list", label: "Add to List", icon: ListPlus, color: "from-blue-500 to-blue-600" },
    { id: "event", label: "Log Concert", icon: Calendar, color: "from-pink-500 to-pink-600" },
    { id: "connect", label: "Find Friends", icon: Users, color: "from-orange-500 to-orange-600" },
  ];

  const handleAction = (actionId: string) => {
    setIsOpen(false);
    onAction(actionId);
  };

  const handleButtonClick = () => {
    // Toggle menu open/closed
    setIsOpen(!isOpen);
  };

  const handleBackdropClick = () => {
    // Just close the menu, keep button visible
    setIsOpen(false);
  };

  return (
    <>
      {/* Main FAB Button - Always Visible */}
      <motion.button
        onClick={handleButtonClick}
        className={`fixed bottom-24 md:bottom-8 right-6 z-50 w-16 h-16 rounded-full flex items-center justify-center transition-all ${
          isOpen 
            ? "bg-gradient-to-br from-destructive to-destructive/80 shadow-xl" 
            : "bg-gradient-to-br from-primary via-accent to-secondary shadow-lg"
        }`}
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.9 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          animate={{ 
            rotate: isOpen ? 90 : 0,
            scale: isOpen ? 1 : 1
          }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? (
            <X className="w-7 h-7 text-white drop-shadow-lg" />
          ) : (
            <Plus className="w-7 h-7 text-white drop-shadow-lg" />
          )}
        </motion.div>
      </motion.button>

      {/* Action Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleBackdropClick}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />

            {/* Action Buttons */}
            <div className="fixed bottom-24 md:bottom-8 right-6 z-50 flex flex-col-reverse gap-3 pb-20 pointer-events-none">
              {actions.map((action, index) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleAction(action.id)}
                  className="group flex items-center gap-3 bg-card/95 backdrop-blur-xl border-2 border-primary/20 rounded-full pl-4 pr-6 py-3 shadow-md hover:shadow-lg hover:border-primary/50 transition-all pointer-events-auto"
                  whileHover={{ x: -10, scale: 1.05 }}
                >
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${action.color} flex items-center justify-center shadow-md transition-all group-hover:scale-110 group-hover:shadow-lg`}>
                    <action.icon className="w-5 h-5 text-white drop-shadow-lg" />
                  </div>
                  <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                    {action.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
