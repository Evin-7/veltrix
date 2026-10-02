import { badRequest, jsonData, jsonError } from "@/server/http/errors";
import { requireAuth } from "@/server/auth/session";
import { requireRole } from "@/server/auth/authorization";
import { gameplayModeForSlug } from "@/server/gameplay/constants";
import { recoverBlackjack } from "@/server/gameplay/service";

export const runtime = "nodejs";
type RouteProps = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: RouteProps) {
  try {
    const user = requireRole(await requireAuth(), ["PLAYER"]);
    const { slug } = await params;
    if (gameplayModeForSlug(slug) !== "BLACKJACK") throw badRequest("This game does not have a recoverable hand.");
    return jsonData(await recoverBlackjack(user.id, slug));
  } catch (error) {
    return jsonError(error);
  }
}
