import { jsonData, jsonError } from "@/server/http/errors";
import { requireAuth } from "@/server/auth/session";
import { requireRole } from "@/server/auth/authorization";
import { enforceMutationRateLimit } from "@/server/http/rate-limit";
import { assertSameOrigin } from "@/server/http/security";
import { gameIdentifierSchema } from "@/server/users/schemas";
import { markRecentlyPlayed } from "@/server/users/service";

export const runtime = "nodejs";

type RecentRouteProps = { params: Promise<{ slug: string }> };

export async function POST(request: Request, { params }: RecentRouteProps) {
  try {
    enforceMutationRateLimit(request, "recent");
    assertSameOrigin(request);
    const user = requireRole(await requireAuth(), ["PLAYER"]);
    const { slug } = await params;
    return jsonData(await markRecentlyPlayed(user.id, gameIdentifierSchema.parse(slug)));
  } catch (error) {
    return jsonError(error);
  }
}
