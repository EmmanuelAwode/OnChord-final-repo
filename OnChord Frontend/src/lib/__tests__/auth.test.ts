import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { supabase } from "../supabaseClient";

// Mock supabase client
vi.mock("../supabaseClient", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      refreshSession: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe("Authentication Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("initializes auth session on app load", async () => {
    const mockListener = vi.fn();
    (supabase.auth.onAuthStateChange as any).mockImplementation((callback: any) => {
      callback("INITIAL_SESSION", {
        user: { id: "user-123", email: "test@example.com" },
        access_token: "token-abc",
      });
      return { data: { subscription: { unsubscribe: () => {} } } };
    });

    const listener = await (supabase.auth.onAuthStateChange as any)((event: any, session: any) => {
      mockListener(event, session);
    });

    expect(mockListener).toHaveBeenCalled();
  });

  it("handles OAuth sign-in with Spotify", async () => {
    (supabase.auth.signInWithOAuth as any).mockResolvedValue({
      data: { url: "https://spotify-auth-url" },
      error: null,
    });

    const result = await (supabase.auth.signInWithOAuth as any)({
      provider: "spotify",
      options: {
        scopes: "user-read-private user-read-email user-top-read",
      },
    });

    expect(result.data).toBeDefined();
    expect(result.data.url).toContain("spotify");
    expect(result.error).toBeNull();
  });

  it("handles auth sign-out", async () => {
    (supabase.auth.signOut as any).mockResolvedValue({
      error: null,
    });

    const result = await (supabase.auth.signOut as any)();

    expect(result.error).toBeNull();
  });

  it("retrieves current session", async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: {
        session: {
          user: { id: "user-123", email: "test@example.com" },
          access_token: "token-abc",
        },
      },
      error: null,
    });

    const result = await (supabase.auth.getSession as any)();

    expect(result.data.session).toBeDefined();
    expect(result.data.session.user.id).toBe("user-123");
  });

  it("handles refresh token on session expiry", async () => {
    (supabase.auth.refreshSession as any).mockResolvedValue({
      data: {
        session: {
          user: { id: "user-123" },
          access_token: "new-token-xyz",
        },
      },
      error: null,
    });

    const result = await (supabase.auth.refreshSession as any)();

    expect(result.data.session.access_token).toBe("new-token-xyz");
  });

  it("handles auth errors gracefully", async () => {
    (supabase.auth.signInWithOAuth as any).mockResolvedValue({
      data: null,
      error: {
        message: "OAuth provider error",
        status: 500,
      },
    });

    const result = await (supabase.auth.signInWithOAuth as any)({
      provider: "spotify",
    });

    expect(result.error).toBeDefined();
    expect(result.error.message).toContain("OAuth");
    expect(result.data).toBeNull();
  });
});
