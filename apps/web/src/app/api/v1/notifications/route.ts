import { jsonDataWithMeta, jsonError } from "@/server/http/errors";
import { requireAuth } from "@/server/auth/session";
import { requireRole } from "@/server/auth/authorization";
import { listNotifications } from "@/server/notifications/service";
import { rewardHistoryQuerySchema } from "@/server/rewards/schemas";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = requireRole(await requireAuth(), ["PLAYER"]);
    const input = rewardHistoryQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const result = await listNotifications(user.id, input);
    return jsonDataWithMeta({ notifications: result.notifications, unread: result.unread }, result.meta);
  } catch (error) {
    return jsonError(error);
  }
}
