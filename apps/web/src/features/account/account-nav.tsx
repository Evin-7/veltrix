"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const items = [
  { href: "/profile", label: "Profile" },
  { href: "/wallet", label: "Wallet" },
  { href: "/transactions", label: "Transactions" },
  { href: "/favourites", label: "Favourites" },
  { href: "/rewards", label: "Rewards" },
  { href: "/responsible-gaming", label: "Play controls" },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Account navigation"
      className="flex gap-1 overflow-x-auto border-b border-border pb-1"
    >
      {items.map((item) => (
        <Link
          className={cn(
            "focus-ring shrink-0 rounded-[var(--radius-control)] px-4 py-2.5 text-xs font-semibold",
            pathname === item.href
              ? "bg-primary/10 text-primary"
              : "text-foreground-muted hover:bg-surface-hover hover:text-foreground",
          )}
          href={item.href}
          key={item.href}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
