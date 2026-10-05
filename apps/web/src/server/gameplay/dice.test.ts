import { describe, expect, it } from "vitest";
import { rollDice } from "./dice";

describe("Dice rules", () => {
  it("pays high on 51 through 100", () => {
    expect(rollDice(100, "HIGH", { nextInt: () => 50 }).payout).toBe(200);
    expect(rollDice(100, "HIGH", { nextInt: () => 49 }).payout).toBe(0);
  });

  it("treats 50 as a loss for either bet", () => {
    const low = rollDice(100, "LOW", { nextInt: () => 49 });
    const high = rollDice(100, "HIGH", { nextInt: () => 49 });

    expect(low.roll).toBe(50);
    expect(high.roll).toBe(50);
    expect(low.payout).toBe(0);
    expect(high.payout).toBe(0);
  });
});
