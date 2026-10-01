import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "quiet";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "border-amber/60 bg-amber text-[#16120b] hover:border-amber-bright hover:bg-amber-bright",
  secondary: "border-[var(--line-strong)] bg-white/[0.04] text-ink hover:border-white/25 hover:bg-white/[0.08]",
  ghost: "border-transparent bg-transparent text-muted-strong hover:bg-white/[0.06] hover:text-ink",
  quiet: "border-transparent bg-transparent px-0 text-muted hover:text-ink",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-xs",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-sm",
};

export function Button({ className, variant = "secondary", size = "md", children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-2 rounded-full border font-semibold tracking-[-0.01em] disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
