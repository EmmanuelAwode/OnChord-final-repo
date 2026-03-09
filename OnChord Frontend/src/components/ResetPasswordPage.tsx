import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { toast } from "sonner";

export function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // When the user clicks the recovery link, Supabase puts tokens in the URL.
    // detectSessionInUrl: true will parse that, but we still want to confirm we have a session.
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        toast.error("Reset link is invalid or expired. Please request a new one.");
      }
      setReady(true);
    };

    run();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error("Reset session missing. Open the latest reset email link again.");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success("Password updated. You can now sign in.");

      // Optional: send back to home/login
      window.location.href = "/";
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-card/80 backdrop-blur-xl rounded-2xl border border-border p-8 shadow-2xl">
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card/80 backdrop-blur-xl rounded-2xl border border-border p-8 shadow-2xl">
        <h1 className="text-2xl font-bold mb-2">Reset password</h1>
        <p className="text-muted-foreground mb-6">
          Enter a new password for your account.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter a new password"
              minLength={6}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Confirm your password"
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
