import { jsonData, jsonError } from "@/server/http/errors";
import { requireAuth } from "@/server/auth/session";
import { requireRole } from "@/server/auth/authorization";
import { assertSameOrigin } from "@/server/http/security";
import { enforceMutationRateLimit } from "@/server/http/rate-limit";
import { markAllNotificationsRead } from "@/server/notifications/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await enforceMutationRateLimit(request, "notifications");
    assertSameOrigin(request);
    const user = requireRole(await requireAuth(), ["PLAYER"]);
    return jsonData(await markAllNotificationsRead(user.id));
  } catch (error) {
    return jsonError(error);
  }
}
