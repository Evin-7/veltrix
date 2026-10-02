import { describe, expect, it } from "vitest";
import { promotionCreateSchema } from "./schemas";

describe("promotion schemas", () => {
  it("requires bounded, server-controlled eligibility fields", () => {
    const parsed = promotionCreateSchema.parse({ title: "Welcome", slug: "welcome", description: "Demo reward", startAt: "2026-01-01T00:00:00Z", endAt: "2099-01-01T00:00:00Z", rewardVC: 500, eligibility: { minLevel: "SILVER", minXp: 100 } });
    expect(parsed.eligibility).toMatchObject({ minLevel: "SILVER", minXp: 100 });
    expect(() => promotionCreateSchema.parse({ title: "Welcome", slug: "welcome", description: "Demo reward", startAt: "2026-01-01T00:00:00Z", endAt: "2099-01-01T00:00:00Z", rewardVC: 500, eligibility: { rewardVC: 999 } })).toThrow();
  });

  it("rejects invalid promotion windows", () => {
    expect(() => promotionCreateSchema.parse({ title: "Welcome", slug: "welcome", description: "Demo reward", startAt: "2026-01-02T00:00:00Z", endAt: "2026-01-01T00:00:00Z", rewardVC: 500 })).toThrow();
  });
});
