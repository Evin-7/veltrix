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

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new AppError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
}
