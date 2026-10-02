import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type ContainerProps = {
  children: ReactNode;
  className?: string;
  as?: "div" | "main" | "section";
};

export function AppContainer({
  children,
  className,
  as = "div",
}: ContainerProps) {
  const Component = as;
  return (
    <Component className={cn("page-shell", className)}>{children}</Component>
  );
}

export function FullBleed({ children, className }: Omit<ContainerProps, "as">) {
  return <div className={cn("full-bleed", className)}>{children}</div>;
}

export function ContentSplit({
  children,
  className,
}: Omit<ContainerProps, "as">) {
  return <div className={cn("content-split", className)}>{children}</div>;
}

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "page-header flex max-w-4xl items-end justify-between gap-6",
        className,
      )}
    >
      <div className="max-w-3xl">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="display mt-4 text-5xl leading-none text-ink sm:text-6xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </header>
  );
}

type SectionProps = {
  children: ReactNode;
  className?: string;
  as?: "section" | "div";
};

export function Section({ children, className, as = "section" }: SectionProps) {
  const Component = as;
  return <Component className={cn("content-section", className)}>{children}</Component>;
}

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  actionLabel?: string;
  children?: ReactNode;
  className?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  href,
  actionLabel = "View all",
  children,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("section-header flex items-end justify-between gap-5", className)}>
      <div>
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h2 className="display text-3xl text-ink sm:text-[2.25rem]">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            {description}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        {children}
        {href ? (
          <Link
            className="focus-ring hidden items-center rounded-full px-2 py-2 text-xs font-semibold text-muted-strong hover:text-amber-bright sm:inline-flex"
            href={href}
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("h-px bg-border", className)} />;
}

type StatProps = {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  className?: string;
};

export function Stat({ label, value, detail, className }: StatProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className="mt-2 truncate text-xl font-semibold tracking-[-0.03em] text-ink sm:text-2xl">
        {value}
      </p>
      {detail ? (
        <p className="mt-1 text-xs leading-5 text-muted">{detail}</p>
      ) : null}
    </div>
  );
}

type SettingsRowProps = {
  label: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function SettingsRow({
  label,
  description,
  children,
  className,
}: SettingsRowProps) {
  return (
    <div
      className={cn(
        "grid gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(13rem,22rem)] sm:items-center sm:gap-8",
        className,
      )}
    >
      <div>
        <p className="text-sm font-semibold text-ink">{label}</p>
        {description ? (
          <p className="mt-1 max-w-xl text-xs leading-5 text-muted">
            {description}
          </p>
        ) : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

type ActionRowProps = {
  label: string;
  description: string;
  action: ReactNode;
  tone?: "default" | "danger";
  className?: string;
};

export function ActionRow({
  label,
  description,
  action,
  tone = "default",
  className,
}: ActionRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8",
        className,
      )}
    >
      <div>
        <p
          className={cn(
            "text-sm font-semibold",
            tone === "danger" ? "text-danger" : "text-ink",
          )}
        >
          {label}
        </p>
        <p className="mt-1 max-w-xl text-xs leading-5 text-muted">
          {description}
        </p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
