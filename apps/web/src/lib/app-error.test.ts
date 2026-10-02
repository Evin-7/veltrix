import { describe, expect, it } from "vitest";
import { normalizeApiError, normalizeAppError } from "./app-error";

describe("player error normalization", () => {
  it("maps server codes to safe player-facing copy", () => {
    expect(normalizeApiError({ error: { code: "INSUFFICIENT_BALANCE", message: "internal ledger text" } }, 409)).toMatchObject({
      code: "INSUFFICIENT_BALANCE",
      message: "Your balance is too low for that action.",
      status: 409,
    });
  });

  it("does not expose unknown server messages", () => {
    expect(normalizeApiError({ error: { code: "INTERNAL_ERROR", message: "Prisma connection string" } }).message).toBe("Something went wrong on our side. Please try again.");
  });

  it("treats transport failures as retryable network errors", () => {
    const error = normalizeAppError(new TypeError("Failed to fetch"));
    expect(error).toMatchObject({ code: "NETWORK_ERROR", retryable: true });
  });
});
