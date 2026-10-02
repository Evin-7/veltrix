import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { logger } from "../observability/logger";

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown> | undefined;
  readonly retryAfterSeconds: number | undefined;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>, retryAfterSeconds?: number) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export const unauthorized = (message = "Authentication is required.") => new AppError(401, "UNAUTHORIZED", message);
export const forbidden = (message = "You do not have permission to perform this action.") => new AppError(403, "FORBIDDEN", message);
export const badRequest = (message = "The request is invalid.") => new AppError(400, "BAD_REQUEST", message);
export const notFound = (message = "The requested resource was not found.") => new AppError(404, "NOT_FOUND", message);
export const conflict = (message = "The request conflicts with existing data.") => new AppError(409, "CONFLICT", message);
export const insufficientBalance = (message = "The wallet does not have enough VC for this operation.") => new AppError(409, "INSUFFICIENT_BALANCE", message);
export const invalidWager = (message = "Choose a valid wager and try again.") => new AppError(400, "INVALID_WAGER", message);
export const roundAlreadySettled = (message = "This round is already settled.") => new AppError(409, "ROUND_ALREADY_SETTLED", message);
export const selfExcluded = (message = "Gameplay is unavailable while self-exclusion is active.") => new AppError(403, "SELF_EXCLUDED", message);
export const coolOffActive = (message = "Gameplay is unavailable during your cool-off period.") => new AppError(403, "COOL_OFF_ACTIVE", message);
export const dailyLimitReached = (message = "Your daily play limit has been reached.") => new AppError(403, "DAILY_LIMIT_REACHED", message);
export const maxWagerExceeded = (message = "That wager is above your current maximum.") => new AppError(400, "MAX_WAGER_EXCEEDED", message);

export function jsonData<T>(data: T, init?: ResponseInit) {
  return Response.json({ data }, init);
}

export function jsonDataWithMeta<T>(data: T, meta: Record<string, unknown>, init?: ResponseInit) {
  return Response.json({ data, meta }, init);
}

function withRequestId(response: Response, requestId: string) {
  response.headers.set("X-Request-ID", requestId);
  return response;
}

export function jsonError(error: unknown, requestId = randomUUID()) {
  if (error instanceof z.ZodError) {
    return withRequestId(Response.json({ error: { code: "VALIDATION_ERROR", message: "Invalid request.", details: error.flatten().fieldErrors } }, { status: 400 }), requestId);
  }

  if (error instanceof AppError) {
    const response = Response.json({ error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) } }, { status: error.status });
    if (error.retryAfterSeconds) response.headers.set("Retry-After", String(error.retryAfterSeconds));
    return withRequestId(response, requestId);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return withRequestId(Response.json({ error: { code: "CONFLICT", message: "A record with those details already exists." } }, { status: 409 }), requestId);
  }

  logger.error("api.request_failed", { requestId, status: 500, code: "INTERNAL_ERROR", prismaCode: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined });
  return withRequestId(Response.json({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } }, { status: 500 }), requestId);
}

const MAX_JSON_BODY_BYTES = 64 * 1024;

async function readBodyWithinLimit(request: Request) {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length) || length < 0) throw new AppError(400, "INVALID_CONTENT_LENGTH", "Request content length is invalid.");
    if (length > MAX_JSON_BODY_BYTES) throw new AppError(413, "REQUEST_TOO_LARGE", "Request body is too large.");
  }

  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let body = "";
  let bytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_JSON_BODY_BYTES) {
        await reader.cancel();
        throw new AppError(413, "REQUEST_TOO_LARGE", "Request body is too large.");
      }
      body += decoder.decode(value, { stream: true });
    }
    return body + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

export async function readJson(request: Request) {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json" && !contentType?.endsWith("+json")) {
    throw new AppError(415, "UNSUPPORTED_MEDIA_TYPE", "Request content type must be JSON.");
  }

  const body = await readBodyWithinLimit(request);
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new AppError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
}
