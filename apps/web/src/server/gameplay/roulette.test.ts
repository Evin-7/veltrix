import { describe, expect, it } from "vitest";
import { evaluateRoulette, rouletteColor } from "./roulette";

describe("European Roulette rules", () => {
  it("maps zero to green and never treats it as even", () => {
    expect(rouletteColor(0)).toBe("GREEN");
    expect(evaluateRoulette(0, { type: "EVEN" }, 100).payout).toBe(0);
  });

  it("returns total wagered amount plus profit for wins", () => {
    expect(evaluateRoulette(19, { type: "RED" }, 100).payout).toBe(200);
    expect(evaluateRoulette(19, { type: "SINGLE_NUMBER", number: 19 }, 100).payout).toBe(3600);
    expect(evaluateRoulette(20, { type: "RED" }, 100).payout).toBe(0);
  });

  it("settles the European outside bets with their configured payouts", () => {
    expect(evaluateRoulette(18, { type: "LOW_18" }, 100).payout).toBe(200);
    expect(evaluateRoulette(19, { type: "HIGH_19" }, 100).payout).toBe(200);
    expect(evaluateRoulette(12, { type: "DOZEN_1_12" }, 100).payout).toBe(300);
    expect(evaluateRoulette(24, { type: "DOZEN_13_24" }, 100).payout).toBe(300);
    expect(evaluateRoulette(36, { type: "DOZEN_25_36" }, 100).payout).toBe(300);
    expect(evaluateRoulette(1, { type: "COLUMN_1" }, 100).payout).toBe(300);
    expect(evaluateRoulette(2, { type: "COLUMN_2" }, 100).payout).toBe(300);
    expect(evaluateRoulette(3, { type: "COLUMN_3" }, 100).payout).toBe(300);
    expect(evaluateRoulette(0, { type: "LOW_18" }, 100).payout).toBe(0);
  });

  it("rejects results outside the single-zero wheel", () => {
    expect(() => evaluateRoulette(37, { type: "RED" }, 100)).toThrow();
    expect(() => evaluateRoulette(-1, { type: "BLACK" }, 100)).toThrow();
  });
});
