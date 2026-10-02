export type AdminToastType = "success" | "error" | "info";

export type AdminToastPayload = {
  type: AdminToastType;
  message: string;
  title?: string;
};

export const ADMIN_TOAST_EVENT = "veltrix:admin-toast";

export function dispatchAdminToast(payload: AdminToastPayload) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<AdminToastPayload>(ADMIN_TOAST_EVENT, { detail: payload }));
}

export function notifyAdminSuccess(message: string) {
  dispatchAdminToast({ type: "success", message });
}
