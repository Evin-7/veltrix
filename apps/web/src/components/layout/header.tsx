"use client";

import { Bell, ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SafeUser } from "@/types/auth";
import type { WalletSummary } from "@/server/wallet/service";
import { cn } from "@/lib/cn";
import { useRealtime } from "@/components/realtime/realtime-provider";
import { ThemeMenu } from "@/components/theme/theme-menu";
import { VeltrixLogo } from "@/components/ui/veltrix-logo";
import { requestJson } from "@/lib/api-client";
import { errorMessage } from "@/lib/app-error";
import { formatCurrency } from "@/lib/currency";
import { useToast } from "@/components/ui/toast";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Casino", href: "/casino" },
  { label: "Promotions", href: "/promotions" },
  { label: "Rewards", href: "/rewards" },
];

type HeaderProps = { initialUser: SafeUser | null; initialWallet: WalletSummary | null; initialWalletError?: boolean };

function userLabel(user: SafeUser) {
  return user.profile?.displayName || user.profile?.username || user.email;
}

function initials(user: SafeUser) {
  return userLabel(user).slice(0, 2).toUpperCase();
}

export function Header({ initialUser, initialWallet, initialWalletError = false }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRefreshingWallet, setIsRefreshingWallet] = useState(false);
  const { showToast } = useToast();
  const user = initialUser;
  const realtime = useRealtime();
  const liveBalance = user?.role === "PLAYER" ? realtime.walletBalance : initialWallet?.balance;
  const hasWalletSurface = Boolean(initialWallet || realtime.walletAvailable);

  function closeTransientMenus() {
    setIsAccountMenuOpen(false);
    setIsMenuOpen(false);
  }

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setIsAccountMenuOpen(false);
      setIsMenuOpen(false);
    });
    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (initialWalletError) {
      showToast("Wallet balance is unavailable. Please try again.", "error");
    }
  }, [initialWalletError, showToast]);

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isAccountMenuOpen]);

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsAccountMenuOpen(false);
        accountTriggerRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isAccountMenuOpen]);

  async function logout() {
    closeTransientMenus();
    setIsLoggingOut(true);
    try {
      await requestJson("/api/v1/auth/logout", { method: "POST" });
      router.refresh();
    } catch (error) {
      showToast(errorMessage(error, "NETWORK_ERROR"), "error");
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function refreshWallet() {
    if (isRefreshingWallet) return;
    setIsRefreshingWallet(true);
    try {
      await realtime.refreshWallet();
    } catch (error) {
      showToast(errorMessage(error, "NETWORK_ERROR"), "error");
    } finally {
      setIsRefreshingWallet(false);
    }
  }

  function walletLabel() {
    if (typeof liveBalance === "number") return formatCurrency(liveBalance);
    return isRefreshingWallet ? "Checking…" : "Balance unavailable";
  }

  return (
    <header className="app-header sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-xl">
      <div className="app-header-inner page-shell flex items-center justify-between gap-5">
        <Link aria-label="Veltrix home" className="focus-ring flex shrink-0 items-center gap-2.5 rounded-lg" href="/" onClick={closeTransientMenus}>
          <VeltrixLogo className="w-[145px] sm:w-[164px]" priority />
        </Link>

        <nav aria-label="Primary navigation" className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href.split("#")[0]);
            return <Link className={cn("focus-ring rounded-full px-3.5 py-2 text-xs font-semibold", isActive ? "bg-surface-hover text-ink" : "text-muted hover:bg-surface-hover hover:text-ink")} href={item.href} key={item.label} onClick={closeTransientMenus} prefetch={false}>{item.label}</Link>;
          })}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <ThemeMenu />
          {user?.role === "PLAYER" ? <Link aria-label="Notifications" className="focus-ring relative inline-flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-surface-hover hover:text-ink" href="/notifications" onClick={closeTransientMenus}><Bell size={17} strokeWidth={1.8} />{realtime.unreadNotifications > 0 ? <span className="absolute right-[7px] top-[6px] grid min-h-4 min-w-4 place-items-center rounded-full bg-amber px-1 text-[9px] font-bold text-background">{realtime.unreadNotifications > 9 ? "9+" : realtime.unreadNotifications}</span> : null}</Link> : null}
          {user ? (
            <>
              {hasWalletSurface ? <Link className="focus-ring inline-flex items-center gap-2 rounded-full border border-mint/20 bg-mint/10 px-3 py-2 text-xs font-semibold text-mint hover:border-mint/35 hover:bg-mint/15" href="/wallet" onClick={closeTransientMenus}><span className="h-1.5 w-1.5 rounded-full bg-mint" />{walletLabel()}</Link> : null}
              <div className="relative" ref={accountMenuRef}>
                <button
                  aria-controls="veltrix-account-menu"
                  aria-expanded={isAccountMenuOpen}
                  aria-haspopup="menu"
                  aria-label={isAccountMenuOpen ? "Close account menu" : "Open account menu"}
                  className="focus-ring flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface-hover/60 px-1.5 py-1.5 pr-2.5 text-xs font-semibold text-muted-strong hover:bg-surface-hover"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsAccountMenuOpen((value) => !value);
                  }}
                  ref={accountTriggerRef}
                  type="button"
                >
                  <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full gold-avatar text-[10px] font-bold" style={user.profile?.avatarUrl ? { backgroundImage: `url(\"${user.profile.avatarUrl}\")`, backgroundPosition: "center", backgroundSize: "cover" } : undefined}>{user.profile?.avatarUrl ? <span className="sr-only">{initials(user)}</span> : initials(user)}</span><span className="hidden max-w-[100px] truncate md:inline">{userLabel(user)}</span><ChevronDown size={13} strokeWidth={1.8} />
                </button>
                {isAccountMenuOpen ? <div aria-label="Account menu" className="absolute right-0 top-12 w-60 radius-overlay border border-border bg-surface p-3 shadow-2xl shadow-black/20" id="veltrix-account-menu">
                  <p className="truncate px-2 py-1 text-xs font-semibold text-ink">{userLabel(user)}</p>
                  <p className="truncate px-2 pb-3 text-[11px] text-muted">{user.email}</p>
                  <div className="grid gap-1 border-y border-border py-2">
                    <Link className="focus-ring flex items-center gap-2 rounded-xl px-2 py-2 text-xs font-semibold text-muted-strong hover:bg-surface-hover hover:text-ink" href="/profile" onClick={closeTransientMenus}>Profile</Link>
                    {hasWalletSurface ? <Link className="focus-ring flex items-center justify-between rounded-xl px-2 py-2 text-xs font-semibold text-muted-strong hover:bg-surface-hover hover:text-ink" href="/wallet" onClick={closeTransientMenus}><span>Wallet</span><span className="text-mint">{walletLabel()}</span></Link> : null}
                    <Link className="focus-ring flex items-center gap-2 rounded-xl px-2 py-2 text-xs font-semibold text-muted-strong hover:bg-surface-hover hover:text-ink" href="/transactions" onClick={closeTransientMenus}>Transactions</Link>
                    <Link className="focus-ring flex items-center gap-2 rounded-xl px-2 py-2 text-xs font-semibold text-muted-strong hover:bg-surface-hover hover:text-ink" href="/favourites" onClick={closeTransientMenus}>Favourites</Link>
                    <Link className="focus-ring flex items-center gap-2 rounded-xl px-2 py-2 text-xs font-semibold text-muted-strong hover:bg-surface-hover hover:text-ink" href="/responsible-gaming" onClick={closeTransientMenus}>Responsible gaming</Link>
                  </div>
                  <div className="mt-2 flex items-center justify-between rounded-xl px-2 py-1"><span className="text-xs font-semibold text-muted-strong">Theme</span><ThemeMenu /></div>
                  <button className="focus-ring mt-2 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-xs font-semibold text-muted-strong hover:bg-surface-hover hover:text-ink" disabled={isLoggingOut} onClick={logout} type="button">{isLoggingOut ? "Signing out…" : "Log out"}</button>
                </div> : null}
              </div>
            </>
          ) : (
            <><Link className="focus-ring inline-flex h-10 items-center gap-2 rounded-full px-3 text-xs font-semibold text-muted-strong hover:bg-surface-hover hover:text-ink" href="/login" onClick={closeTransientMenus} prefetch={false}>Log in</Link><Link className="button-primary focus-ring inline-flex h-10 items-center gap-2 rounded-full px-4 text-xs" href="/register" onClick={closeTransientMenus} prefetch={false}>Create account</Link></>
          )}
        </div>

        <div className="flex items-center gap-2 sm:hidden"><ThemeMenu /><button aria-controls="veltrix-mobile-navigation" aria-expanded={isMenuOpen} aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"} className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface/70 text-foreground-muted hover:bg-surface-hover lg:hidden" onClick={() => { setIsAccountMenuOpen(false); setIsMenuOpen((value) => !value); }} type="button">{isMenuOpen ? <X size={19} /> : <Menu size={19} />}</button></div>
      </div>

      {isMenuOpen ? (
        <div className="border-t border-border bg-surface/90 px-3 pb-4 pt-2 lg:hidden" id="veltrix-mobile-navigation"><nav aria-label="Mobile navigation" className="page-shell flex flex-col gap-1">
          {navItems.map((item) => <Link className="focus-ring rounded-xl px-3 py-3 text-sm font-semibold text-muted-strong hover:bg-surface-hover hover:text-ink" href={item.href} key={item.label} onClick={closeTransientMenus} prefetch={false}>{item.label}</Link>)}
          {user ? <><div className="mt-2 flex items-center gap-3 rounded-xl border border-border bg-surface-hover/60 px-3 py-3"><span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full gold-avatar text-[10px] font-bold" style={user.profile?.avatarUrl ? { backgroundImage: `url(\"${user.profile.avatarUrl}\")`, backgroundPosition: "center", backgroundSize: "cover" } : undefined}>{user.profile?.avatarUrl ? <span className="sr-only">{initials(user)}</span> : initials(user)}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-ink">{userLabel(user)}</span><span className="block truncate text-xs text-muted">{user.email}</span></span></div>{hasWalletSurface ? <div className="mt-2 flex min-h-11 items-center justify-between rounded-xl border border-mint/20 bg-mint/10 px-3 text-sm font-semibold text-mint"><Link className="min-w-0 truncate" href="/wallet" onClick={closeTransientMenus} prefetch={false}>Veltrix balance</Link><span className="ml-3 shrink-0">{walletLabel()}</span></div> : null}{initialWalletError && !realtime.walletAvailable ? <button className="mt-2 w-full text-left text-xs font-semibold text-muted-strong hover:text-ink" disabled={isRefreshingWallet} onClick={refreshWallet} type="button">{isRefreshingWallet ? "Checking wallet…" : "Retry wallet balance"}</button> : null}<div className="mt-2 grid grid-cols-2 gap-2"><Link className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-surface-hover/60 text-sm font-semibold text-muted-strong hover:bg-surface-hover hover:text-ink" href="/profile" onClick={closeTransientMenus} prefetch={false}>Profile</Link>{hasWalletSurface ? <Link className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-surface-hover/60 text-sm font-semibold text-muted-strong hover:bg-surface-hover hover:text-ink" href="/transactions" onClick={closeTransientMenus} prefetch={false}>Transactions</Link> : null}<Link className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-surface-hover/60 text-sm font-semibold text-muted-strong hover:bg-surface-hover hover:text-ink" href="/favourites" onClick={closeTransientMenus} prefetch={false}>Favourites</Link><Link className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-surface-hover/60 text-sm font-semibold text-muted-strong hover:bg-surface-hover hover:text-ink" href="/responsible-gaming" onClick={closeTransientMenus} prefetch={false}>Responsible gaming</Link></div><button className="focus-ring mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-surface-hover/60 text-sm font-semibold text-muted-strong hover:bg-surface-hover hover:text-ink" disabled={isLoggingOut} onClick={logout} type="button">{isLoggingOut ? "Signing out…" : "Log out"}</button></> : <div className="mt-2 grid gap-2"><Link className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm" href="/login" onClick={closeTransientMenus} prefetch={false}>Log in</Link><Link className="button-primary focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm" href="/register" onClick={closeTransientMenus} prefetch={false}>Create account</Link></div>}
        </nav></div>
      ) : null}
    </header>
  );
}
