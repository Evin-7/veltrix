import { jsonData, jsonError, readJson } from "@/server/http/errors";
import { requireAuth } from "@/server/auth/session";
import { requireRole } from "@/server/auth/authorization";
import { assertSameOrigin } from "@/server/http/security";
import { enforceMutationRateLimit } from "@/server/http/rate-limit";
import { enterCoolOff } from "@/server/responsible-gaming/service";
import { coolOffSchema } from "@/server/responsible-gaming/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await enforceMutationRateLimit(request, "responsible-gaming");
    assertSameOrigin(request);
    const user = requireRole(await requireAuth(), ["PLAYER"]);
    return jsonData(await enterCoolOff(user.id, coolOffSchema.parse(await readJson(request)).hours));
  } catch (error) {
    return jsonError(error);
  }
}
