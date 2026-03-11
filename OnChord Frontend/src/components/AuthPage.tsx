import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { toast } from "sonner";

interface AuthPageProps {
  onAuthed: (data: { username: string; email: string }) => void;
}

export function AuthPage({ onAuthed }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setErrorMsg(null);
    console.log("handleGoogleLogin called");
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      console.log("Google OAuth response — url:", data?.url, "error:", error);
      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No redirect URL returned from Supabase");
      }
    } catch (error: any) {
      console.error("Google login error:", error);
      const msg = error?.message || "Failed to connect with Google";
      setErrorMsg(msg);
      toast.error(msg);
      setGoogleLoading(false);
    }
  };

  const handleSpotifyLogin = async () => {
    setSpotifyLoading(true);
    setErrorMsg(null);
    console.log("handleSpotifyLogin called");
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "spotify",
        options: {
          redirectTo: window.location.origin,
          scopes:
            "user-read-email user-read-private user-top-read user-read-recently-played playlist-read-private playlist-read-collaborative",
          skipBrowserRedirect: true,
          queryParams: {
            prompt: "consent",
          },
        },
      });
      console.log("OAuth response — url:", data?.url, "error:", error);
      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No redirect URL returned from Supabase");
      }
    } catch (error: any) {
      console.error("Spotify login error:", error);
      const msg = error?.message || "Failed to connect with Spotify";
      setErrorMsg(msg);
      toast.error(msg);
      setSpotifyLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email.trim(),
          password: formData.password,
        });

        console.log("SIGN IN data:", data);
        console.log("SIGN IN error:", error);

        if (error) throw error;

        const u = data.user;
        const username =
          (u?.user_metadata?.username as string) ||
          u?.email?.split("@")[0] ||
          "User";

        toast.success("Logged in!");
        onAuthed({ username, email: u?.email ?? formData.email });
        return;
      }

      // SIGN UP
      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: { username: formData.username },
          emailRedirectTo: `${window.location.origin}`, // ✅ return to app after confirm
        },
      });


      console.log("SIGN UP data:", data);
      console.log("SIGN UP error:", error);

      if (error) throw error;

      // IMPORTANT: If email confirmations are ON, session will be null here.
      if (!data.session) {
        toast.success("Account created! Check your email to verify, then sign in.");
        setErrorMsg("Check your email to verify, then sign in.");
        return; // DO NOT call onAuthed yet
      }

      // confirmations OFF -> session exists
      const u = data.user;
      const username =
        (u?.user_metadata?.username as string) ||
        u?.email?.split("@")[0] ||
        formData.username ||
        "User";

      toast.success("Account created!");
      onAuthed({ username, email: u?.email ?? formData.email });
    } catch (error: any) {
      console.log("AUTH ERROR:", error);

      if (error?.status === 429) {
        const msg = "Too many signup emails sent. Wait a bit and try again.";
        setErrorMsg(msg);
        toast.error(msg);
        return;
      }

      const msg =
        error?.message ||
        error?.error_description ||
        "Something went wrong";

      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card/80 backdrop-blur-xl rounded-2xl border border-border p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold mb-2">Welcome to OnChord</h1>
          <p className="text-muted-foreground">
            {isLogin ? "Sign in to your account" : "Create your account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Choose a username"
                required={!isLogin}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter your password"
              required
              minLength={6}
            />

            {isLogin && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  disabled={loading || !formData.email}
                  onClick={async () => {
                    setErrorMsg(null);
                    const email = formData.email.trim();
                    if (!email) return;

                    const { error } = await supabase.auth.resetPasswordForEmail(email, {
                                      redirectTo: `${window.location.origin}/reset-password`,
                                    });
                    console.log("RESET PASSWORD error:", error);

                    if (error) {
                      setErrorMsg(error.message);
                      toast.error(error.message);
                      return;
                    }

                    toast.success("Password reset email sent (if the account exists).");
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>

          {isLogin && errorMsg?.toLowerCase().includes("confirm") && (
            <div className="flex items-center justify-between">
              <button
                type="button"
                disabled={loading || !formData.email}
                onClick={async () => {
                  setErrorMsg(null);
                  const email = formData.email.trim();
                  if (!email) return;

                  const { error } = await supabase.auth.resend({
                    type: "signup",
                    email,
                    options: {
                      emailRedirectTo: `${window.location.origin}`,
                    },
                  });

                  if (error) {
                    setErrorMsg(error.message);
                    toast.error(error.message);
                    return;
                  }

                  toast.success("Verification email resent. Check your inbox/spam.");
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Resend verification email
              </button>
            </div>
          )}



          {errorMsg && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card/80 px-2 text-muted-foreground">
              or continue with
            </span>
          </div>
        </div>

        {/* Spotify Login Button */}
        <button
          type="button"
          onClick={handleSpotifyLogin}
          disabled={spotifyLoading || loading || googleLoading}
          className="w-full py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 border border-border hover:bg-[#1DB954]/10 text-foreground"
          style={{ backgroundColor: spotifyLoading ? undefined : "rgba(30, 215, 96, 0.08)" }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1DB954">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          {spotifyLoading ? "Connecting to Spotify..." : "Continue with Spotify"}
        </button>

        {/* Google Login Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading || spotifyLoading}
          className="w-full py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 border border-border hover:bg-muted text-foreground mt-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {googleLoading ? "Connecting to Google..." : "Continue with Google"}
        </button>

        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg(null);
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );

}
