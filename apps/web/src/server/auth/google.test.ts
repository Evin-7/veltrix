import { beforeAll, describe, expect, it } from "vitest";
import { OAuth2Client } from "google-auth-library";
import { createGoogleAuthorizationUrl, createGoogleOAuthState, readGoogleOAuthState, safeCompare } from "./google";

beforeAll(() => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/veltrix";
  process.env.AUTH_SECRET = "google-oauth-test-secret-with-more-than-32-characters";
  process.env.APP_URL = "http://localhost:3000";
});

describe("Google OAuth state", () => {
  it("round-trips signed state and keeps the internal return path", () => {
    const created = createGoogleOAuthState("/casino/signal-blackjack/play");
    const parsed = readGoogleOAuthState(created.cookieValue);

    expect(parsed).toMatchObject({ state: created.state.state, nonce: created.state.nonce, codeVerifier: created.state.codeVerifier, next: "/casino/signal-blackjack/play" });
  });

  it("rejects tampered state cookies and callback state values", () => {
    const created = createGoogleOAuthState("/");
    const [encoded, signature] = created.cookieValue.split(".");

    expect(readGoogleOAuthState(`${encoded}x.${signature}`)).toBeNull();
    expect(safeCompare(created.state.state, `${created.state.state}x`)).toBe(false);
    expect(safeCompare(created.state.state, created.state.state)).toBe(true);
  });

  it("sends the OIDC nonce with the authorization request", () => {
    const created = createGoogleOAuthState("/");
    const client = new OAuth2Client("client-id", "client-secret", "http://localhost:3000/api/v1/auth/google/callback");
    const authorizationUrl = createGoogleAuthorizationUrl({
      clientId: "client-id",
      clientSecret: "client-secret",
      redirectUri: "http://localhost:3000/api/v1/auth/google/callback",
      client,
    }, created.state);

    expect(new URL(authorizationUrl).searchParams.get("nonce")).toBe(created.state.nonce);
  });
});
