import { z } from "zod";
import { badRequest, jsonData, jsonError } from "@/server/http/errors";
import { requireAuth } from "@/server/auth/session";
import { requireRole } from "@/server/auth/authorization";
import { assertSameOrigin } from "@/server/http/security";
import { blackjackAction, requireIdempotencyKey } from "@/server/gameplay/service";
import { uuidSchema } from "@/server/users/schemas";
import { gameplayModeForSlug } from "@/server/gameplay/constants";
import { enforceMutationRateLimit } from "@/server/http/rate-limit";

export const runtime = "nodejs";
type RouteProps = { params: Promise<{ slug: string; roundId: string; action: string }> };

export async function POST(request: Request, { params }: RouteProps) {
  try {
    await enforceMutationRateLimit(request, "gameplay");
    assertSameOrigin(request);
    const user = requireRole(await requireAuth(), ["PLAYER"]);
    const { slug, roundId, action } = await params;
    if (gameplayModeForSlug(slug) !== "BLACKJACK") throw badRequest("This game does not have blackjack actions.");
    return jsonData(await blackjackAction(user.id, uuidSchema.parse(roundId), z.enum(["hit", "stand", "double"]).parse(action), requireIdempotencyKey(request.headers.get("idempotency-key")), slug));
  } catch (error) {
    return jsonError(error);
  }
}
