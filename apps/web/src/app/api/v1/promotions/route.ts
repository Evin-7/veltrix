import { jsonData, jsonError } from "@/server/http/errors";
import { requireAuth } from "@/server/auth/session";
import { requireRole } from "@/server/auth/authorization";
import { listEligiblePromotions } from "@/server/promotions/service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = requireRole(await requireAuth(), ["PLAYER"]);
    return jsonData(await listEligiblePromotions(user.id));
  } catch (error) {
    return jsonError(error);
  }
}
