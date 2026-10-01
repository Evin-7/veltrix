import { describe, expect, it } from "vitest";
import { createSessionToken, hashSessionToken } from "./token";

describe("session tokens", () => {
  it("creates high-entropy tokens and persists only deterministic hashes", () => {
    const first = createSessionToken();
    const second = createSessionToken();

    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThan(40);
    expect(hashSessionToken(first, "test-secret")).toHaveLength(64);
    expect(hashSessionToken(first, "test-secret")).toBe(hashSessionToken(first, "test-secret"));
    expect(hashSessionToken(first, "test-secret")).not.toBe(first);
  });
});
