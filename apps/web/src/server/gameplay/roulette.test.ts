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
});
