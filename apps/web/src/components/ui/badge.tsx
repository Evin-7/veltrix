import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type BadgeProps = {
  children: ReactNode;
  tone?: "neutral" | "amber" | "mint" | "rose";
  className?: string;
};

const toneClasses = {
  neutral: "border-white/10 bg-white/[0.05] text-muted-strong",
  amber: "border-amber/25 bg-amber/10 text-amber-bright",
  mint: "border-mint/25 bg-mint/10 text-mint",
  rose: "border-[#ff9bbb]/25 bg-[#ff9bbb]/10 text-[#ffb1c9]",
};

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]", toneClasses[tone], className)}>
      {children}
    </span>
  );
}
