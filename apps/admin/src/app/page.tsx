"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  CircleDollarSign,
  Gamepad2,
  RefreshCw,
  Users,
} from "lucide-react";
import { AdminButton } from "@/components/admin-form";
import {
  AdminShell,
  EmptyState,
  PageIntro,
  Panel,
  formatVc,
} from "@/components/admin-shell";
import { apiFetch } from "@/lib/api";

type Dashboard = {
  range: string;
  generatedAt: string;
  kpis: {
    players: number;
    activePlayers: number;
    games: number;
    activeSessions: number;
    sessionsInRange: number;
    wageredVc: number;
    wonVc: number;
    transactionsInRange: number;
  };
  trends: {
    newPlayers: number;
    sessions: number;
    transactions: number;
    points: Array<{ bucket: string; sessions: number; wagers: number }>;
  };
  topGames: Array<{
    gameId: string;
    name?: string;
    slug?: string;
    sessions: number;
    wageredVc: number;
    wonVc: number;
  }>;
};

function DashboardContent() {
  const [range, setRange] = useState<"24h" | "7d" | "30d">("7d");
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadFailed(false);
    apiFetch<Dashboard>(`/api/v1/admin/dashboard?range=${range}`)
      .then((result) => {
        if (active) setData(result.data);
      })
      .catch(() => {
        // apiFetch reports operation errors through the shared admin toast.
        if (active) setLoadFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [range]);

  async function refresh() {
    const hadData = Boolean(data);
    setRefreshing(true);
    setLoadFailed(false);
    if (!hadData) setLoading(true);
    try {
      const result = await apiFetch<Dashboard>(
        `/api/v1/admin/dashboard?range=${range}`,
      );
      setData(result.data);
    } catch {
      // apiFetch reports operation errors through the shared admin toast.
      setLoadFailed(true);
    } finally {
      setRefreshing(false);
      if (!hadData) setLoading(false);
    }
  }

  const cards = data
    ? [
        {
          label: "Total players",
          value: data.kpis.players.toLocaleString(),
          sub: `${data.kpis.activePlayers.toLocaleString()} active`,
          icon: Users,
        },
        {
          label: "Games in catalog",
          value: data.kpis.games.toLocaleString(),
          sub: `${data.kpis.activeSessions} live sessions`,
          icon: Gamepad2,
        },
        {
          label: "Wagered",
          value: formatVc(data.kpis.wageredVc),
          sub: `${data.kpis.sessionsInRange.toLocaleString()} sessions`,
          icon: CircleDollarSign,
        },
        {
          label: "Transactions",
          value: data.kpis.transactionsInRange.toLocaleString(),
          sub: `${formatVc(data.kpis.wonVc)} won`,
          icon: BarChart3,
        },
      ]
    : [];
  const maxWagers = Math.max(
    ...(data?.trends.points ?? []).map((point) => point.wagers),
    1,
  );

  return (
    <>
      <PageIntro
        title="Good morning, operator."
        description="A live view of the Veltrix virtual-credit platform. Every metric is derived from the Neon ledger and gameplay records."
        action={
          <div
            aria-label="Dashboard date range"
            className="admin-segmented-control"
            role="group"
          >
            {(["24h", "7d", "30d"] as const).map((item) => (
              <AdminButton
                aria-pressed={range === item}
                className="admin-range-option"
                key={item}
                onClick={() => setRange(item)}
                size="sm"
                variant={range === item ? "primary" : "ghost"}
              >
                {item}
              </AdminButton>
            ))}
          </div>
        }
      />

      {loading && !data ? (
        <Panel className="p-8">
          <EmptyState>Loading dashboard…</EmptyState>
        </Panel>
      ) : null}
      {!loading && !data && loadFailed ? (
        <Panel className="p-5">
          <div className="flex flex-col items-center gap-3">
            <AdminButton
              loading={refreshing}
              loadingText="Refreshing…"
              onClick={() => void refresh()}
              variant="secondary"
            >
              Try again
            </AdminButton>
          </div>
        </Panel>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Panel key={card.label} className="p-5">
              <div className="flex items-start justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--admin-accent)_12%,var(--admin-panel-soft))] text-[var(--admin-accent)]">
                  <Icon aria-hidden="true" size={18} />
                </div>
                <ArrowUpRight
                  aria-hidden="true"
                  className="text-[var(--admin-muted)]"
                  size={16}
                />
              </div>
              <div className="mt-6 text-2xl font-semibold tracking-tight text-[var(--admin-text-strong)]">
                {card.value}
              </div>
              <div className="mt-1 text-xs font-medium text-[var(--admin-text-soft)]">
                {card.label}
              </div>
              <div className="mt-3 text-[11px] text-[var(--admin-muted)]">{card.sub}</div>
            </Panel>
          );
        })}
      </div>

      {data ? (
        <>
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <Panel className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--admin-text-strong)]">
                    Activity pulse
                  </h2>
                  <p className="mt-1 text-xs text-[var(--admin-muted)]">
                    Daily sessions and virtual credits wagered
                  </p>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-[var(--admin-muted)]">
                  <span className="flex items-center gap-1.5">
                    <i className="h-2 w-2 rounded-full bg-[var(--admin-accent)]" />
                    Sessions
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className="h-2 w-2 rounded-full bg-[#5f74d9]" />
                    Wagered
                  </span>
                </div>
              </div>
              {data.trends.points.length ? (
                <div
                  aria-label="Sessions and wagers over time"
                  className="mt-8 flex h-56 items-end gap-1.5 border-b border-l border-[var(--admin-border)] px-3 pb-0 pt-5 sm:gap-3"
                  role="img"
                >
                  {data.trends.points.map((point) => {
                    const wagerHeight = Math.max(
                      4,
                      (point.wagers / maxWagers) * 100,
                    );
                    return (
                      <div
                        key={point.bucket}
                        className="group flex h-full flex-1 items-end justify-center gap-1"
                      >
                        <div
                          aria-label={`${point.sessions} sessions`}
                          className="w-1.5 rounded-t bg-[color-mix(in_srgb,var(--admin-accent)_70%,transparent)] transition group-hover:bg-[var(--admin-accent)]"
                          style={{
                            height: `${Math.max(5, Math.min(100, point.sessions * 12))}%`,
                          }}
                        />
                        <div
                          aria-label={`${formatVc(point.wagers)} wagered`}
                          className="w-1.5 rounded-t bg-[#5f74d9]/70 transition group-hover:bg-[#788af0]"
                          style={{ height: `${wagerHeight}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState>No activity in this range.</EmptyState>
              )}
              <div className="mt-3 flex justify-between pl-3 text-[10px] text-[var(--admin-muted)]">
                <span>
                  {range === "24h"
                    ? "Yesterday"
                    : range === "7d"
                      ? "7 days ago"
                      : "30 days ago"}
                </span>
                <span>Today</span>
              </div>
            </Panel>

            <Panel className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--admin-text-strong)]">
                    Top games
                  </h2>
                  <p className="mt-1 text-xs text-[var(--admin-muted)]">
                    By session volume in range
                  </p>
                </div>
                <BarChart3
                  aria-hidden="true"
                  className="text-[var(--admin-accent)]"
                  size={17}
                />
              </div>
              <div className="mt-6 space-y-5">
                {data.topGames.map((game, index) => (
                  <div key={game.gameId} className="flex items-center gap-3">
                    <span className="w-4 text-xs text-[var(--admin-muted)]">
                      0{index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-[var(--admin-text-strong)]">
                        {game.name ?? game.slug}
                      </div>
                      <div className="mt-1 text-[10px] text-[var(--admin-muted)]">
                        {game.sessions} sessions · {formatVc(game.wageredVc)}
                      </div>
                    </div>
                    <div
                      aria-hidden="true"
                      className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--admin-border)]"
                    >
                      <div
                        className="h-full rounded-full bg-[var(--admin-accent)]"
                        style={{ width: `${Math.min(100, 100 - index * 17)}%` }}
                      />
                    </div>
                  </div>
                ))}
                {!data.topGames.length ? (
                  <EmptyState>No gameplay activity in this range.</EmptyState>
                ) : null}
              </div>
            </Panel>
          </div>
          <Panel className="mt-6 flex items-center justify-between gap-4 p-5">
            <div>
              <div className="text-sm font-semibold text-[var(--admin-text-strong)]">
                Data freshness
              </div>
              <div className="mt-1 text-xs text-[var(--admin-muted)]">
                Dashboard generated from server-side records{" "}
                {new Date(data.generatedAt).toLocaleTimeString()}.
              </div>
            </div>
            <AdminButton
              loading={refreshing}
              loadingText="Refreshing…"
              onClick={() => void refresh()}
              variant="secondary"
            >
              <RefreshCw aria-hidden="true" size={14} />
              Refresh
            </AdminButton>
          </Panel>
        </>
      ) : null}
    </>
  );
}

export default function DashboardPage() {
  return (
    <AdminShell>
      <DashboardContent />
    </AdminShell>
  );
}
