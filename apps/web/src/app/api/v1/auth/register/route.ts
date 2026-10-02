import { jsonData, jsonError, readJson } from "@/server/http/errors";
import { enforceAuthRateLimit } from "@/server/http/rate-limit";
import { assertSameOrigin } from "@/server/http/security";
import { createSession, setSessionCookie } from "@/server/auth/session";
import { registerSchema } from "@/server/auth/schemas";
import { registerUser } from "@/server/auth/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await enforceAuthRateLimit(request, "register");
    assertSameOrigin(request);
    const input = registerSchema.parse(await readJson(request));
    const user = await registerUser(input);
    const session = await createSession(user.id);
    await setSessionCookie(session.token, session.expiresAt);
    return jsonData(user, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
