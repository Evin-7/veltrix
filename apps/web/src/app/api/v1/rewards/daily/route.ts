import { jsonData, jsonError } from "@/server/http/errors";
import { requireAuth } from "@/server/auth/session";
import { requireRole } from "@/server/auth/authorization";
import { enforceMutationRateLimit } from "@/server/http/rate-limit";
import { assertSameOrigin } from "@/server/http/security";
import { claimDailyReward, getDailyRewardStatus } from "@/server/wallet/service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = requireRole(await requireAuth(), ["PLAYER"]);
    return jsonData(await getDailyRewardStatus(user.id));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    enforceMutationRateLimit(request, "daily-reward");
    assertSameOrigin(request);
    const user = requireRole(await requireAuth(), ["PLAYER"]);
    return jsonData(await claimDailyReward(user.id));
  } catch (error) {
    return jsonError(error);
  }
}
