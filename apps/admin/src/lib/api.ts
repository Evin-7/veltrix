import { dispatchAdminToast } from "@/lib/admin-toast";

export type ApiMeta = { page: number; pageSize: number; total: number; totalPages: number };

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const apiBase = (process.env.NEXT_PUBLIC_ADMIN_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function apiFetch<T>(path: string, init: RequestInit = {}) {
  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      ...init,
      credentials: "include",
      headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...(init.headers ?? {}) },
    });
  } catch {
    const message = "The admin service could not be reached. Please try again.";
    dispatchAdminToast({ type: "error", message });
    throw new ApiError(0, "NETWORK_ERROR", message);
  }
  const payload = (await response.json().catch(() => ({}))) as { data?: T; meta?: ApiMeta; error?: { code?: string; message?: string } };
  if (!response.ok) {
    const message = payload.error?.message ?? "The request failed.";
    dispatchAdminToast({ type: "error", message });
    throw new ApiError(response.status, payload.error?.code ?? "REQUEST_FAILED", message);
  }
  return { data: payload.data as T, meta: payload.meta };
}

export function jsonBody(value: unknown) {
  return JSON.stringify(value);
}
