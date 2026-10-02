import { describe, expect, it } from "vitest";
import { readJson } from "./errors";

describe("JSON request boundary", () => {
  it("requires JSON content types", async () => {
    await expect(readJson(new Request("https://veltrix.example/api", { method: "POST", body: "{}" }))).rejects.toMatchObject({ code: "UNSUPPORTED_MEDIA_TYPE", status: 415 });
    await expect(readJson(new Request("https://veltrix.example/api", { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" }))).rejects.toMatchObject({ code: "UNSUPPORTED_MEDIA_TYPE", status: 415 });
  });

  it("parses JSON and rejects oversized bodies", async () => {
    await expect(readJson(new Request("https://veltrix.example/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ok: true }) }))).resolves.toEqual({ ok: true });
    await expect(readJson(new Request("https://veltrix.example/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ value: "x".repeat(66_000) }) }))).rejects.toMatchObject({ code: "REQUEST_TOO_LARGE", status: 413 });
  });
});
