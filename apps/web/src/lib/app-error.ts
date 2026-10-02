export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "INSUFFICIENT_BALANCE"
  | "INVALID_WAGER"
  | "ROUND_ALREADY_SETTLED"
  | "RATE_LIMITED"
  | "SESSION_EXPIRED"
  | "SELF_EXCLUDED"
  | "COOL_OFF_ACTIVE"
  | "DAILY_LIMIT_REACHED"
  | "MAX_WAGER_EXCEEDED"
  | "NETWORK_ERROR"
  | "BAD_REQUEST"
  | "CONFLICT"
  | "INTERNAL_ERROR"
  | "UNKNOWN";

export type ApiErrorDetails = Record<string, unknown>;

export type NormalizedAppError = {
  code: AppErrorCode;
  message: string;
  retryable: boolean;
  status?: number;
  details?: ApiErrorDetails;
};

const safeMessages: Record<AppErrorCode, string> = {
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
  FORBIDDEN: "You do not have permission to do that.",
  NOT_FOUND: "We could not find that Veltrix page.",
  VALIDATION_ERROR: "Please check the highlighted fields and try again.",
  INSUFFICIENT_BALANCE: "Your balance is too low for that action.",
  INVALID_WAGER: "Choose a valid wager and try again.",
  ROUND_ALREADY_SETTLED: "That round is already settled. Your balance was not changed.",
  RATE_LIMITED: "You are moving quickly. Please try again shortly.",
  SESSION_EXPIRED: "Your session has expired. Please sign in again.",
  SELF_EXCLUDED: "Gameplay is unavailable while self-exclusion is active.",
  COOL_OFF_ACTIVE: "Gameplay is unavailable while your cool-off period is active.",
  DAILY_LIMIT_REACHED: "Your daily play limit has been reached.",
  MAX_WAGER_EXCEEDED: "That wager is above your current maximum.",
  NETWORK_ERROR: "Connection problem. Check your connection and try again.",
  BAD_REQUEST: "We could not complete that request. Please check your details and try again.",
  CONFLICT: "We could not complete that request right now. Please try again.",
  INTERNAL_ERROR: "Something went wrong on our side. Please try again.",
  UNKNOWN: "Something went wrong. Please try again.",
};

const retryableCodes = new Set<AppErrorCode>([
  "NETWORK_ERROR",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
  "CONFLICT",
  "UNKNOWN",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asCode(value: unknown): AppErrorCode {
  if (typeof value !== "string") return "UNKNOWN";
  return value in safeMessages ? (value as AppErrorCode) : "UNKNOWN";
}

export class AppRequestError extends Error {
  readonly appError: NormalizedAppError;

  constructor(error: NormalizedAppError) {
    super(error.message);
    this.name = "AppRequestError";
    this.appError = error;
  }
}

export function normalizeAppError(
  error: unknown,
  fallbackCode: AppErrorCode = "UNKNOWN",
): NormalizedAppError {
  if (error instanceof AppRequestError) return error.appError;

  if (error instanceof DOMException && error.name === "AbortError") {
    return {
      code: "NETWORK_ERROR",
      message: safeMessages.NETWORK_ERROR,
      retryable: true,
    };
  }

  if (error instanceof TypeError) {
    return {
      code: "NETWORK_ERROR",
      message: safeMessages.NETWORK_ERROR,
      retryable: true,
    };
  }

  if (isRecord(error) && isRecord(error.error)) {
    const code = asCode(error.error.code);
    return {
      code,
      message: safeMessages[code],
      retryable: retryableCodes.has(code),
      details: isRecord(error.error.details) ? error.error.details : undefined,
    };
  }

  const code = asCode(fallbackCode);
  return { code, message: safeMessages[code], retryable: retryableCodes.has(code) };
}

export function normalizeApiError(
  payload: unknown,
  status?: number,
): NormalizedAppError {
  const normalized = normalizeAppError(payload, status === 401 ? "SESSION_EXPIRED" : "UNKNOWN");
  return { ...normalized, status };
}

export function errorMessage(error: unknown, fallbackCode: AppErrorCode = "UNKNOWN") {
  return normalizeAppError(error, fallbackCode).message;
}
