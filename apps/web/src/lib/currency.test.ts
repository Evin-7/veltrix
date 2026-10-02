import { describe, expect, it } from "vitest";
import { formatCurrency, replaceLegacyCurrencyText } from "./currency";

describe("formatCurrency", () => {
  it("uses the euro symbol and locale grouping", () => {
    expect(formatCurrency(9990)).toBe("€9,990");
  });

  it("supports signed transaction displays", () => {
    expect(formatCurrency(300, { sign: "always" })).toBe("+€300");
    expect(formatCurrency(-100, { sign: "always" })).toBe("-€100");
  });

  it("normalizes legacy persisted notification copy", () => {
    expect(
      replaceLegacyCurrencyText("750 VC was added; +300 VC returned."),
    ).toBe("€750 was added; +€300 returned.");
  });
});
