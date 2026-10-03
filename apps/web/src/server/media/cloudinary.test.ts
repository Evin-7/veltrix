import { describe, expect, it } from "vitest";
import {
  classifyCloudinaryRejection,
  cloudinaryFailureMessage,
} from "./cloudinary";

describe("Cloudinary upload failures", () => {
  it("explains an unknown production API key clearly", () => {
    const reason = classifyCloudinaryRejection(401, "unknown api_key");

    expect(reason).toBe("invalid_api_key");
    expect(cloudinaryFailureMessage(reason)).toContain(
      "production Cloudinary API key",
    );
  });

  it("gives transient failures a retryable message", () => {
    expect(cloudinaryFailureMessage("timeout")).toContain("Please try again");
    expect(cloudinaryFailureMessage("network_error")).toContain(
      "Please try again",
    );
  });

  it("keeps unknown provider errors safe and generic", () => {
    expect(cloudinaryFailureMessage("provider_rejected")).toBe(
      "The image service could not upload that image. Please try again.",
    );
  });
});
