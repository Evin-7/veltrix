import { describe, expect, it } from "vitest";
import { resolveArcadeRun } from "./arcade";

describe("Arcade settlement", () => {
  it("keeps score and payout server-derived from the injected RNG", () => {
    const result = resolveArcadeRun("neon-paddock", 100, { nextInt: (maxExclusive) => maxExclusive - 1 });
    expect(result.distance).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThan(result.distance);
    expect(result.payout).toBe(300);
  });
});
