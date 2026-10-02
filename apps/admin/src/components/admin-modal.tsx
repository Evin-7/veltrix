"use client";

import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useId } from "react";

type AdminModalProps = {
  children: React.ReactNode;
  description?: string;
  onClose: () => void;
  open: boolean;
  title: string;
};

export function AdminModal({ children, description, onClose, open, title }: AdminModalProps) {
  const titleId = useId().replace(/:/g, "");
  const descriptionId = `${titleId}-description`;

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div aria-describedby={description ? descriptionId : undefined} aria-labelledby={titleId} aria-modal="true" className="w-full max-w-2xl overflow-hidden rounded-t-3xl border border-[#252d3d] bg-[#11151f] shadow-2xl shadow-black/40 sm:rounded-3xl" role="dialog">
        <div className="flex items-start justify-between gap-5 border-b border-[#252d3d] px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-white" id={titleId}>{title}</h2>
            {description ? <p className="mt-1 text-xs leading-5 text-[#718097]" id={descriptionId}>{description}</p> : null}
          </div>
          <button aria-label="Close dialog" className="admin-icon-button h-9 w-9 shrink-0" onClick={onClose} type="button"><X aria-hidden="true" size={16} /></button>
        </div>
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
