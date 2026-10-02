import { dispatchAdminToast } from "@/lib/admin-toast";

export type ApiMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type AdminRequestInit = RequestInit & { suppressErrorToast?: boolean };

const apiBase = (
  process.env.NEXT_PUBLIC_ADMIN_API_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export async function apiFetch<T>(path: string, init: AdminRequestInit = {}) {
  const { suppressErrorToast = false, ...requestInit } = init;
  let response: Response;
  try {
    const headers = new Headers(requestInit.headers);
    const isFormData =
      typeof FormData !== "undefined" && requestInit.body instanceof FormData;
    if (requestInit.body && !isFormData && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    response = await fetch(`${apiBase}${path}`, {
      ...requestInit,
      credentials: "include",
      headers,
    });
  } catch {
    const message = "The admin service could not be reached. Please try again.";
    if (!suppressErrorToast) dispatchAdminToast({ type: "error", message });
    throw new ApiError(0, "NETWORK_ERROR", message);
  }
  const payload = (await response.json().catch(() => ({}))) as {
    data?: T;
    meta?: ApiMeta;
    error?: { code?: string; message?: string };
  };
  if (!response.ok) {
    const message = payload.error?.message ?? "The request failed.";
    if (!suppressErrorToast) dispatchAdminToast({ type: "error", message });
    throw new ApiError(
      response.status,
      payload.error?.code ?? "REQUEST_FAILED",
      message,
    );
  }
  return { data: payload.data as T, meta: payload.meta };
}

export function jsonBody(value: unknown) {
  return JSON.stringify(value);
}
