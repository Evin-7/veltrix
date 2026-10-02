import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateGoogleUser } from "@/server/auth/service";
import { createSession, revokeSession, SESSION_COOKIE_NAME, setSessionCookie } from "@/server/auth/session";
import { getGoogleOAuthConfig, GOOGLE_OAUTH_COOKIE, googleOAuthCookieOptions, readGoogleOAuthState, safeCompare } from "@/server/auth/google";
import { enforceAuthRateLimit } from "@/server/http/rate-limit";

export const runtime = "nodejs";

function loginRedirect(request: Request, error: string, next = "/") {
  const target = new URL("/login", request.url);
  target.searchParams.set("error", error);
  if (next !== "/") target.searchParams.set("next", next);
  const response = NextResponse.redirect(target);
  response.cookies.set(GOOGLE_OAUTH_COOKIE, "", { ...googleOAuthCookieOptions(), maxAge: 0 });
  return response;
}

export async function GET(request: Request) {
  try {
    await enforceAuthRateLimit(request, "oauth");
  } catch {
    return loginRedirect(request, "rate_limited");
  }

  const requestUrl = new URL(request.url);
  const oauthState = readGoogleOAuthState((await cookies()).get(GOOGLE_OAUTH_COOKIE)?.value);
  if (!oauthState || !safeCompare(requestUrl.searchParams.get("state") ?? "", oauthState.state)) {
    return loginRedirect(request, "google_state");
  }

  if (requestUrl.searchParams.get("error")) {
    return loginRedirect(request, "google_denied", oauthState.next);
  }

  const code = requestUrl.searchParams.get("code");
  if (!code) return loginRedirect(request, "google_code", oauthState.next);

  const config = getGoogleOAuthConfig();
  if (!config) return loginRedirect(request, "google_config", oauthState.next);

  try {
    const { tokens } = await config.client.getToken({ code, codeVerifier: oauthState.codeVerifier });
    if (!tokens.id_token) return loginRedirect(request, "google_identity", oauthState.next);

    const ticket = await config.client.verifyIdToken({ idToken: tokens.id_token, audience: config.clientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.email_verified !== true || !payload.nonce || !safeCompare(payload.nonce, oauthState.nonce)) {
      return loginRedirect(request, "google_identity", oauthState.next);
    }

    const user = await authenticateGoogleUser({
      providerAccountId: payload.sub,
      email: payload.email.toLowerCase(),
      displayName: payload.name ?? null,
      avatarUrl: payload.picture ?? null,
    });

    const existingToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
    await revokeSession(existingToken);
    const session = await createSession(user.id);
    await setSessionCookie(session.token, session.expiresAt);

    const target = new URL(oauthState.next, request.url);
    const response = NextResponse.redirect(target);
    response.cookies.set(GOOGLE_OAUTH_COOKIE, "", { ...googleOAuthCookieOptions(), maxAge: 0 });
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "GOOGLE_ACCOUNT_DISABLED") return loginRedirect(request, "google_disabled", oauthState.next);
    if (error instanceof Error && error.message === "GOOGLE_ACCOUNT_LINK_NOT_ALLOWED") return loginRedirect(request, "google_link", oauthState.next);
    return loginRedirect(request, "google_error", oauthState.next);
  }
}
