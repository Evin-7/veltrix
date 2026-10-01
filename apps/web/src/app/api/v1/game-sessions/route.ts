import { jsonDataWithMeta, jsonError } from "@/server/http/errors";
import { requireAuth } from "@/server/auth/session";
import { requireRole } from "@/server/auth/authorization";
import { listGameSessions } from "@/server/gameplay/service";
import { sessionQuerySchema } from "@/server/gameplay/schemas";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = requireRole(await requireAuth(), ["PLAYER"]);
    const input = sessionQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const result = await listGameSessions(user.id, input.page, input.pageSize);
    return jsonDataWithMeta(result.sessions, result.meta);
  } catch (error) {
    return jsonError(error);
  }
}
