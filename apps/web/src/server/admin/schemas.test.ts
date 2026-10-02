import { describe, expect, it } from "vitest";
import { auditListSchema, playerListSchema, walletAdjustmentSchema } from "./schemas";

describe("admin request schemas", () => {
  it("applies bounded pagination defaults", () => {
    expect(playerListSchema.parse({})).toMatchObject({ page: 1, pageSize: 25 });
    expect(() => playerListSchema.parse({ pageSize: 101 })).toThrow();
  });

  it("rejects zero or non-integer VC corrections", () => {
    expect(() => walletAdjustmentSchema.parse({ userId: "not-a-uuid", amount: 100, reason: "test" })).toThrow();
    expect(() => walletAdjustmentSchema.parse({ userId: "00000000-0000-4000-8000-000000000001", amount: 0, reason: "test" })).toThrow();
    expect(walletAdjustmentSchema.parse({ userId: "00000000-0000-4000-8000-000000000001", amount: -100, reason: "manual correction" }).amount).toBe(-100);
  });

  it("keeps audit filters bounded", () => {
    expect(auditListSchema.parse({ targetType: "USER" })).toMatchObject({ targetType: "USER", page: 1, pageSize: 25 });
    expect(() => auditListSchema.parse({ action: "x".repeat(81) })).toThrow();
  });
});
