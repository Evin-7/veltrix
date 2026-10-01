import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  actionLabel?: string;
  children?: ReactNode;
};

export function SectionHeading({ eyebrow, title, description, href, actionLabel = "View all", children }: SectionHeadingProps) {
  return (
    <div className="mb-6 flex items-end justify-between gap-5">
      <div>
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h2 className="display text-3xl text-ink sm:text-[2.25rem]">{title}</h2>
        {description ? <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {children}
      {href ? (
        <Link className="focus-ring hidden items-center gap-1.5 rounded-full px-2 py-2 text-xs font-semibold text-muted-strong hover:text-amber-bright sm:inline-flex" href={href}>
          {actionLabel}
          <ArrowUpRight size={14} strokeWidth={1.8} />
        </Link>
      ) : null}
    </div>
  );
}
