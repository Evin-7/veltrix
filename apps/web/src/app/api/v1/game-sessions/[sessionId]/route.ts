import { jsonData, jsonError } from "@/server/http/errors";
import { requireAuth } from "@/server/auth/session";
import { requireRole } from "@/server/auth/authorization";
import { getGameSession } from "@/server/gameplay/service";
import { uuidSchema } from "@/server/users/schemas";

export const runtime = "nodejs";

type RouteProps = { params: Promise<{ sessionId: string }> };

export async function GET(_: Request, { params }: RouteProps) {
  try {
    const user = requireRole(await requireAuth(), ["PLAYER"]);
    const { sessionId } = await params;
    return jsonData(await getGameSession(user.id, uuidSchema.parse(sessionId)));
  } catch (error) {
    return jsonError(error);
  }
}
