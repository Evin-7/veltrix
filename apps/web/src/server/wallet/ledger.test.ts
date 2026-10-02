import { describe, expect, it } from "vitest";
import { MAX_VC_BALANCE, calculateWalletBalance } from "./ledger";

describe("wallet ledger arithmetic", () => {
  it("uses positive credits and negative debits", () => {
    expect(calculateWalletBalance(0, 10_000)).toBe(10_000);
    expect(calculateWalletBalance(10_000, -100)).toBe(9_900);
  });

  it("rejects a debit that would make the balance negative", () => {
    expect(() => calculateWalletBalance(100, -101)).toThrow("enough virtual balance");
  });

  it("rejects non-integer, zero, and overflowing operations", () => {
    expect(() => calculateWalletBalance(100, 0)).toThrow("non-zero integer");
    expect(() => calculateWalletBalance(100, 1.5)).toThrow("non-zero integer");
    expect(() => calculateWalletBalance(MAX_VC_BALANCE, 1)).toThrow("allowed virtual balance limit");
  });
});
