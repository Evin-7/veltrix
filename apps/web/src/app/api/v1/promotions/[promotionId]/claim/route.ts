import { jsonData, jsonError } from "@/server/http/errors";
import { requireAuth } from "@/server/auth/session";
import { requireRole } from "@/server/auth/authorization";
import { assertSameOrigin } from "@/server/http/security";
import { enforceMutationRateLimit } from "@/server/http/rate-limit";
import { requireIdempotencyKey } from "@/server/gameplay/service";
import { claimPromotion } from "@/server/promotions/service";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ promotionId: string }> }) {
  try {
    await enforceMutationRateLimit(request, "promotion-claim");
    assertSameOrigin(request);
    const user = requireRole(await requireAuth(), ["PLAYER"]);
    const { promotionId } = await params;
    return jsonData(await claimPromotion(user.id, promotionId, requireIdempotencyKey(request.headers.get("idempotency-key"))));
  } catch (error) {
    return jsonError(error);
  }
}
