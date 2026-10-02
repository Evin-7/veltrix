import { describe, expect, it } from "vitest";
import { rollDice } from "./dice";

describe("Dice rules", () => {
  it("pays high on 51 through 100", () => {
    expect(rollDice(100, "HIGH", { nextInt: () => 50 }).payout).toBe(200);
    expect(rollDice(100, "HIGH", { nextInt: () => 49 }).payout).toBe(0);
  });

  it("does not treat 50 as a low win", () => {
    expect(rollDice(100, "LOW", { nextInt: () => 49 }).roll).toBe(50);
    expect(rollDice(100, "LOW", { nextInt: () => 49 }).payout).toBe(0);
  });
});
