import "server-only";
import { getEnv } from "@/server/env";
import { AppError } from "./errors";

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;

  try {
    if (new URL(origin).origin !== new URL(getEnv().APP_URL).origin) {
      throw new AppError(403, "ORIGIN_NOT_ALLOWED", "Request origin is not allowed.");
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(403, "ORIGIN_NOT_ALLOWED", "Request origin is not allowed.");
  }
}
