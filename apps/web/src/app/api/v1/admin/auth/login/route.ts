import { cookies } from "next/headers";
import { authenticateUser } from "@/server/auth/service";
import { loginSchema } from "@/server/auth/schemas";
import { createSession, revokeSession, setSessionCookie, SESSION_COOKIE_NAME } from "@/server/auth/session";
import { enforceAuthRateLimit } from "@/server/http/rate-limit";
import { jsonData, readJson, unauthorized, forbidden } from "@/server/http/errors";
import { adminOptions, adminPublicHandler } from "../../_lib";

export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return adminOptions(request);
}

export async function POST(request: Request) {
  return adminPublicHandler(request, async () => {
    await enforceAuthRateLimit(request, "login");
    const input = loginSchema.parse(await readJson(request));
    let user;
    try {
      user = await authenticateUser(input);
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_CREDENTIALS") throw unauthorized("Invalid email or password.");
      throw error;
    }
    if (user.role === "PLAYER") throw forbidden("Admin access is required.");
    const existingToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
    await revokeSession(existingToken);
    const session = await createSession(user.id);
    await setSessionCookie(session.token, session.expiresAt);
    return jsonData(user);
  });
}
