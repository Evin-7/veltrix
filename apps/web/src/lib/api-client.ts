import {
  AppRequestError,
  normalizeApiError,
  type ApiErrorDetails,
} from "@/lib/app-error";

type ApiEnvelope<T, M = Record<string, unknown>> = {
  data?: T;
  meta?: M;
};
const REQUEST_TIMEOUT_MS = 30_000;

function notifySessionExpired() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("veltrix:session-expired"));
}

async function parseBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function requestJsonEnvelope<T, M = Record<string, unknown>>(
  input: RequestInfo | URL,
  options: RequestInit = {},
): Promise<{ data: T; meta?: M }> {
  let response: Response;
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  options.signal?.addEventListener("abort", forwardAbort, { once: true });
  try {
    response = await fetch(input, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(options.body ? { "content-type": "application/json" } : {}),
        ...(options.headers ?? {}),
      },
    });
  } catch (error) {
    if (timedOut) {
      throw new AppRequestError({ code: "NETWORK_ERROR", message: "Connection problem. Check your connection and try again.", retryable: true });
    }
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new AppRequestError(normalizeApiError(error));
  } finally {
    globalThis.clearTimeout(timeoutId);
    options.signal?.removeEventListener("abort", forwardAbort);
  }

  const payload = await parseBody(response);
  if (!response.ok) {
    if (response.status === 401) notifySessionExpired();
    throw new AppRequestError(normalizeApiError(payload, response.status));
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    !("data" in payload) ||
    (payload as { data?: unknown }).data === undefined
  ) {
    throw new AppRequestError({
      code: "INTERNAL_ERROR",
      message: "Something went wrong on our side. Please try again.",
      retryable: true,
      status: response.status,
    });
  }

  const envelope = payload as ApiEnvelope<T, M>;
  return { data: envelope.data as T, meta: envelope.meta };
}

export async function requestJson<T>(
  input: RequestInfo | URL,
  options: RequestInit = {},
): Promise<T> {
  const result = await requestJsonEnvelope<T>(input, options);
  return result.data;
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export type { ApiErrorDetails };
