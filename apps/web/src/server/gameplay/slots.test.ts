import { describe, expect, it } from "vitest";
import { evaluateSlotReels } from "./slots";

describe("Neon Relics rules", () => {
  it("evaluates left-to-right paylines and calculates server payout", () => {
    const result = evaluateSlotReels([
      ["crystal", "diamond", "star"],
      ["crystal", "diamond", "star"],
      ["crystal", "diamond", "star"],
      ["crystal", "diamond", "star"],
      ["crystal", "diamond", "star"],
    ], 10);
    expect(result.winningLines[0]).toMatchObject({ line: 1, symbol: "crystal", count: 5, multiplier: 150, payout: 1500 });
    expect(result.payout).toBeGreaterThanOrEqual(1500);
  });

  it("does not pay partial matches", () => {
    const result = evaluateSlotReels([
      ["crystal", "diamond", "star"],
      ["crystal", "diamond", "star"],
      ["crown", "diamond", "star"],
      ["crown", "diamond", "star"],
      ["crystal", "diamond", "star"],
    ], 100);
    expect(result.winningLines.some((line) => line.line === 1)).toBe(false);
  });
});
