import "server-only";
import { getEnv } from "@/server/env";
import { AppError, forbidden } from "./errors";

function assertTrustedAdminHeaders(request: Request, expectedOrigin: string) {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const suppliedOrigins = [origin, referer].filter((value): value is string => Boolean(value)).map((value) => {
    try {
      return new URL(value).origin;
    } catch {
      return null;
    }
  });

  if (!suppliedOrigins.length || suppliedOrigins.some((value) => value !== expectedOrigin)) {
    throw forbidden("Request origin is not allowed.");
  }
}

export function assertAdminOrigin(request: Request) {
  try {
    assertTrustedAdminHeaders(request, new URL(getEnv().ADMIN_APP_URL).origin);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw forbidden("Request origin is not allowed.");
  }
}

export function adminCorsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  const headers = new Headers({
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    Vary: "Origin",
  });

  if (origin) {
    try {
      if (new URL(origin).origin === new URL(getEnv().ADMIN_APP_URL).origin) headers.set("Access-Control-Allow-Origin", origin);
    } catch {
      // The request will fail the explicit origin check in the route.
    }
  }
  return headers;
}

export function withAdminCors(response: Response, request: Request) {
  for (const [key, value] of adminCorsHeaders(request)) response.headers.set(key, value);
  return response;
}

export function adminOptions(request: Request) {
  assertAdminOrigin(request);
  return new Response(null, { status: 204, headers: adminCorsHeaders(request) });
}
