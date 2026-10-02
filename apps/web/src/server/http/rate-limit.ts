import "server-only";
import { createHash } from "node:crypto";
import { getEnv } from "@/server/env";
import { logger } from "@/server/observability/logger";
import { AppError } from "./errors";

type RateLimitEntry = { count: number; resetAt: number };
type AuthAction = "login" | "register" | "oauth";
type MutationAction = "daily-reward" | "profile" | "favourite" | "recent" | "promotion-claim" | "responsible-gaming" | "notifications" | "gameplay";
type AdminAction = "read" | "mutation";

const entries = new Map<string, RateLimitEntry>();

function requestKey(request: Request, action: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip") || "unknown";
  const fingerprint = createHash("sha256").update(address).digest("hex").slice(0, 32);
  return `veltrix:rate:${action}:${fingerprint}`;
}

function enforceLocalRateLimit(key: string, maxRequests: number, message: string) {
  const now = Date.now();
  if (entries.size > 1000) {
    for (const [entryKey, entry] of entries) {
      if (entry.resetAt <= now) entries.delete(entryKey);
    }
  }
  const current = entries.get(key);
  const windowMs = 60_000;
  if (!current || current.resetAt <= now) {
    entries.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (current.count >= maxRequests) {
    throw new AppError(429, "RATE_LIMITED", message, undefined, Math.ceil((current.resetAt - now) / 1000));
  }
  current.count += 1;
}

async function enforceRateLimit(request: Request, action: string, maxRequests: number, message: string) {
  const env = getEnv();
  const key = requestKey(request, action);
  const redisUrl = env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL;
  const redisToken = env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN;
  if (!redisUrl && !redisToken) {
    if (env.NODE_ENV === "production") {
      throw new AppError(503, "RATE_LIMIT_UNAVAILABLE", "Rate limiting is not configured. Please try again shortly.", undefined, 5);
    }
    enforceLocalRateLimit(key, maxRequests, message);
    return;
  }

  try {
    if (!redisUrl || !redisToken) throw new Error("Upstash REST configuration is incomplete.");
    const endpoint = redisUrl.replace(/\/$/, "");
    const response = await fetch(`${endpoint}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${redisToken}`, "Content-Type": "application/json" },
      body: JSON.stringify([["INCR", key], ["EXPIRE", key, "60"]]),
      signal: AbortSignal.timeout(750),
    });
    if (!response.ok) throw new Error(`Upstash pipeline returned ${response.status}`);
    const payload = (await response.json()) as Array<{ result?: number }>;
    const count = Number(payload[0]?.result);
    if (!Number.isFinite(count)) throw new Error("Upstash returned an invalid counter.");
    if (count > maxRequests) throw new AppError(429, "RATE_LIMITED", message, undefined, 60);
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error("rate_limit.store_unavailable", { action });
    if (env.NODE_ENV !== "production") {
      enforceLocalRateLimit(key, maxRequests, message);
      return;
    }
    throw new AppError(503, "RATE_LIMIT_UNAVAILABLE", "Rate limiting is temporarily unavailable. Please try again shortly.", undefined, 5);
  }
}

export function enforceAuthRateLimit(request: Request, action: AuthAction) {
  const limits = { login: 10, register: 5, oauth: 20 } as const;
  return enforceRateLimit(request, `auth:${action}`, limits[action], "Too many attempts. Please try again shortly.");
}

export function enforceMutationRateLimit(request: Request, action: MutationAction) {
  const limits = { "daily-reward": 6, profile: 12, favourite: 60, recent: 30, "promotion-claim": 30, "responsible-gaming": 20, notifications: 60, gameplay: 120 } as const;
  return enforceRateLimit(request, `mutation:${action}`, limits[action], "Too many requests. Please try again shortly.");
}

export function enforceAdminRateLimit(request: Request, action: AdminAction) {
  return enforceRateLimit(request, `admin:${action}`, action === "read" ? 120 : 30, "Too many admin requests. Please try again shortly.");
}
