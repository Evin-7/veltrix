import { describe, expect, it } from "vitest";
import { sanitizeNextPath } from "./redirect";

describe("OAuth return paths", () => {
  it("preserves safe internal paths with query strings", () => {
    expect(sanitizeNextPath("/casino/signal-blackjack/play?from=login")).toBe("/casino/signal-blackjack/play?from=login");
  });

  it("rejects external, protocol-relative, and backslash redirects", () => {
    expect(sanitizeNextPath("https://example.com/account")).toBe("/");
    expect(sanitizeNextPath("//example.com/account")).toBe("/");
    expect(sanitizeNextPath("/\\\\example.com/account")).toBe("/");
  });
});
