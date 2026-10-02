import { jsonData, jsonError, notFound } from "@/server/http/errors";
import { getPublicGameBySlug } from "@/server/games/service";

export const runtime = "nodejs";
const publicCache = { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" } };

type GameRouteProps = { params: Promise<{ slug: string }> };

export async function GET(_: Request, { params }: GameRouteProps) {
  try {
    const { slug } = await params;
    const game = await getPublicGameBySlug(slug);
    if (!game) throw notFound("Game not found.");
    return jsonData(game, publicCache);
  } catch (error) {
    return jsonError(error);
  }
}
