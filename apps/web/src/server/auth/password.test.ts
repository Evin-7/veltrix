import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("uses a one-way hash that verifies only the original password", async () => {
    const password = "correct horse battery staple";
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(await verifyPassword(hash, password)).toBe(true);
    expect(await verifyPassword(hash, "not the password")).toBe(false);
  });
});
