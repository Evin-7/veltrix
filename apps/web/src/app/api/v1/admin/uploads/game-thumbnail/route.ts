import { adminHandler, adminOptions } from "@/app/api/v1/admin/_lib";
import { AppError, jsonData } from "@/server/http/errors";
import { uploadGameThumbnailToCloudinary } from "@/server/media/cloudinary";

export const runtime = "nodejs";

const MAX_THUMBNAIL_BYTES = 8 * 1024 * 1024;
const MAX_MULTIPART_REQUEST_BYTES = MAX_THUMBNAIL_BYTES + 128 * 1024;
const FILE_NAMES: Record<string, string> = {
  "image/jpeg": "game-thumbnail.jpg",
  "image/png": "game-thumbnail.png",
  "image/webp": "game-thumbnail.webp",
};

function assertRequestSize(request: Request) {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength === null) return;

  const length = Number(declaredLength);
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new AppError(400, "BAD_REQUEST", "Request content length is invalid.");
  }
  if (length > MAX_MULTIPART_REQUEST_BYTES) {
    throw new AppError(413, "FILE_TOO_LARGE", "Choose an image under 8 MB.");
  }
}

async function hasMatchingImageSignature(file: Blob, mimeType: string) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
  }
  if (mimeType === "image/webp") {
    return bytes.length >= 12
      && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
      && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

export function OPTIONS(request: Request) {
  return adminOptions(request);
}

export async function POST(request: Request) {
  return adminHandler(request, ["ADMIN", "SUPER_ADMIN"], async () => {
    assertRequestSize(request);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof Blob) || file.size === 0) {
      throw new AppError(400, "INVALID_IMAGE", "Choose an image and try again.");
    }
    if (file.size > MAX_THUMBNAIL_BYTES) {
      throw new AppError(413, "FILE_TOO_LARGE", "Choose an image under 8 MB.");
    }

    const mimeType = file.type.toLowerCase();
    const fileName = FILE_NAMES[mimeType];
    if (!fileName || !(await hasMatchingImageSignature(file, mimeType))) {
      throw new AppError(400, "INVALID_IMAGE", "Choose a valid JPG, PNG, or WebP image.");
    }

    const thumbnailUrl = await uploadGameThumbnailToCloudinary(file, fileName);
    return jsonData({ thumbnailUrl });
  });
}
