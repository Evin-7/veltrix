import { requireAuth } from "@/server/auth/session";
import { requireRole } from "@/server/auth/authorization";
import { listRecentRouletteRounds } from "@/server/gameplay/service";
import { gameplayModeForSlug } from "@/server/gameplay/constants";
import { badRequest, jsonData, jsonError } from "@/server/http/errors";
import { gameIdentifierSchema } from "@/server/users/schemas";

export const runtime = "nodejs";

type RouteProps = { params: Promise<{ slug: string }> };

export async function GET(_: Request, { params }: RouteProps) {
  try {
    const user = requireRole(await requireAuth(), ["PLAYER"]);
    const { slug: rawSlug } = await params;
    const slug = gameIdentifierSchema.parse(rawSlug);
    if (gameplayModeForSlug(slug) !== "ROULETTE") {
      throw badRequest("Recent round history is only available for roulette.");
    }

    const rounds = await listRecentRouletteRounds(user.id, slug);
    return jsonData(rounds, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return jsonError(error);
  }
}
