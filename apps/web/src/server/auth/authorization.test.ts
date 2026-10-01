import { describe, expect, it } from "vitest";
import { requireRole } from "./authorization";

const player = { id: "user-1", email: "player@example.com", role: "PLAYER" as const, status: "ACTIVE" as const, createdAt: new Date().toISOString(), profile: null };

describe("role authorization", () => {
  it("allows an explicitly permitted role", () => {
    expect(requireRole(player, ["PLAYER"]).id).toBe("user-1");
  });

  it("rejects a role outside the permission set", () => {
    expect(() => requireRole(player, ["ADMIN", "SUPER_ADMIN"])).toThrow("permission");
  });
});
