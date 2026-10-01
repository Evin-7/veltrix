import { jsonDataWithMeta, jsonError } from "@/server/http/errors";
import { gameQuerySchema } from "@/server/games/schemas";
import { listPublicGames } from "@/server/games/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const query = Object.fromEntries(new URL(request.url).searchParams.entries());
    const input = gameQuerySchema.parse(query);
    const result = await listPublicGames(input);
    return jsonDataWithMeta(result.games, result.meta);
  } catch (error) {
    return jsonError(error);
  }
}
