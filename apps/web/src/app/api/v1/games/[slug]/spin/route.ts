import { badRequest, jsonData, jsonError, readJson } from "@/server/http/errors";
import { requireAuth } from "@/server/auth/session";
import { requireRole } from "@/server/auth/authorization";
import { assertSameOrigin } from "@/server/http/security";
import { requireIdempotencyKey, rollDiceRound, settleArcadeRound, spinRouletteRound, spinSlotsRound } from "@/server/gameplay/service";
import { diceRollSchema, rouletteSpinSchema, wagerSchema } from "@/server/gameplay/schemas";
import { gameplayModeForSlug } from "@/server/gameplay/constants";
import { enforceMutationRateLimit } from "@/server/http/rate-limit";

export const runtime = "nodejs";

type RouteProps = { params: Promise<{ slug: string }> };

export async function POST(request: Request, { params }: RouteProps) {
  try {
    await enforceMutationRateLimit(request, "gameplay");
    assertSameOrigin(request);
    const user = requireRole(await requireAuth(), ["PLAYER"]);
    const { slug } = await params;
    const mode = gameplayModeForSlug(slug);
    if (mode === "SLOTS") {
      const input = wagerSchema.parse(await readJson(request));
      return jsonData(await spinSlotsRound(user.id, input.wager, requireIdempotencyKey(request.headers.get("idempotency-key")), slug));
    }
    if (mode === "ROULETTE") {
      const input = rouletteSpinSchema.parse(await readJson(request));
      return jsonData(await spinRouletteRound(user.id, input.wager, input.bet, requireIdempotencyKey(request.headers.get("idempotency-key")), slug));
    }
    if (mode === "DICE") {
      const input = diceRollSchema.parse(await readJson(request));
      return jsonData(await rollDiceRound(user.id, input.wager, input.bet, requireIdempotencyKey(request.headers.get("idempotency-key")), slug));
    }
    if (mode === "ARCADE") {
      const input = wagerSchema.parse(await readJson(request));
      return jsonData(await settleArcadeRound(user.id, input.wager, requireIdempotencyKey(request.headers.get("idempotency-key")), slug));
    }
    throw badRequest("This game does not have a spin action.");
  } catch (error) {
    return jsonError(error);
  }
}
