import { jsonData, jsonError } from "@/server/http/errors";
import { requireAuth } from "@/server/auth/session";
import { requireRole } from "@/server/auth/authorization";
import { enforceMutationRateLimit } from "@/server/http/rate-limit";
import { assertSameOrigin } from "@/server/http/security";
import { gameIdentifierSchema } from "@/server/users/schemas";
import { setGameFavourite } from "@/server/users/service";

export const runtime = "nodejs";

type FavouriteRouteProps = { params: Promise<{ slug: string }> };

async function getPlayer(request: Request) {
  await enforceMutationRateLimit(request, "favourite");
  assertSameOrigin(request);
  return requireRole(await requireAuth(), ["PLAYER"]);
}

export async function POST(request: Request, { params }: FavouriteRouteProps) {
  try {
    const user = await getPlayer(request);
    const { slug } = await params;
    return jsonData(await setGameFavourite(user.id, gameIdentifierSchema.parse(slug), true));
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, { params }: FavouriteRouteProps) {
  try {
    const user = await getPlayer(request);
    const { slug } = await params;
    return jsonData(await setGameFavourite(user.id, gameIdentifierSchema.parse(slug), false));
  } catch (error) {
    return jsonError(error);
  }
}
