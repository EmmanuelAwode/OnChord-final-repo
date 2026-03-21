import { afterEach, describe, expect, it, vi } from "vitest";
import { optionalEnv, requireEnv } from "../env";

describe("env helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns fallback for missing optional env", () => {
    vi.stubEnv("VITE_SENTRY_DSN", "");
    expect(optionalEnv("VITE_SENTRY_DSN", "fallback-value")).toBe("fallback-value");
  });

  it("throws for missing required env", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    expect(() => requireEnv("VITE_SUPABASE_URL")).toThrow(
      "Missing required environment variable: VITE_SUPABASE_URL"
    );
  });
});
