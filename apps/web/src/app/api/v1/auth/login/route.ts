import { jsonData, jsonError, readJson, unauthorized } from "@/server/http/errors";
import { enforceAuthRateLimit } from "@/server/http/rate-limit";
import { authenticateUser } from "@/server/auth/service";
import { loginSchema } from "@/server/auth/schemas";
import { createSession, revokeSession, setSessionCookie, SESSION_COOKIE_NAME } from "@/server/auth/session";
import { cookies } from "next/headers";
import { assertSameOrigin } from "@/server/http/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await enforceAuthRateLimit(request, "login");
    assertSameOrigin(request);
    const input = loginSchema.parse(await readJson(request));
    let user;

    try {
      user = await authenticateUser(input);
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_CREDENTIALS") throw unauthorized("Invalid email or password.");
      throw error;
    }

    const existingToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
    await revokeSession(existingToken);
    const session = await createSession(user.id);
    await setSessionCookie(session.token, session.expiresAt);
    return jsonData(user);
  } catch (error) {
    return jsonError(error);
  }
}
