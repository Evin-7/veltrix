"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useTheme, type ThemePreference } from "./theme-provider";

const options: Array<{ value: ThemePreference; label: string; Icon: typeof Sun }> = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

export function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const CurrentIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <button aria-expanded={open} aria-haspopup="menu" aria-label={`Theme: ${theme}`} className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface/70 text-foreground-muted hover:border-border-strong hover:bg-surface-hover hover:text-foreground" onClick={() => setOpen((value) => !value)} type="button">
        <CurrentIcon size={16} strokeWidth={1.8} />
      </button>
      {open ? <div aria-label="Theme preference" className="absolute right-0 top-12 z-50 w-44 radius-overlay border border-border bg-surface-raised p-1.5 shadow-2xl shadow-black/20" role="menu">
        <p className="px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground-muted">Appearance</p>
        {options.map(({ value, label, Icon }) => <button aria-checked={theme === value} className={cn("focus-ring flex w-full items-center gap-2.5 rounded-[var(--radius-control)] px-3 py-2.5 text-left text-xs font-semibold", theme === value ? "bg-primary/10 text-primary" : "text-foreground-muted hover:bg-surface-hover hover:text-foreground")} key={value} onClick={() => { setTheme(value); setOpen(false); }} role="menuitemradio" type="button"><Icon size={15} strokeWidth={1.8} /><span className="flex-1">{label}</span>{theme === value ? <Check size={14} /> : null}</button>)}
      </div> : null}
    </div>
  );
}
