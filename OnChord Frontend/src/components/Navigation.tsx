import { Home, Users, User, Search, Menu, Music2, BarChart3, Sparkles, MessageCircle, Bell, Settings, ChevronUp, Star, Ticket, Info, Shield, FileText, HelpCircle, LogOut, BellDot } from "lucide-react";
import { Badge } from "./ui/badge";
import { cn } from "./ui/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Logo } from "./Logo";
import { useUnreadNotifications } from "./NotificationsModal";
import { useReminders } from "../lib/useReminders";
import NotificationsPanel from "./NotificationsPanel";

interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  username: string;
  email: string;
  onOpenNotifications: () => void;
  onOpenReminders: () => void;
  onLogout?: () => void;
}

const navItems = [
  { id: "home", label: "Home", icon: Home },
  { id: "discover", label: "Discover", icon: Sparkles },
  { id: "insights", label: "Insights", icon: BarChart3 },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "messages", label: "Messages", icon: MessageCircle, badge: 2 },
  { id: "events", label: "Events", icon: Ticket },
  { id: "your-space", label: "Your Space", icon: User },
];

export function Navigation({ currentPage, onNavigate, isOpen, onToggle, username, email, onOpenNotifications, onOpenReminders, onLogout }: NavigationProps) {
  const [showConnectedAccounts, setShowConnectedAccounts] = useState(false);
  const unreadCount = useUnreadNotifications();
  const { reminderCount } = useReminders();

  return (
    <>
      {/* Backdrop Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onToggle}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation - Scrollable */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-t from-card via-card to-card/95 border-t-2 border-primary/20 z-50 backdrop-blur-xl shadow-strong">
        <div className="overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-1 px-2 py-3 min-w-max">
            {/* Real-time Notifications Panel */}
            <div className="flex-shrink-0">
              <NotificationsPanel />
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    "relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 flex-shrink-0",
                    isActive
                      ? "text-primary bg-gradient-to-br from-primary/20 to-accent/10 shadow-glow-primary"
                      : "text-muted-foreground hover:text-primary hover:scale-105"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive && "drop-shadow-lg")} />
                  <span className="text-xs whitespace-nowrap">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-secondary to-secondary/80 rounded-full flex items-center justify-center shadow-glow-secondary">
                      <span className="text-[10px] text-white font-semibold">{item.badge}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Animated Sidebar - Both Mobile (fullscreen) and Desktop */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 h-screen w-full md:w-64 bg-gradient-to-b from-card via-card to-card/95 border-r-2 border-primary/20 z-50 overflow-hidden shadow-strong backdrop-blur-xl"
          >
        <div className="h-full flex flex-col relative">
          {/* Music-themed background pattern */}
          <div className="absolute inset-0 pattern-waveform opacity-50 pointer-events-none"></div>
          
          <div className="p-6 flex-shrink-0 relative z-10">
            {/* Logo and Close Button */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <Logo size="md" showText={true} />
              <div className="flex items-center gap-2">
                {/* Reminders Button */}
                <button
                  onClick={onOpenReminders}
                  className="relative p-2 rounded-lg hover:bg-accent/10 hover:text-accent transition-all hover:scale-110 group"
                  aria-label="Reminders"
                >
                  <BellDot className="w-5 h-5 text-foreground group-hover:text-accent" />
                  {reminderCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-accent to-accent/80 rounded-full flex items-center justify-center shadow-glow-primary">
                      <span className="text-[10px] text-white font-semibold">{reminderCount}</span>
                    </div>
                  )}
                </button>
                {/* Real-time Notifications Panel */}
                <NotificationsPanel />
                {/* Close button for both mobile and desktop */}
                <button
                  onClick={onToggle}
                  className="p-2 rounded-lg hover:bg-primary/10 hover:text-primary transition-all hover:scale-110"
                  aria-label="Close menu"
                >
                  <svg
                    className="w-5 h-5 text-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Items - Scrollable */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 pr-4 min-h-0 nav-scroll relative z-10">
            <nav className="space-y-1 pb-4">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-glow-primary scale-105"
                    : "text-muted-foreground hover:bg-primary/10 hover:text-primary hover:scale-105"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <Badge className="ml-auto bg-secondary text-secondary-foreground border-0 h-5 px-2">
                    {item.badge}
                  </Badge>
                )}
              </motion.button>
            );
          })}

          <div className="my-4 border-t border-border" />

          <div className="my-4 border-t border-border" />

          <p className="text-xs text-muted-foreground px-4 py-2 uppercase tracking-wider">
            More
          </p>
          <button
            onClick={() => onNavigate("about")}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              currentPage === "about"
                ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-glow-primary scale-105"
                : "text-muted-foreground hover:bg-primary/10 hover:text-primary hover:scale-105"
            )}
          >
            <Info className="w-5 h-5" />
            <span>About</span>
          </button>
          <button
            onClick={() => onNavigate("privacy")}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              currentPage === "privacy"
                ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-glow-primary scale-105"
                : "text-muted-foreground hover:bg-primary/10 hover:text-primary hover:scale-105"
            )}
          >
            <Shield className="w-5 h-5" />
            <span>Privacy</span>
          </button>
          <button
            onClick={() => onNavigate("terms")}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              currentPage === "terms"
                ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-glow-primary scale-105"
                : "text-muted-foreground hover:bg-primary/10 hover:text-primary hover:scale-105"
            )}
          >
            <FileText className="w-5 h-5" />
            <span>Terms</span>
          </button>
          <button
            onClick={() => onNavigate("help")}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              currentPage === "help"
                ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-glow-primary scale-105"
                : "text-muted-foreground hover:bg-primary/10 hover:text-primary hover:scale-105"
            )}
          >
            <HelpCircle className="w-5 h-5" />
            <span>Help</span>
          </button>

          <div className="my-4 border-t border-border" />

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:scale-105"
          >
            <LogOut className="w-5 h-5" />
            <span>Log Out</span>
          </button>
            </nav>
          </div>

          {/* User Profile with Connected Accounts - Fixed at bottom */}
          <div className="flex-shrink-0 p-6 pt-4 border-t border-primary/20 relative z-10">
          <div className="bg-gradient-to-br from-primary/5 to-accent/5 backdrop-blur-sm rounded-xl overflow-hidden border-2 border-primary/20">
            <button 
              onClick={() => setShowConnectedAccounts(!showConnectedAccounts)}
              className="w-full flex items-center gap-3 p-3 hover:bg-primary/10 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 shadow-glow-primary">
                <span className="text-white font-semibold">
                  {username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm text-foreground truncate">{username}</p>
                <p className="text-xs text-muted-foreground truncate">@{username.toLowerCase().replace(/\s+/g, '')}</p>
              </div>
              <ChevronUp 
                className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform",
                  showConnectedAccounts ? "rotate-180" : ""
                )}
              />
            </button>
            
            {showConnectedAccounts && (
              <div className="px-3 pb-3 pt-2 space-y-2 border-t border-border animate-fade-in">
                <p className="text-xs text-muted-foreground mb-2">Connected Accounts</p>
                <div className="flex items-center gap-2 p-2 bg-card rounded-lg">
                  <div className="bg-secondary/20 p-1.5 rounded flex-shrink-0">
                    <Music2 className="w-3 h-3 text-secondary" />
                  </div>
                  <span className="text-xs text-foreground flex-1 truncate">Spotify</span>
                  <Badge className="bg-secondary/20 text-secondary border-0 text-[10px] flex-shrink-0">Active</Badge>
                </div>
                <div className="flex items-center gap-2 p-2 bg-card rounded-lg">
                  <div className="bg-chart-4/20 p-1.5 rounded flex-shrink-0">
                    <svg className="w-3 h-3 text-chart-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-foreground flex-1 truncate">Instagram</span>
                  <Badge className="bg-chart-4/20 text-chart-4 border-0 text-[10px] flex-shrink-0">Active</Badge>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}