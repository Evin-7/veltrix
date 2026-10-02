import { jsonDataWithMeta, jsonError } from "@/server/http/errors";
import { gameQuerySchema } from "@/server/games/schemas";
import { listPublicGames } from "@/server/games/service";

export const runtime = "nodejs";
const publicCache = { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" } };

export async function GET(request: Request) {
  try {
    const query = Object.fromEntries(new URL(request.url).searchParams.entries());
    const input = gameQuerySchema.parse(query);
    const result = await listPublicGames(input);
    return jsonDataWithMeta(result.games, result.meta, publicCache);
  } catch (error) {
    return jsonError(error);
  }
}
