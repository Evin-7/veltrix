import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { CodeChallengeMethod, OAuth2Client } from "google-auth-library";
import { getEnv } from "@/server/env";
import { sanitizeNextPath } from "./redirect";

export const GOOGLE_PROVIDER = "google";
export const GOOGLE_OAUTH_COOKIE = "veltrix_google_oauth";
export const GOOGLE_OAUTH_MAX_AGE = 10 * 60;
export const GOOGLE_CALLBACK_PATH = "/api/v1/auth/google/callback";

type GoogleOAuthState = {
  state: string;
  nonce: string;
  codeVerifier: string;
  next: string;
  expiresAt: number;
};

export function getGoogleOAuthConfig() {
  const environment = getEnv();
  if (!environment.GOOGLE_CLIENT_ID || !environment.GOOGLE_CLIENT_SECRET) return null;

  const redirectUri = new URL(GOOGLE_CALLBACK_PATH, environment.APP_URL).toString();
  return {
    clientId: environment.GOOGLE_CLIENT_ID,
    clientSecret: environment.GOOGLE_CLIENT_SECRET,
    redirectUri,
    client: new OAuth2Client(environment.GOOGLE_CLIENT_ID, environment.GOOGLE_CLIENT_SECRET, redirectUri),
  };
}

function sign(value: string) {
  return createHmac("sha256", getEnv().AUTH_SECRET).update(value).digest("base64url");
}

export function createGoogleOAuthState(next: string) {
  const state: GoogleOAuthState = {
    state: randomBytes(32).toString("base64url"),
    nonce: randomBytes(32).toString("base64url"),
    codeVerifier: randomBytes(64).toString("base64url"),
    next: sanitizeNextPath(next),
    expiresAt: Date.now() + GOOGLE_OAUTH_MAX_AGE * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(state)).toString("base64url");
  return { state, cookieValue: `${encoded}.${sign(encoded)}` };
}

export function readGoogleOAuthState(cookieValue: string | undefined) {
  if (!cookieValue) return null;
  const [encoded, signature] = cookieValue.split(".");
  if (!encoded || !signature || !safeCompare(signature, sign(encoded))) return null;

  try {
    const state = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as GoogleOAuthState;
    if (!state.state || !state.nonce || !state.codeVerifier || state.expiresAt <= Date.now()) return null;
    return { ...state, next: sanitizeNextPath(state.next) };
  } catch {
    return null;
  }
}

export function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function createGoogleAuthorizationUrl(config: NonNullable<ReturnType<typeof getGoogleOAuthConfig>>, state: GoogleOAuthState) {
  const codeChallenge = createHash("sha256").update(state.codeVerifier).digest("base64url");
  const authorizationUrl = new URL(config.client.generateAuthUrl({
    prompt: "select_account",
    scope: ["openid", "email", "profile"],
    state: state.state,
    code_challenge: codeChallenge,
    code_challenge_method: CodeChallengeMethod.S256,
  }));
  authorizationUrl.searchParams.set("nonce", state.nonce);
  return authorizationUrl.toString();
}

export function googleOAuthCookieOptions() {
  return {
    httpOnly: true,
    secure: getEnv().NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: GOOGLE_OAUTH_MAX_AGE,
  };
}
