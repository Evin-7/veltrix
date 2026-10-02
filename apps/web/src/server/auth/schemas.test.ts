import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./schemas";

describe("auth schemas", () => {
  it("normalizes registration identity fields", () => {
    expect(registerSchema.parse({ email: "  PLAYER@Example.com ", username: "Orbit_Player", password: "a-secure-password" })).toMatchObject({ email: "player@example.com", username: "orbit_player" });
  });

  it("rejects weak passwords and malformed usernames", () => {
    expect(registerSchema.safeParse({ email: "player@example.com", username: "bad-name", password: "short" }).success).toBe(false);
  });

  it("accepts login credentials and normalizes email", () => {
    expect(loginSchema.parse({ email: "PLAYER@Example.com", password: "secret" }).email).toBe("player@example.com");
  });

  it("rejects unexpected credential fields", () => {
    expect(loginSchema.safeParse({ email: "player@example.com", password: "secret", role: "SUPER_ADMIN" }).success).toBe(false);
    expect(registerSchema.safeParse({ email: "player@example.com", username: "player", password: "a-secure-password", role: "SUPER_ADMIN" }).success).toBe(false);
  });
});
