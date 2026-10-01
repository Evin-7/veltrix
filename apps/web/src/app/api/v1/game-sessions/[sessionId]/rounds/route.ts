import { jsonDataWithMeta, jsonError } from "@/server/http/errors";
import { requireAuth } from "@/server/auth/session";
import { requireRole } from "@/server/auth/authorization";
import { listGameSessionRounds } from "@/server/gameplay/service";
import { sessionQuerySchema } from "@/server/gameplay/schemas";
import { uuidSchema } from "@/server/users/schemas";

export const runtime = "nodejs";

type RouteProps = { params: Promise<{ sessionId: string }> };

export async function GET(request: Request, { params }: RouteProps) {
  try {
    const user = requireRole(await requireAuth(), ["PLAYER"]);
    const { sessionId } = await params;
    const input = sessionQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const result = await listGameSessionRounds(user.id, uuidSchema.parse(sessionId), input.page, input.pageSize);
    return jsonDataWithMeta(result.rounds, result.meta);
  } catch (error) {
    return jsonError(error);
  }
}
