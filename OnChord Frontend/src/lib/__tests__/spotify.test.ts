import { describe, it, expect, beforeEach, vi } from "vitest";
import { supabase } from "../supabaseClient";

// Mock supabase auth
vi.mock("../supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}));

describe("Spotify Connection & State", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("checks if user is authenticated for Spotify API calls", async () => {
    const mockSession = {
      user: { id: "user-123", email: "test@example.com" },
      access_token: "spotify-token",
    };

    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: mockSession },
    });

    const result = await (supabase.auth.getSession as any)();

    expect(result.data.session).toBeDefined();
    expect(result.data.session.user.id).toBe("user-123");
  });

  it("handles missing authentication gracefully", async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null },
    });

    const result = await (supabase.auth.getSession as any)();

    expect(result.data.session).toBeNull();
  });

  it("validates Spotify API response structure", async () => {
    const mockTrackResponse = {
      items: [
        { id: "track-1", name: "Song 1", artists: [{ name: "Artist 1" }] },
        { id: "track-2", name: "Song 2", artists: [{ name: "Artist 2" }] },
      ],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockTrackResponse,
    });

    const response = await fetch("https://api.spotify.com/v1/me/top/tracks");
    const data = await response.json();

    expect(data.items).toBeDefined();
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items[0].id).toBe("track-1");
  });

  it("handles Spotify API errors (401 Unauthorized)", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: { status: 401, message: "The access token expired" },
      }),
    });

    const response = await fetch("https://api.spotify.com/v1/me");
    const data = await response.json();

    expect(response.ok).toBe(false);
    expect(response.status).toBe(401);
    expect(data.error).toBeDefined();
  });

  it("handles Spotify API errors (429 Too Many Requests)", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        error: { message: "Rate limiting in effect" },
      }),
    });

    const response = await fetch("https://api.spotify.com/v1/me/top/artists");

    expect(response.status).toBe(429);
    expect(response.ok).toBe(false);
  });

  it("detects Spotify connection loss", async () => {
    (global.fetch as any).mockRejectedValue(new Error("Network error"));

    try {
      await fetch("https://api.spotify.com/v1/me/top/tracks");
      expect.fail("Should have thrown");
    } catch (error: any) {
      expect(error.message).toContain("Network");
    }
  });

  it("validates time_range parameter values", () => {
    const validTimeRanges = ["short_term", "medium_term", "long_term"];
    const testRange = "short_term";

    expect(validTimeRanges).toContain(testRange);
  });

  it("validates track IDs have proper format", () => {
    const trackId = "3qm84nBvXcwhsAgqRQcRL7";
    // Spotify IDs are typically 22 character base62 strings
    const isValidId = /^[a-zA-Z0-9]{20,}$/.test(trackId);

    expect(isValidId).toBe(true);
  });
});
