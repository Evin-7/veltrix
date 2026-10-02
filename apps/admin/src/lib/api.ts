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
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    credentials: "include",
    headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...(init.headers ?? {}) },
  });
  const payload = (await response.json().catch(() => ({}))) as { data?: T; meta?: ApiMeta; error?: { code?: string; message?: string } };
  if (!response.ok) throw new ApiError(response.status, payload.error?.code ?? "REQUEST_FAILED", payload.error?.message ?? "The request failed.");
  return { data: payload.data as T, meta: payload.meta };
}

export function jsonBody(value: unknown) {
  return JSON.stringify(value);
}
