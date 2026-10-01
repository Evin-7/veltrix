"use client";

import { Bell, ChevronDown, LogIn, LogOut, Menu, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { SafeUser } from "@/types/auth";
import type { WalletSummary } from "@/server/wallet/service";
import { cn } from "@/lib/cn";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Casino", href: "/casino" },
  { label: "Promotions", href: "/#promotions" },
  { label: "Rewards", href: "/#rewards" },
];

type HeaderProps = { initialUser: SafeUser | null; initialWallet: WalletSummary | null };

function userLabel(user: SafeUser) {
  return user.profile?.displayName || user.profile?.username || user.email;
}

function initials(user: SafeUser) {
  return userLabel(user).slice(0, 2).toUpperCase();
}

export function Header({ initialUser, initialWallet }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const user = initialUser;

  async function logout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
      setIsMenuOpen(false);
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#080b12]/85 backdrop-blur-xl">
      <div className="page-shell flex h-[72px] items-center justify-between gap-5">
        <Link aria-label="Veltrix home" className="focus-ring flex shrink-0 items-center gap-2.5 rounded-lg" href="/" onClick={() => setIsMenuOpen(false)}>
          <span className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-[10px] border border-amber/45 bg-amber text-[#18130b] shadow-[0_4px_22px_rgba(232,184,106,0.18)]"><span className="absolute -right-1 -top-2 h-5 w-5 rounded-full border border-[#17110b]/20" /><span className="relative font-serif text-lg font-bold">V</span></span>
          <span className="text-[15px] font-bold tracking-[0.18em] text-ink">VELTRIX</span>
        </Link>

        <nav aria-label="Primary navigation" className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href.split("#")[0]);
            return <Link className={cn("focus-ring rounded-full px-3.5 py-2 text-xs font-semibold", isActive ? "bg-white/[0.08] text-ink" : "text-muted hover:bg-white/[0.05] hover:text-ink")} href={item.href} key={item.label}>{item.label}</Link>;
          })}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <button aria-label="Notifications" className="focus-ring relative inline-flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-white/[0.06] hover:text-ink" type="button"><Bell size={17} strokeWidth={1.8} /><span className="absolute right-[10px] top-[9px] h-1.5 w-1.5 rounded-full bg-amber" /></button>
          {user ? (
            <>
            {initialWallet ? <Link className="focus-ring inline-flex items-center gap-2 rounded-full border border-mint/20 bg-mint/10 px-3 py-2 text-xs font-semibold text-mint hover:border-mint/35 hover:bg-mint/15" href="/wallet"><span className="h-1.5 w-1.5 rounded-full bg-mint" />{initialWallet.balance.toLocaleString("en-US")} VC</Link> : null}
            <details className="relative">
              <summary className="focus-ring flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-1.5 pr-2.5 text-xs font-semibold text-muted-strong hover:bg-white/[0.08] [&::-webkit-details-marker]:hidden">
                <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#e8b86a] to-[#a86246] text-[10px] font-bold text-[#17110a]" style={user.profile?.avatarUrl ? { backgroundImage: `url(\"${user.profile.avatarUrl}\")`, backgroundPosition: "center", backgroundSize: "cover" } : undefined}>{user.profile?.avatarUrl ? <span className="sr-only">{initials(user)}</span> : initials(user)}</span><span className="hidden max-w-[100px] truncate md:inline">{userLabel(user)}</span><ChevronDown size={13} strokeWidth={1.8} />
              </summary>
              <div className="absolute right-0 top-12 w-56 rounded-2xl border border-white/10 bg-[#111722] p-3 shadow-2xl shadow-black/35"><p className="truncate px-2 py-1 text-xs font-semibold text-ink">{userLabel(user)}</p><p className="truncate px-2 pb-3 text-[11px] text-muted">{user.email}</p><div className="grid gap-1 border-y border-white/[0.08] py-2"><Link className="focus-ring rounded-xl px-2 py-2 text-xs font-semibold text-muted-strong hover:bg-white/[0.06] hover:text-ink" href="/profile">Profile</Link>{initialWallet ? <Link className="focus-ring flex items-center justify-between rounded-xl px-2 py-2 text-xs font-semibold text-muted-strong hover:bg-white/[0.06] hover:text-ink" href="/wallet">Wallet <span className="text-mint">{initialWallet.balance.toLocaleString("en-US")} VC</span></Link> : null}</div><button className="focus-ring mt-2 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-xs font-semibold text-muted-strong hover:bg-white/[0.06] hover:text-ink" disabled={isLoggingOut} onClick={logout} type="button"><LogOut size={14} /> {isLoggingOut ? "Signing out…" : "Log out"}</button></div>
            </details>
            </>
          ) : (
            <><Link className="focus-ring inline-flex h-10 items-center gap-2 rounded-full px-3 text-xs font-semibold text-muted-strong hover:bg-white/[0.06] hover:text-ink" href="/login"><LogIn size={14} /> Log in</Link><Link className="focus-ring inline-flex h-10 items-center gap-2 rounded-full border border-amber/50 bg-amber px-4 text-xs font-semibold text-[#16120b] hover:bg-amber-bright" href="/register"><UserPlus size={14} /> Create account</Link></>
          )}
        </div>

        <button aria-expanded={isMenuOpen} aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"} className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-muted-strong hover:bg-white/[0.08] lg:hidden" onClick={() => setIsMenuOpen((value) => !value)} type="button">{isMenuOpen ? <X size={19} /> : <Menu size={19} />}</button>
      </div>

      {isMenuOpen ? (
        <div className="border-t border-white/[0.07] bg-[#0b0f17] px-3 pb-4 pt-2 lg:hidden"><nav aria-label="Mobile navigation" className="page-shell flex flex-col gap-1">
          {navItems.map((item) => <Link className="focus-ring rounded-xl px-3 py-3 text-sm font-semibold text-muted-strong hover:bg-white/[0.06] hover:text-ink" href={item.href} key={item.label} onClick={() => setIsMenuOpen(false)}>{item.label}</Link>)}
          {user ? <><div className="mt-2 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3"><span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#e8b86a] to-[#a86246] text-[10px] font-bold text-[#17110a]" style={user.profile?.avatarUrl ? { backgroundImage: `url(\"${user.profile.avatarUrl}\")`, backgroundPosition: "center", backgroundSize: "cover" } : undefined}>{user.profile?.avatarUrl ? <span className="sr-only">{initials(user)}</span> : initials(user)}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-ink">{userLabel(user)}</span><span className="block truncate text-xs text-muted">{user.email}</span></span></div>{initialWallet ? <Link className="mt-2 flex min-h-11 items-center justify-between rounded-xl border border-mint/20 bg-mint/10 px-3 text-sm font-semibold text-mint" href="/wallet" onClick={() => setIsMenuOpen(false)}><span>Veltrix balance</span><span>{initialWallet.balance.toLocaleString("en-US")} VC</span></Link> : null}<div className="mt-2 grid grid-cols-2 gap-2"><Link className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm font-semibold text-muted-strong hover:bg-white/[0.08] hover:text-ink" href="/profile" onClick={() => setIsMenuOpen(false)}>Profile</Link>{initialWallet ? <Link className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm font-semibold text-muted-strong hover:bg-white/[0.08] hover:text-ink" href="/transactions" onClick={() => setIsMenuOpen(false)}>History</Link> : null}</div><button className="focus-ring mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] text-sm font-semibold text-muted-strong hover:bg-white/[0.08] hover:text-ink" disabled={isLoggingOut} onClick={logout} type="button"><LogOut size={15} /> {isLoggingOut ? "Signing out…" : "Log out"}</button></> : <div className="mt-2 grid gap-2"><Link className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] text-sm font-semibold text-muted-strong hover:bg-white/[0.08] hover:text-ink" href="/login" onClick={() => setIsMenuOpen(false)}><LogIn size={15} /> Log in</Link><Link className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-amber/50 bg-amber text-sm font-semibold text-[#16120b] hover:bg-amber-bright" href="/register" onClick={() => setIsMenuOpen(false)}><UserPlus size={15} /> Create account</Link></div>}
        </nav></div>
      ) : null}
    </header>
  );
}
