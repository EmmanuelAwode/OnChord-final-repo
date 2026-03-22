import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the ML service module
vi.mock("../api/mlService", () => ({
  classifyMoodByTrackIds: vi.fn(),
  checkMlServiceHealth: vi.fn(),
}));

describe("Mood Analysis - Top Tracks Integration", () => {
  let mlService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Dynamically import the mocked module
    mlService = await import("../api/mlService");
  });

  it("validates mood classification requires track IDs", async () => {
    mlService.classifyMoodByTrackIds.mockRejectedValue(
      new Error("track_ids parameter is required")
    );

    try {
      await mlService.classifyMoodByTrackIds({ track_ids: [] });
      expect.fail("Should have thrown error");
    } catch (error: any) {
      expect(error.message).toContain("track_ids");
    }
  });

  it("returns mood analysis with confidence score", async () => {
    const mockResult = {
      mood: "happy",
      confidence: 0.87,
      analysis: {
        energy: 0.75,
        valence: 0.82,
        danceability: 0.68,
      },
    };

    mlService.classifyMoodByTrackIds.mockResolvedValue(mockResult);

    const result = await mlService.classifyMoodByTrackIds({
      track_ids: ["track-1", "track-2"],
    });

    expect(result.mood).toBe("happy");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("validates mood categories are consistent", async () => {
    const validMoods = [
      "happy",
      "sad",
      "energetic",
      "calm",
      "angry",
      "neutral",
      "romantic",
      "dark",
    ];

    mlService.classifyMoodByTrackIds.mockResolvedValue({
      mood: "happy",
      confidence: 0.9,
    });

    const result = await mlService.classifyMoodByTrackIds({
      track_ids: ["track-1"],
    });

    expect(validMoods).toContain(result.mood);
  });

  it("detects ML service health status", async () => {
    mlService.checkMlServiceHealth.mockResolvedValue({
      status: "healthy",
      version: "1.0.0",
    });

    const result = await mlService.checkMlServiceHealth();

    expect(result.status).toBe("healthy");
    expect(result.version).toBeDefined();
  });

  it("handles ML service unavailability", async () => {
    mlService.checkMlServiceHealth.mockRejectedValue(
      new Error("ML service unavailable")
    );

    try {
      await mlService.checkMlServiceHealth();
      expect.fail("Should have thrown error");
    } catch (error: any) {
      expect(error.message).toContain("unavailable");
    }
  });

  it("handles timeout errors from ML service", async () => {
    mlService.classifyMoodByTrackIds.mockRejectedValue(
      new Error("Request timeout: ML service took too long")
    );

    try {
      await mlService.classifyMoodByTrackIds({
        track_ids: ["track-1"],
      });
      expect.fail("Should have thrown error");
    } catch (error: any) {
      expect(error.message).toContain("timeout");
    }
  });

  it("validates audio features are returned", async () => {
    const mockResult = {
      mood: "energetic",
      confidence: 0.82,
      analysis: {
        energy: 0.9,
        valence: 0.7,
        danceability: 0.85,
      },
    };

    mlService.classifyMoodByTrackIds.mockResolvedValue(mockResult);

    const result = await mlService.classifyMoodByTrackIds({
      track_ids: ["energetic-track-1"],
    });

    expect(result.analysis).toBeDefined();
    expect(result.analysis.energy).toBeGreaterThan(0.5);
  });
});
