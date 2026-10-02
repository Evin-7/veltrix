import { jsonData, jsonError } from "@/server/http/errors";
import { requireAuth } from "@/server/auth/session";
import { requireRole } from "@/server/auth/authorization";
import { getResponsibleGamingStatus } from "@/server/responsible-gaming/service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = requireRole(await requireAuth(), ["PLAYER"]);
    return jsonData(await getResponsibleGamingStatus(user.id));
  } catch (error) {
    return jsonError(error);
  }
}
