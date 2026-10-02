import { NextResponse } from "next/server";
import { createGoogleAuthorizationUrl, createGoogleOAuthState, getGoogleOAuthConfig, GOOGLE_OAUTH_COOKIE, googleOAuthCookieOptions } from "@/server/auth/google";
import { sanitizeNextPath } from "@/server/auth/redirect";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const config = getGoogleOAuthConfig();
  const next = sanitizeNextPath(new URL(request.url).searchParams.get("next"));
  if (!config) {
    const target = new URL("/login", request.url);
    target.searchParams.set("error", "google_config");
    if (next !== "/") target.searchParams.set("next", next);
    return NextResponse.redirect(target);
  }

  const { state, cookieValue } = createGoogleOAuthState(next);
  const response = NextResponse.redirect(createGoogleAuthorizationUrl(config, state));
  response.cookies.set(GOOGLE_OAUTH_COOKIE, cookieValue, googleOAuthCookieOptions());
  return response;
}
