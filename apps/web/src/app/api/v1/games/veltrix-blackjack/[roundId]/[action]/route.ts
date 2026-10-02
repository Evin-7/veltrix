import { z } from "zod";
import { jsonData, jsonError } from "@/server/http/errors";
import { requireAuth } from "@/server/auth/session";
import { requireRole } from "@/server/auth/authorization";
import { assertSameOrigin } from "@/server/http/security";
import { blackjackAction, requireIdempotencyKey } from "@/server/gameplay/service";
import { uuidSchema } from "@/server/users/schemas";
import { enforceMutationRateLimit } from "@/server/http/rate-limit";

export const runtime = "nodejs";

type RouteProps = { params: Promise<{ roundId: string; action: string }> };

export async function POST(request: Request, { params }: RouteProps) {
  try {
    await enforceMutationRateLimit(request, "gameplay");
    assertSameOrigin(request);
    const user = requireRole(await requireAuth(), ["PLAYER"]);
    const { roundId, action } = await params;
    const parsedRoundId = uuidSchema.parse(roundId);
    const parsedAction = z.enum(["hit", "stand", "double"]).parse(action);
    return jsonData(await blackjackAction(user.id, parsedRoundId, parsedAction, requireIdempotencyKey(request.headers.get("idempotency-key"))));
  } catch (error) {
    return jsonError(error);
  }
}
