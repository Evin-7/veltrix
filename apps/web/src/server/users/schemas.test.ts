import { describe, expect, it } from "vitest";
import { updateProfileSchema } from "./schemas";

describe("profile update schema", () => {
  it("accepts only safe profile fields", () => {
    expect(updateProfileSchema.parse({ displayName: "A new name" })).toEqual({ displayName: "A new name" });
    expect(updateProfileSchema.parse({ avatarUrl: null })).toEqual({ avatarUrl: null });
  });

  it("rejects role, wallet, and empty updates", () => {
    expect(updateProfileSchema.safeParse({ role: "ADMIN" }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ balance: 1_000_000 }).success).toBe(false);
    expect(updateProfileSchema.safeParse({}).success).toBe(false);
  });
});
