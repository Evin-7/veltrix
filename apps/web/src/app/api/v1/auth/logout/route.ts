import { cookies } from "next/headers";
import { jsonData, jsonError } from "@/server/http/errors";
import { clearSessionCookie, revokeSession, SESSION_COOKIE_NAME } from "@/server/auth/session";
import { assertSameOrigin } from "@/server/http/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
    await revokeSession(token);
    await clearSessionCookie();
    return jsonData(null);
  } catch (error) {
    return jsonError(error);
  }
}
