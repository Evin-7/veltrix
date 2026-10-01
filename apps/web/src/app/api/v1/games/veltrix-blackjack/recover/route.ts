import { jsonData, jsonError } from "@/server/http/errors";
import { requireAuth } from "@/server/auth/session";
import { requireRole } from "@/server/auth/authorization";
import { recoverBlackjack } from "@/server/gameplay/service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = requireRole(await requireAuth(), ["PLAYER"]);
    return jsonData(await recoverBlackjack(user.id));
  } catch (error) {
    return jsonError(error);
  }
}
