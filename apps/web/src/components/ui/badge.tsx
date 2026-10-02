import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type BadgeProps = {
  children: ReactNode;
  tone?: "neutral" | "amber" | "mint" | "rose";
  className?: string;
};

const toneClasses = {
  neutral: "border-border bg-surface-hover text-foreground-subtle",
  amber: "border-primary/25 bg-primary/10 text-primary",
  mint: "border-accent/25 bg-accent/10 text-accent",
  rose: "border-danger/25 bg-danger/10 text-danger",
};

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]", toneClasses[tone], className)}>
      {children}
    </span>
  );
}
