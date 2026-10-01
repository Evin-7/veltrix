"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const items = [{ href: "/profile", label: "Profile" }, { href: "/wallet", label: "Wallet" }, { href: "/transactions", label: "Transactions" }];

export function AccountNav() {
  const pathname = usePathname();
  return <nav aria-label="Account navigation" className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-1">{items.map((item) => <Link className={cn("focus-ring shrink-0 rounded-xl px-4 py-2.5 text-xs font-semibold", pathname === item.href ? "bg-amber/10 text-amber-bright" : "text-muted hover:bg-white/[0.06] hover:text-ink")} href={item.href} key={item.href}>{item.label}</Link>)}</nav>;
}
