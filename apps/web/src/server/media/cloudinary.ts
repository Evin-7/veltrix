import "server-only";
import { randomUUID } from "node:crypto";
import { AppError } from "@/server/http/errors";
import { getEnv } from "@/server/env";
import { logger } from "@/server/observability/logger";

type CloudinaryUploadResponse = {
  secure_url?: unknown;
  error?: { message?: unknown; http_code?: unknown };
};

const CLOUDINARY_TIMEOUT_MS = 20_000;

function isConfiguredForAuthenticatedUpload(
  cloudName: string | undefined,
  apiKey: string | undefined,
  apiSecret: string | undefined,
) {
  return Boolean(cloudName && apiKey && apiSecret);
}

function classifyCloudinaryRejection(status: number, message: unknown) {
  const normalizedMessage =
    typeof message === "string" ? message.toLowerCase() : "";

  if (normalizedMessage.includes("signature")) return "invalid_signature";
  if (
    normalizedMessage.includes("api key") ||
    normalizedMessage.includes("api_key")
  ) {
    return "invalid_api_key";
  }
  if (normalizedMessage.includes("preset")) return "invalid_upload_preset";
  if (
    normalizedMessage.includes("quota") ||
    normalizedMessage.includes("credit")
  ) {
    return "account_limit";
  }
  if (status === 401 || status === 403) return "credentials_rejected";
  if (status === 413 || normalizedMessage.includes("too large")) {
    return "file_too_large";
  }
  return "provider_rejected";
}

function safeProviderMessage(message: unknown, credentials: string[]) {
  if (typeof message !== "string") return undefined;

  let sanitized = message.replace(/[\r\n\t]+/g, " ").trim();
  for (const credential of credentials) {
    if (credential) sanitized = sanitized.replaceAll(credential, "[redacted]");
  }
  sanitized = sanitized.replace(/\b[a-f\d]{40,64}\b/gi, "[redacted-digest]");
  return sanitized.slice(0, 240) || undefined;
}

async function uploadImageToCloudinary(
  file: Blob,
  folder: string,
  fileName: string,
) {
  const environment = getEnv();
  const cloudName = environment.CLOUDINARY_CLOUD_NAME;

  const authenticatedUpload = isConfiguredForAuthenticatedUpload(
    cloudName,
    environment.CLOUDINARY_API_KEY,
    environment.CLOUDINARY_API_SECRET,
  );
  const unsignedUpload = Boolean(
    cloudName && environment.CLOUDINARY_UPLOAD_PRESET,
  );

  if (!authenticatedUpload && !unsignedUpload) {
    throw new AppError(
      503,
      "IMAGE_UPLOAD_NOT_CONFIGURED",
      "Image uploads are not configured yet.",
    );
  }

  const body = new FormData();
  body.append("file", file, fileName);

  const headers = new Headers();
  if (authenticatedUpload) {
    const credentials = `${environment.CLOUDINARY_API_KEY}:${environment.CLOUDINARY_API_SECRET}`;
    headers.set(
      "Authorization",
      `Basic ${Buffer.from(credentials, "utf8").toString("base64")}`,
    );
    body.append("folder", folder);
    body.append("public_id", randomUUID());
  } else {
    body.append(
      "upload_preset",
      environment.CLOUDINARY_UPLOAD_PRESET as string,
    );
    body.append("folder", folder);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLOUDINARY_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName as string)}/image/upload`,
      { body, headers, method: "POST", signal: controller.signal },
    );
    const payload = (await response
      .json()
      .catch(() => null)) as CloudinaryUploadResponse | null;
    const secureUrl = payload?.secure_url;

    if (
      !response.ok ||
      typeof secureUrl !== "string" ||
      !secureUrl.startsWith("https://")
    ) {
      const providerMessage = payload?.error?.message;
      logger.error("media.cloudinary_upload_rejected", {
        folder,
        providerStatus: response.status,
        providerCode:
          typeof payload?.error?.http_code === "number"
            ? payload.error.http_code
            : undefined,
        reason: response.ok
          ? "invalid_response"
          : classifyCloudinaryRejection(response.status, providerMessage),
        providerMessage: safeProviderMessage(providerMessage, [
          environment.CLOUDINARY_API_KEY ?? "",
          environment.CLOUDINARY_API_SECRET ?? "",
        ]),
      });
      throw new AppError(
        502,
        "IMAGE_UPLOAD_FAILED",
        "We could not upload that image. Please try again.",
      );
    }

    return secureUrl;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error("media.cloudinary_upload_unreachable", {
      folder,
      reason:
        error instanceof Error && error.name === "AbortError"
          ? "timeout"
          : "network_error",
      errorName: error instanceof Error ? error.name : "unknown",
    });
    throw new AppError(
      502,
      "IMAGE_UPLOAD_FAILED",
      "We could not upload that image. Please try again.",
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export function uploadAvatarToCloudinary(file: Blob) {
  return uploadImageToCloudinary(
    file,
    getEnv().CLOUDINARY_FOLDER,
    "avatar.jpg",
  );
}

export function uploadGameThumbnailToCloudinary(file: Blob, fileName: string) {
  return uploadImageToCloudinary(file, "veltrix/game-thumbnails", fileName);
}
