import "server-only";
import { getEnv } from "@/server/env";
import { AppError } from "./errors";

function assertTrustedBrowserHeaders(request: Request, expectedOrigin: string) {
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
    throw new AppError(403, "ORIGIN_NOT_ALLOWED", "Request origin is not allowed.");
  }
}

export function assertSameOrigin(request: Request) {
  try {
    assertTrustedBrowserHeaders(request, new URL(getEnv().APP_URL).origin);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(403, "ORIGIN_NOT_ALLOWED", "Request origin is not allowed.");
  }
}
