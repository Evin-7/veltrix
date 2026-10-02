import { jsonData, jsonError, readJson } from "@/server/http/errors";
import { requireAuth } from "@/server/auth/session";
import { enforceMutationRateLimit } from "@/server/http/rate-limit";
import { assertSameOrigin } from "@/server/http/security";
import { updateProfileSchema } from "@/server/users/schemas";
import { updateUserProfile } from "@/server/users/service";

export const runtime = "nodejs";

export async function GET() {
  try {
    return jsonData(await requireAuth());
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await enforceMutationRateLimit(request, "profile");
    assertSameOrigin(request);
    const user = await requireAuth();
    const input = updateProfileSchema.parse(await readJson(request));
    return jsonData(await updateUserProfile(user.id, input));
  } catch (error) {
    return jsonError(error);
  }
}
