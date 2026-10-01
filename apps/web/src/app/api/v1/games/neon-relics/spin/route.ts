import { jsonData, jsonError, readJson } from "@/server/http/errors";
import { requireAuth } from "@/server/auth/session";
import { requireRole } from "@/server/auth/authorization";
import { assertSameOrigin } from "@/server/http/security";
import { requireIdempotencyKey, spinSlotsRound } from "@/server/gameplay/service";
import { wagerSchema } from "@/server/gameplay/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = requireRole(await requireAuth(), ["PLAYER"]);
    const input = wagerSchema.parse(await readJson(request));
    return jsonData(await spinSlotsRound(user.id, input.wager, requireIdempotencyKey(request.headers.get("idempotency-key"))));
  } catch (error) {
    return jsonError(error);
  }
}
