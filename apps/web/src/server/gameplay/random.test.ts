import { describe, expect, it } from "vitest";
import { secureRandom, shuffle } from "./random";

describe("secure random utility", () => {
  it("always returns values inside the requested bound", () => {
    for (let index = 0; index < 100; index += 1) {
      const value = secureRandom.nextInt(37);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(37);
    }
  });

  it("shuffles without changing the collection", () => {
    const shuffled = shuffle([1, 2, 3, 4], { nextInt: (bound) => bound - 1 });
    expect(shuffled).toHaveLength(4);
    expect([...shuffled].sort()).toEqual([1, 2, 3, 4]);
  });
});
