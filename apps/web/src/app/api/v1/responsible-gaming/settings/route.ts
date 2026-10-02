import { jsonData, jsonError, readJson } from "@/server/http/errors";
import { requireAuth } from "@/server/auth/session";
import { requireRole } from "@/server/auth/authorization";
import { assertSameOrigin } from "@/server/http/security";
import { enforceMutationRateLimit } from "@/server/http/rate-limit";
import { getResponsibleGamingSettings, updateResponsibleGamingSettings } from "@/server/responsible-gaming/service";
import { responsibleSettingsSchema } from "@/server/responsible-gaming/schemas";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = requireRole(await requireAuth(), ["PLAYER"]);
    return jsonData(await getResponsibleGamingSettings(user.id));
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await enforceMutationRateLimit(request, "responsible-gaming");
    assertSameOrigin(request);
    const user = requireRole(await requireAuth(), ["PLAYER"]);
    return jsonData(await updateResponsibleGamingSettings(user.id, responsibleSettingsSchema.parse(await readJson(request))));
  } catch (error) {
    return jsonError(error);
  }
}
