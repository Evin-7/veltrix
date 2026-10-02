"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ADMIN_TOAST_EVENT,
  type AdminToastPayload,
  type AdminToastType,
} from "@/lib/admin-toast";

type ToastItem = AdminToastPayload & { id: number };
type ToastEntry = {
  key: string;
  item: ToastItem;
  timeout: number;
};

const toastMeta: Record<
  AdminToastType,
  { Icon: typeof CheckCircle2; title: string }
> = {
  success: { Icon: CheckCircle2, title: "Saved" },
  error: { Icon: AlertCircle, title: "Something went wrong" },
  info: { Icon: Info, title: "Admin update" },
};

export function AdminToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const entries = useRef<ToastEntry[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    const index = entries.current.findIndex((entry) => entry.item.id === id);
    if (index < 0) return;
    const [entry] = entries.current.splice(index, 1);
    window.clearTimeout(entry.timeout);
    setToasts(entries.current.map((current) => current.item));
  }, []);

  useEffect(() => {
    function handleToast(event: Event) {
      const payload = (event as CustomEvent<AdminToastPayload>).detail;
      if (!payload?.message) return;
      const normalizedMessage = payload.message.trim().replace(/\s+/g, " ");
      const key = `${payload.type}:${normalizedMessage}`;
      const existing = entries.current.find((entry) => entry.key === key);

      if (existing) {
        window.clearTimeout(existing.timeout);
        existing.item = { ...existing.item, ...payload };
        existing.timeout = window.setTimeout(
          () => dismiss(existing.item.id),
          payload.type === "error" ? 6500 : 4200,
        );
        setToasts(entries.current.map((entry) => entry.item));
        return;
      }

      const item = { ...payload, id: ++nextId.current };
      const entry: ToastEntry = {
        key,
        item,
        timeout: window.setTimeout(
          () => dismiss(item.id),
          payload.type === "error" ? 6500 : 4200,
        ),
      };
      entries.current.push(entry);
      while (entries.current.length > 4) {
        const removed = entries.current.shift();
        if (removed) window.clearTimeout(removed.timeout);
      }
      setToasts(entries.current.map((current) => current.item));
    }
    window.addEventListener(ADMIN_TOAST_EVENT, handleToast);
    return () => {
      window.removeEventListener(ADMIN_TOAST_EVENT, handleToast);
      entries.current.forEach((entry) => window.clearTimeout(entry.timeout));
      entries.current = [];
    };
  }, [dismiss]);

  return (
    <>
      {children}
      <div
        aria-label="Admin notifications"
        className="admin-toast-region"
        role="region"
      >
        {toasts.map((toast) => {
          const { Icon, title } = toastMeta[toast.type];
          return (
            <div
              aria-atomic="true"
              aria-live={toast.type === "error" ? "assertive" : "polite"}
              className={`admin-toast admin-toast--${toast.type}`}
              key={toast.id}
              role={toast.type === "error" ? "alert" : "status"}
            >
              <Icon aria-hidden="true" className="admin-toast-icon" size={18} />
              <div className="min-w-0 flex-1">
                <p className="admin-toast-title">{toast.title ?? title}</p>
                <p className="admin-toast-message">{toast.message}</p>
              </div>
              <button
                aria-label="Dismiss notification"
                className="admin-toast-dismiss"
                onClick={() => dismiss(toast.id)}
                type="button"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
