import { describe, expect, it } from "vitest";
import { resultToDice } from "./dice-result";

describe("resultToDice", () => {
  it.each([
    [1, [1]],
    [2, [2]],
    [5, [5]],
    [6, [6]],
    [7, [6, 1]],
    [14, [6, 6, 2]],
    [25, [6, 6, 6, 6, 1]],
    [49, [6, 6, 6, 6, 6, 6, 6, 6, 1]],
    [50, [6, 6, 6, 6, 6, 6, 6, 6, 2]],
    [51, [6, 6, 6, 6, 6, 6, 6, 6, 3]],
    [77, [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5]],
    [99, [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 3]],
    [100, [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 4]],
  ])("maps authoritative result %i to exact D6 faces", (total, expected) => {
    expect(resultToDice(total)).toEqual(expected);
    expect(resultToDice(total).reduce((sum, face) => sum + face, 0)).toBe(
      total,
    );
  });

  it("preserves every result from 1 through 100", () => {
    for (let total = 1; total <= 100; total += 1) {
      const faces = resultToDice(total);
      expect(faces.length).toBeGreaterThan(0);
      expect(
        faces.every((face) => Number.isInteger(face) && face >= 1 && face <= 6),
      ).toBe(true);
      expect(faces.reduce((sum, face) => sum + face, 0)).toBe(total);
    }
  });

  it.each([0, 101, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid result %s",
    (total) => {
      expect(() => resultToDice(total)).toThrow(RangeError);
    },
  );
});
