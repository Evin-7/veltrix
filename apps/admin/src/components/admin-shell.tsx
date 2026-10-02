"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { Activity, CircleDollarSign, FileClock, Gamepad2, LayoutDashboard, LogOut, Menu, Settings, Shield, Sparkles, Trophy, Users, X } from "lucide-react";
import { apiFetch, type ApiError } from "@/lib/api";
import { AdminThemeMenu } from "@/components/theme-menu";
import { AdminVeltrixLogo } from "@/components/veltrix-logo";

export type AdminUser = { id: string; email: string; role: "ADMIN" | "SUPER_ADMIN"; status: "ACTIVE"; profile: { username: string; displayName: string | null } | null };

const AdminContext = createContext<AdminUser | null>(null);
export function useAdminUser() { return useContext(AdminContext); }

const nav = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Players", href: "/players", icon: Users },
  { label: "Games", href: "/games", icon: Gamepad2 },
  { label: "Game Sessions", href: "/game-sessions", icon: Activity },
  { label: "Transactions", href: "/transactions", icon: CircleDollarSign },
  { label: "Promotions", href: "/promotions", icon: Sparkles },
  { label: "Rewards", href: "/rewards", icon: Trophy },
  { label: "Responsible gaming", href: "/responsible-gaming", icon: Shield },
  { label: "Audit Logs", href: "/audit-logs", icon: FileClock },
  { label: "Settings", href: "/settings", icon: Settings, muted: true },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch<AdminUser>("/api/v1/admin/auth/me").then((result) => { if (active) setUser(result.data); }).catch((error: ApiError) => { if (active && error.status === 401) router.replace("/login"); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [router]);

  async function logout() {
    await apiFetch("/api/v1/admin/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/login");
  }

  if (loading) return <div aria-label="Loading" className="admin-loading-screen" role="status"><span aria-hidden="true" className="admin-loading-spinner" /> <span>Loading…</span></div>;
  if (!user) return null;

  return <AdminContext.Provider value={user}>
    <div className="min-h-screen">
      {mobileOpen && <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-black/60 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-[#252d3d] bg-[#0d111a] px-5 py-6 transition-transform lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-10 flex items-center justify-between px-2">
          <div><AdminVeltrixLogo className="w-[164px]" priority /></div>
          <button onClick={() => setMobileOpen(false)} className="text-[#8994aa] lg:hidden"><X size={20} /></button>
        </div>
        <nav className="admin-scrollbar flex-1 space-y-1 overflow-y-auto">
          {nav.map((item) => { const Icon = item.icon; const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href); return <button key={item.href} onClick={() => { router.push(item.href); setMobileOpen(false); }} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${active ? "bg-[#15352f] font-semibold text-[#a3f8d2]" : "text-[#98a3b8] hover:bg-[#171d2a] hover:text-white"}`}><Icon size={17} className={active ? "text-[#83f5c5]" : "text-[#637089]"} /><span>{item.label}</span>{item.muted && <span className="ml-auto rounded-full border border-[#2b3547] px-2 py-0.5 text-[9px] uppercase tracking-wider text-[#637089]">Soon</span>}</button>; })}
        </nav>
        <div className="mt-4 border-t border-[#252d3d] pt-4">
          <button aria-label="Sign out" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#98a3b8] transition hover:bg-[#321b26] hover:text-[#ffadbd]"><LogOut aria-hidden="true" size={17} /><span>Sign out</span></button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 pt-20 lg:pl-72">
        <header className="fixed left-0 right-0 top-0 z-30 flex h-20 items-center justify-between border-b border-[#252d3d]/80 bg-[#090b11]/90 px-5 backdrop-blur-xl sm:px-8 lg:left-72 lg:px-10">
          <div className="flex items-center gap-3"><button aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="text-[#aab4c8] lg:hidden"><Menu size={22} /></button><span className="hidden text-xs font-medium text-[#59657b] sm:inline">VELTRIX /</span><span className="text-sm font-semibold text-[#e9eef8]">{pathname === "/" ? "Overview" : nav.find((item) => pathname.startsWith(item.href))?.label ?? "Control room"}</span></div>
          <div className="flex items-center gap-3 sm:gap-6"><div className="flex items-center gap-3"><AdminThemeMenu /><div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#83f5c5] to-[#3b8c78] text-sm font-bold text-[#09120f]">{(user.profile?.displayName ?? user.email).slice(0, 1).toUpperCase()}</div><div className="hidden leading-tight sm:block"><div className="text-xs font-semibold text-[#edf3fd]">{user.profile?.displayName ?? user.email.split("@")[0]}</div><div className="mt-1 text-[10px] uppercase tracking-wider text-[#83f5c5]">{user.role.replace("_", " ")}</div></div></div></div>
        </header>
        <div className="mx-auto max-w-[1600px] p-5 sm:p-8 lg:p-10">{children}</div>
      </main>
    </div>
  </AdminContext.Provider>;
}

export function PageIntro({ eyebrow, title, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div>{eyebrow ? <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#83f5c5]">{eyebrow}</div> : null}<h1 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">{title}</h1></div>{action}</div>;
}

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <section className={`admin-panel rounded-2xl border border-[#252d3d] bg-[#11151f] ${className}`}>{children}</section>; }
export function StatusPill({ value }: { value: string }) { const tone = value === "ACTIVE" || value === "COMPLETED" ? "border-[#245a4c] bg-[#12352e] text-[#8af0c4]" : value === "DISABLED" || value === "INACTIVE" || value === "ABANDONED" ? "border-[#5c3340] bg-[#321b26] text-[#f39bad]" : "border-[#64552b] bg-[#332c18] text-[#f4d98b]"; return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${tone}`}>{value}</span>; }
export function EmptyState({ children = "No records found." }: { children?: React.ReactNode }) { return <div className="px-6 py-14 text-center text-sm text-[#718097]">{children}</div>; }
export function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—"; }
export function formatVc(value: number) {
  const sign = value < 0 ? "-" : "";
  return `${sign}€${new Intl.NumberFormat("en-US").format(Math.abs(value))}`;
}
