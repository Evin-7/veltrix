"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

type ConfirmationDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busy?: boolean;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  busy = false,
  danger = false,
  onCancel,
  onConfirm,
}: ConfirmationDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        aria-modal="true"
        className="radius-overlay w-full max-w-md border border-border-strong bg-surface-raised p-6 shadow-2xl shadow-black/30 sm:p-7"
        role="dialog"
        aria-labelledby="confirmation-dialog-title"
        aria-describedby="confirmation-dialog-description"
      >
        <p className="eyebrow">Please confirm</p>
        <h2
          className="display mt-3 text-3xl text-ink"
          id="confirmation-dialog-title"
        >
          {title}
        </h2>
        <p
          className="mt-3 text-sm leading-6 text-muted"
          id="confirmation-dialog-description"
        >
          {description}
        </p>
        <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            className="focus-ring min-h-11 rounded-[var(--radius-control)] px-4 text-sm font-semibold text-muted-strong hover:bg-surface-hover hover:text-ink"
            disabled={busy}
            onClick={onCancel}
            ref={cancelRef}
            type="button"
          >
            Cancel
          </button>
          <button
            className={cn(
              "focus-ring min-h-11 rounded-[var(--radius-control)] px-4 text-sm",
              danger
                ? "button-danger"
                : "button-primary",
            )}
            disabled={busy}
            onClick={onConfirm}
            type="button"
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
