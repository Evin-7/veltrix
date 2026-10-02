import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { AppError } from "@/server/http/errors";
import { getEnv } from "@/server/env";

type CloudinaryUploadResponse = {
  secure_url?: unknown;
  error?: { message?: unknown };
};

const CLOUDINARY_TIMEOUT_MS = 20_000;

function signParameters(parameters: Record<string, string>, apiSecret: string) {
  const serialized = Object.entries(parameters)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1").update(`${serialized}${apiSecret}`).digest("hex");
}

function isConfiguredForSignedUpload(
  cloudName: string | undefined,
  apiKey: string | undefined,
  apiSecret: string | undefined,
) {
  return Boolean(cloudName && apiKey && apiSecret);
}

export async function uploadAvatarToCloudinary(file: Blob) {
  const environment = getEnv();
  const cloudName = environment.CLOUDINARY_CLOUD_NAME;
  const folder = environment.CLOUDINARY_FOLDER;

  const signedUpload = isConfiguredForSignedUpload(
    cloudName,
    environment.CLOUDINARY_API_KEY,
    environment.CLOUDINARY_API_SECRET,
  );
  const unsignedUpload = Boolean(cloudName && environment.CLOUDINARY_UPLOAD_PRESET);

  if (!signedUpload && !unsignedUpload) {
    throw new AppError(
      503,
      "IMAGE_UPLOAD_NOT_CONFIGURED",
      "Profile image uploads are not configured yet.",
    );
  }

  const body = new FormData();
  body.append("file", file, "avatar.jpg");

  if (signedUpload) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const parameters = {
      folder,
      public_id: randomUUID(),
      timestamp,
    };

    body.append("api_key", environment.CLOUDINARY_API_KEY as string);
    body.append("folder", parameters.folder);
    body.append("public_id", parameters.public_id);
    body.append("timestamp", parameters.timestamp);
    body.append(
      "signature",
      signParameters(parameters, environment.CLOUDINARY_API_SECRET as string),
    );
  } else {
    body.append("upload_preset", environment.CLOUDINARY_UPLOAD_PRESET as string);
    body.append("folder", folder);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLOUDINARY_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName as string)}/image/upload`,
      { body, method: "POST", signal: controller.signal },
    );
    const payload = (await response.json().catch(() => null)) as CloudinaryUploadResponse | null;
    const secureUrl = payload?.secure_url;

    if (!response.ok || typeof secureUrl !== "string" || !secureUrl.startsWith("https://")) {
      throw new AppError(
        502,
        "IMAGE_UPLOAD_FAILED",
        "We could not upload that image. Please try again.",
      );
    }

    return secureUrl;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      502,
      "IMAGE_UPLOAD_FAILED",
      "We could not upload that image. Please try again.",
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
