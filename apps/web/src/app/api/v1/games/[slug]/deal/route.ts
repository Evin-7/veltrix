import { badRequest, jsonData, jsonError, readJson } from "@/server/http/errors";
import { requireAuth } from "@/server/auth/session";
import { requireRole } from "@/server/auth/authorization";
import { assertSameOrigin } from "@/server/http/security";
import { dealBaccaratRound, dealBlackjackRound, requireIdempotencyKey } from "@/server/gameplay/service";
import { baccaratDealSchema, wagerSchema } from "@/server/gameplay/schemas";
import { gameplayModeForSlug } from "@/server/gameplay/constants";

export const runtime = "nodejs";
type RouteProps = { params: Promise<{ slug: string }> };

export async function POST(request: Request, { params }: RouteProps) {
  try {
    assertSameOrigin(request);
    const user = requireRole(await requireAuth(), ["PLAYER"]);
    const { slug } = await params;
    const mode = gameplayModeForSlug(slug);
    if (mode === "BLACKJACK") {
      const input = wagerSchema.parse(await readJson(request));
      return jsonData(await dealBlackjackRound(user.id, input.wager, requireIdempotencyKey(request.headers.get("idempotency-key")), slug));
    }
    if (mode === "BACCARAT") {
      const input = baccaratDealSchema.parse(await readJson(request));
      return jsonData(await dealBaccaratRound(user.id, input.wager, input.bet, requireIdempotencyKey(request.headers.get("idempotency-key")), slug));
    }
    throw badRequest("This game does not have a deal action.");
  } catch (error) {
    return jsonError(error);
  }
}
