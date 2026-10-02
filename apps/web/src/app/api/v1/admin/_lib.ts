import { requireRole } from "@/server/auth/authorization";
import { requireAuth } from "@/server/auth/session";
import { assertAdminOrigin, adminOptions, withAdminCors } from "@/server/http/admin-cors";
import { jsonError } from "@/server/http/errors";
import { enforceAdminRateLimit } from "@/server/http/rate-limit";
import type { SafeUser } from "@/types/auth";

export { adminOptions };

export async function adminHandler(request: Request, roles: SafeUser["role"][], handler: (user: SafeUser) => Promise<Response>) {
  try {
    assertAdminOrigin(request);
    await enforceAdminRateLimit(request, request.method === "GET" ? "read" : "mutation");
    const user = requireRole(await requireAuth(), roles);
    return withAdminCors(await handler(user), request);
  } catch (error) {
    return withAdminCors(jsonError(error), request);
  }
}

export async function adminPublicHandler(request: Request, handler: () => Promise<Response>) {
  try {
    assertAdminOrigin(request);
    await enforceAdminRateLimit(request, "mutation");
    return withAdminCors(await handler(), request);
  } catch (error) {
    return withAdminCors(jsonError(error), request);
  }
}
