import { jsonData, jsonError } from "@/server/http/errors";
import { requireAuth } from "@/server/auth/session";
import { requireRole } from "@/server/auth/authorization";
import { assertSameOrigin } from "@/server/http/security";
import { enforceMutationRateLimit } from "@/server/http/rate-limit";
import { markNotificationRead } from "@/server/notifications/service";
import { uuidSchema } from "@/server/users/schemas";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ notificationId: string }> }) {
  try {
    await enforceMutationRateLimit(request, "notifications");
    assertSameOrigin(request);
    const user = requireRole(await requireAuth(), ["PLAYER"]);
    return jsonData(await markNotificationRead(user.id, uuidSchema.parse((await params).notificationId)));
  } catch (error) {
    return jsonError(error);
  }
}
