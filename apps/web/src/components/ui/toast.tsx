"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ToastTone = "success" | "error" | "info";
type ToastItem = { id: number; message: string; tone: ToastTone };
type ToastContextValue = { showToast: (message: string, tone?: ToastTone) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, { icon: typeof CheckCircle2; className: string }> = {
  success: { icon: CheckCircle2, className: "border-success/30 bg-success/10 text-success" },
  error: { icon: AlertCircle, className: "border-danger/30 bg-danger/10 text-danger" },
  info: { icon: Info, className: "border-primary/30 bg-primary/10 text-primary" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const lastToast = useRef<{ message: string; at: number } | null>(null);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const showToast = useCallback((message: string, tone: ToastTone = "info") => {
    const now = Date.now();
    if (lastToast.current?.message === message && now - lastToast.current.at < 500) return;
    lastToast.current = { message, at: now };
    const id = nextId.current++;
    setToasts((current) => [...current.slice(-2), { id, message, tone }]);
    timers.current.set(id, setTimeout(() => dismiss(id), 3200));
  }, [dismiss]);

  useEffect(() => () => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div aria-label="Notifications" className="pointer-events-none fixed inset-x-3 bottom-4 z-[100] flex flex-col items-stretch gap-2 sm:left-auto sm:right-5 sm:w-[min(100%-2.5rem,22rem)]" role="region">
        {toasts.map((toast) => {
          const style = toneStyles[toast.tone];
          const Icon = style.icon;
          return <div aria-atomic="true" className={cn("pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur-xl", style.className)} key={toast.id} role={toast.tone === "error" ? "alert" : "status"}><Icon className="mt-0.5 shrink-0" size={17} /><span className="min-w-0 flex-1 leading-5">{toast.message}</span><button aria-label="Dismiss notification" className="focus-ring -mr-1 rounded-full p-1 opacity-70 hover:opacity-100" onClick={() => dismiss(toast.id)} type="button"><X size={14} /></button></div>;
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
