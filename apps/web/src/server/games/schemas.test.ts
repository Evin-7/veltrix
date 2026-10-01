import { describe, expect, it } from "vitest";
import { gameQuerySchema } from "./schemas";

describe("game query schema", () => {
  it("coerces pagination and boolean discovery filters", () => {
    expect(gameQuerySchema.parse({ search: " lunar ", page: "2", pageSize: "5", new: "true" })).toMatchObject({ search: "lunar", page: 2, pageSize: 5, new: true, sort: "popular" });
  });

  it("rejects unsafe pagination sizes", () => {
    expect(gameQuerySchema.safeParse({ pageSize: "101" }).success).toBe(false);
  });
});
