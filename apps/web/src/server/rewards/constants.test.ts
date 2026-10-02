import { describe, expect, it } from "vitest";
import { calculateGameplayXp, vipLevelIndex } from "./constants";

describe("progression rules", () => {
  it("derives XP from wager size without accepting client-provided XP", () => {
    expect(calculateGameplayXp(10)).toBe(1);
    expect(calculateGameplayXp(99)).toBe(9);
    expect(calculateGameplayXp(500)).toBe(50);
  });

  it("keeps VIP levels ordered", () => {
    expect(vipLevelIndex("BRONZE")).toBeLessThan(vipLevelIndex("SILVER"));
    expect(vipLevelIndex("PLATINUM")).toBeLessThan(vipLevelIndex("DIAMOND"));
  });
});
