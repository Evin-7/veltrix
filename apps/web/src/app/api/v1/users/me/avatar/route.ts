import { AppError, jsonData, jsonError } from "@/server/http/errors";
import { requireAuth } from "@/server/auth/session";
import { enforceMutationRateLimit } from "@/server/http/rate-limit";
import { assertSameOrigin } from "@/server/http/security";
import { uploadAvatarToCloudinary } from "@/server/media/cloudinary";

export const runtime = "nodejs";

const MAX_AVATAR_BYTES = 8 * 1024 * 1024;
const MAX_MULTIPART_REQUEST_BYTES = MAX_AVATAR_BYTES + 128 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function assertRequestSize(request: Request) {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength === null) return;

  const length = Number(declaredLength);
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new AppError(400, "BAD_REQUEST", "Request content length is invalid.");
  }
  if (length > MAX_MULTIPART_REQUEST_BYTES) {
    throw new AppError(
      413,
      "FILE_TOO_LARGE",
      "That image is too large. Choose an image under 8 MB.",
    );
  }
}

export async function POST(request: Request) {
  try {
    await enforceMutationRateLimit(request, "profile");
    assertSameOrigin(request);
    await requireAuth();
    assertRequestSize(request);

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof Blob) || file.size === 0) {
      throw new AppError(400, "INVALID_IMAGE", "Choose an image and try again.");
    }
    if (file.size > MAX_AVATAR_BYTES) {
      throw new AppError(
        413,
        "FILE_TOO_LARGE",
        "That image is too large. Choose an image under 8 MB.",
      );
    }
    if (!ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase())) {
      throw new AppError(
        400,
        "INVALID_IMAGE",
        "Choose a JPG, PNG, or WebP image and try again.",
      );
    }

    const avatarUrl = await uploadAvatarToCloudinary(file);
    return jsonData({ avatarUrl });
  } catch (error) {
    return jsonError(error);
  }
}
