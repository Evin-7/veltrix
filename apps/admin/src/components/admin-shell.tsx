"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import {
  Activity,
  CircleDollarSign,
  FileClock,
  Gamepad2,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Shield,
  TicketPercent,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { apiFetch, type ApiError } from "@/lib/api";
import { AdminButton } from "@/components/admin-form";
import { AdminThemeMenu } from "@/components/theme-menu";
import { AdminVeltrixLogo } from "@/components/veltrix-logo";

export type AdminUser = {
  id: string;
  email: string;
  role: "ADMIN" | "SUPER_ADMIN";
  status: "ACTIVE";
  profile: { username: string; displayName: string | null } | null;
};

const AdminContext = createContext<AdminUser | null>(null);
export function useAdminUser() {
  return useContext(AdminContext);
}

const nav = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Players", href: "/players", icon: Users },
  { label: "Games", href: "/games", icon: Gamepad2 },
  { label: "Game Sessions", href: "/game-sessions", icon: Activity },
  { label: "Transactions", href: "/transactions", icon: CircleDollarSign },
  { label: "Promotions", href: "/promotions", icon: TicketPercent },
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
    apiFetch<AdminUser>("/api/v1/admin/auth/me", { suppressErrorToast: true })
      .then((result) => {
        if (active) setUser(result.data);
      })
      .catch((error: ApiError) => {
        if (active && error.status === 401) router.replace("/login");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  async function logout() {
    await apiFetch("/api/v1/admin/auth/logout", {
      method: "POST",
      suppressErrorToast: true,
    }).catch(() => undefined);
    router.replace("/login");
  }

  if (loading)
    return (
      <div aria-label="Loading" className="admin-loading-screen" role="status">
        <span aria-hidden="true" className="admin-loading-spinner" />
      </div>
    );
  if (!user) return null;

  return (
    <AdminContext.Provider value={user}>
      <div className="admin-root min-h-screen">
        {mobileOpen && (
          <button
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          />
        )}
        <aside
          className={`admin-sidebar fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r px-5 py-6 transition-transform lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="mb-10 flex items-center justify-between px-2">
            <div>
              <AdminVeltrixLogo className="w-[164px]" priority />
            </div>
            <button
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
              className="admin-icon-button admin-mobile-nav-close"
            >
              <X size={17} />
            </button>
          </div>
          <nav className="admin-scrollbar flex-1 space-y-1 overflow-y-auto">
            {nav.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <button
                  aria-current={active ? "page" : undefined}
                  key={item.href}
                  onClick={() => {
                    router.push(item.href);
                    setMobileOpen(false);
                  }}
                  className={`admin-nav-item group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${active ? "font-semibold" : ""}`}
                >
                  <Icon aria-hidden="true" size={17} />
                  <span>{item.label}</span>
                  {item.muted && (
                    <span className="ml-auto rounded-full border border-[#2b3547] px-2 py-0.5 text-[9px] uppercase tracking-wider text-[#637089]">
                      Soon
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
          <div className="mt-4 border-t border-[#252d3d] pt-4">
            <AdminButton
              aria-label="Sign out"
              className="admin-shell-signout"
              onClick={logout}
              variant="ghost"
            >
              <LogOut aria-hidden="true" size={17} />
              Sign out
            </AdminButton>
          </div>
        </aside>
        <main className="min-w-0 flex-1 pt-20 lg:pl-72">
          <header className="admin-topbar fixed left-0 right-0 top-0 z-30 flex h-20 items-center justify-between border-b px-5 backdrop-blur-xl sm:px-8 lg:left-72 lg:px-10">
            <div className="flex items-center gap-3">
              <button
                aria-label="Open navigation"
                onClick={() => setMobileOpen(true)}
                className="text-[#aab4c8] lg:hidden"
              >
                <Menu size={22} />
              </button>
              <span className="admin-topbar-prefix hidden sm:inline">
                VELTRIX /
              </span>
              <span className="admin-topbar-current">
                {pathname === "/"
                  ? "Overview"
                  : (nav.find(
                      (item) =>
                        item.href !== "/" && pathname.startsWith(item.href),
                    )?.label ?? "Admin")}
              </span>
            </div>
            <div className="flex items-center gap-3 sm:gap-6">
              <div className="flex items-center gap-3">
                <AdminThemeMenu />
                <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#83f5c5] to-[#3b8c78] text-sm font-bold text-[#09120f]">
                  {(user.profile?.displayName ?? user.email)
                    .slice(0, 1)
                    .toUpperCase()}
                </div>
                <div className="hidden leading-tight sm:block">
                  <div className="text-xs font-semibold text-[#edf3fd]">
                    {user.profile?.displayName ?? user.email.split("@")[0]}
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-wider text-[#83f5c5]">
                    {user.role.replace("_", " ")}
                  </div>
                </div>
              </div>
            </div>
          </header>
          <div className="mx-auto max-w-[1600px] p-5 sm:p-8 lg:p-10">
            {children}
          </div>
        </main>
      </div>
    </AdminContext.Provider>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#83f5c5]">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="admin-page-description mt-3">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`admin-panel rounded-2xl border ${className}`}>
      {children}
    </section>
  );
}
export function StatusPill({ value }: { value: string }) {
  const tone =
    value === "ACTIVE" || value === "COMPLETED"
      ? "admin-status--success"
      : value === "DISABLED" || value === "INACTIVE" || value === "ABANDONED"
        ? "admin-status--danger"
        : "admin-status--warning";
  return <span className={`admin-status ${tone}`}>{value}</span>;
}
export function EmptyState({
  children = "No records found.",
}: {
  children?: React.ReactNode;
}) {
  return <div className="admin-empty-state">{children}</div>;
}
export function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
}
export function formatVc(value: number) {
  const sign = value < 0 ? "-" : "";
  return `${sign}€${new Intl.NumberFormat("en-US").format(Math.abs(value))}`;
}
