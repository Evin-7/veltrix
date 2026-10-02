import { beforeAll, describe, expect, it } from "vitest";
import { assertSameOrigin } from "./security";

beforeAll(() => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/veltrix";
  process.env.AUTH_SECRET = "security-test-secret-with-more-than-32-characters";
  process.env.APP_URL = "https://veltrix.example";
  process.env.ADMIN_APP_URL = "https://admin.veltrix.example";
});

describe("same-origin mutation boundary", () => {
  it("accepts a matching Origin", () => {
    expect(() => assertSameOrigin(new Request("https://veltrix.example/api", { method: "POST", headers: { Origin: "https://veltrix.example" } }))).not.toThrow();
  });

  it("accepts a matching Referer when Origin is unavailable", () => {
    expect(() => assertSameOrigin(new Request("https://veltrix.example/api", { method: "POST", headers: { Referer: "https://veltrix.example/account" } }))).not.toThrow();
  });

  it("rejects missing browser provenance and cross-site provenance", () => {
    expect(() => assertSameOrigin(new Request("https://veltrix.example/api", { method: "POST" }))).toThrow("origin");
    expect(() => assertSameOrigin(new Request("https://veltrix.example/api", { method: "POST", headers: { Origin: "https://evil.example" } }))).toThrow("origin");
  });

  it("rejects conflicting Origin and Referer values", () => {
    expect(() => assertSameOrigin(new Request("https://veltrix.example/api", { method: "POST", headers: { Origin: "https://veltrix.example", Referer: "https://evil.example/" } }))).toThrow("origin");
  });
});
