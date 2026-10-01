import "server-only";
import { AppError } from "./errors";

type RateLimitEntry = { count: number; resetAt: number };
const entries = new Map<string, RateLimitEntry>();

function requestKey(request: Request, action: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip") || "unknown";
  return `${action}:${address}`;
}

export function enforceAuthRateLimit(request: Request, action: "login" | "register") {
  const now = Date.now();
  if (entries.size > 1000) {
    for (const [entryKey, entry] of entries) {
      if (entry.resetAt <= now) entries.delete(entryKey);
    }
  }
  const key = requestKey(request, action);
  const current = entries.get(key);
  const windowMs = 60_000;
  const maxRequests = action === "login" ? 10 : 5;

  if (!current || current.resetAt <= now) {
    entries.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (current.count >= maxRequests) {
    throw new AppError(429, "RATE_LIMITED", "Too many attempts. Please try again shortly.", undefined, Math.ceil((current.resetAt - now) / 1000));
  }

  current.count += 1;
}

export function enforceMutationRateLimit(request: Request, action: "daily-reward" | "profile" | "favourite" | "recent") {
  const now = Date.now();
  if (entries.size > 1000) {
    for (const [entryKey, entry] of entries) {
      if (entry.resetAt <= now) entries.delete(entryKey);
    }
  }

  const limits = { "daily-reward": 6, profile: 12, favourite: 60, recent: 30 } as const;
  const key = requestKey(request, action);
  const current = entries.get(key);
  const windowMs = 60_000;
  const maxRequests = limits[action];

  if (!current || current.resetAt <= now) {
    entries.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (current.count >= maxRequests) {
    throw new AppError(429, "RATE_LIMITED", "Too many requests. Please try again shortly.", undefined, Math.ceil((current.resetAt - now) / 1000));
  }
  current.count += 1;
}
