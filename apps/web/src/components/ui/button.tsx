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
  primary: "border-primary/60 bg-primary text-background hover:border-primary-hover hover:bg-primary-hover",
  secondary: "border-border-strong bg-surface-hover/50 text-foreground hover:border-border-strong hover:bg-surface-hover",
  ghost: "border-transparent bg-transparent text-foreground-subtle hover:bg-surface-hover hover:text-foreground",
  quiet: "border-transparent bg-transparent px-0 text-foreground-muted hover:text-foreground",
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
        "focus-ring inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border font-semibold tracking-[-0.01em] disabled:cursor-not-allowed disabled:opacity-50",
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
