import { jsonDataWithMeta, jsonError } from "@/server/http/errors";
import { requireAuth } from "@/server/auth/session";
import { requireRole } from "@/server/auth/authorization";
import { listRewardHistory } from "@/server/rewards/service";
import { rewardHistoryQuerySchema } from "@/server/rewards/schemas";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = requireRole(await requireAuth(), ["PLAYER"]);
    const input = rewardHistoryQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const result = await listRewardHistory(user.id, input);
    return jsonDataWithMeta(result.history, result.meta);
  } catch (error) {
    return jsonError(error);
  }
}
