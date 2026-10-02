import { describe, expect, it } from "vitest";
import { dealBaccarat } from "./baccarat";

const highest: { nextInt: (maxExclusive: number) => number } = { nextInt: (maxExclusive) => maxExclusive - 1 };

describe("Baccarat rules", () => {
  it("deals valid hands and settles only the selected outcome", () => {
    const result = dealBaccarat(100, "PLAYER", highest);
    expect(result.playerCards.length).toBeGreaterThanOrEqual(2);
    expect(result.bankerCards.length).toBeGreaterThanOrEqual(2);
    expect(result.playerTotal).toBeGreaterThanOrEqual(0);
    expect(result.playerTotal).toBeLessThanOrEqual(9);
    expect(result.bankerTotal).toBeGreaterThanOrEqual(0);
    expect(result.bankerTotal).toBeLessThanOrEqual(9);
    expect(result.payout).toBe(result.winner === "PLAYER" ? 200 : 0);
  });
});
