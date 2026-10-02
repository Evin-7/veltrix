"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ADMIN_TOAST_EVENT, type AdminToastPayload, type AdminToastType } from "@/lib/admin-toast";

type ToastItem = AdminToastPayload & { id: number };

const toastMeta: Record<AdminToastType, { Icon: typeof CheckCircle2; title: string }> = {
  success: { Icon: CheckCircle2, title: "Saved" },
  error: { Icon: AlertCircle, title: "Something went wrong" },
  info: { Icon: Info, title: "Admin update" },
};

export function AdminToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    function handleToast(event: Event) {
      const payload = (event as CustomEvent<AdminToastPayload>).detail;
      if (!payload?.message) return;
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { ...payload, id }].slice(-4));
      window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), payload.type === "error" ? 6500 : 4200);
    }
    window.addEventListener(ADMIN_TOAST_EVENT, handleToast);
    return () => window.removeEventListener(ADMIN_TOAST_EVENT, handleToast);
  }, []);

  function dismiss(id: number) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  return <>
    {children}
    <div aria-label="Admin notifications" className="admin-toast-region" role="region">
      {toasts.map((toast) => {
        const { Icon, title } = toastMeta[toast.type];
        return <div aria-live={toast.type === "error" ? "assertive" : "polite"} className={`admin-toast admin-toast--${toast.type}`} key={toast.id} role={toast.type === "error" ? "alert" : "status"}>
          <Icon aria-hidden="true" className="admin-toast-icon" size={18} />
          <div className="min-w-0 flex-1"><p className="admin-toast-title">{toast.title ?? title}</p><p className="admin-toast-message">{toast.message}</p></div>
          <button aria-label="Dismiss notification" className="admin-toast-dismiss" onClick={() => dismiss(toast.id)} type="button"><X size={15} /></button>
        </div>;
      })}
    </div>
  </>;
}
