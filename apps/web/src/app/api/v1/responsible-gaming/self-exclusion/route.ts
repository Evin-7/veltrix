import { jsonData, jsonError, readJson } from "@/server/http/errors";
import { requireAuth } from "@/server/auth/session";
import { requireRole } from "@/server/auth/authorization";
import { assertSameOrigin } from "@/server/http/security";
import { enforceMutationRateLimit } from "@/server/http/rate-limit";
import { activateSelfExclusion } from "@/server/responsible-gaming/service";
import { selfExclusionSchema } from "@/server/responsible-gaming/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await enforceMutationRateLimit(request, "responsible-gaming");
    assertSameOrigin(request);
    const user = requireRole(await requireAuth(), ["PLAYER"]);
    return jsonData(await activateSelfExclusion(user.id, selfExclusionSchema.parse(await readJson(request)).days));
  } catch (error) {
    return jsonError(error);
  }
}
