"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { AdminButton, AdminSearchInput } from "@/components/admin-form";
import {
  AdminShell,
  EmptyState,
  PageIntro,
  Panel,
  StatusPill,
  formatDate,
  formatVc,
} from "@/components/admin-shell";
import { apiFetch, type ApiMeta } from "@/lib/api";

type Session = {
  id: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  totalWagered: number;
  totalWon: number;
  roundCount: number;
  createdAt: string;
  user: { email: string; username: string | null };
  game: { name: string; slug: string };
};

function SessionsContent() {
  const [records, setRecords] = useState<Session[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [requestVersion, setRequestVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (submittedSearch) query.set("search", submittedSearch);
    setIsLoading(true);
    setRecords([]);
    setMeta(null);
    setHasLoaded(false);
    void apiFetch<Session[]>(`/api/v1/admin/sessions?${query}`)
      .then((result) => {
        if (!active) return;
        setRecords(result.data);
        setMeta(result.meta ?? null);
        setHasLoaded(true);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, requestVersion, submittedSearch]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedSearch(search.trim());
    setPage(1);
    setRequestVersion((version) => version + 1);
  }

  return (
    <>
      <PageIntro
        eyebrow="Gameplay observability"
        title="Game sessions"
        description="Read-only session and round history for support, analytics, and incident review. Settlement remains exclusively server-authoritative."
      />
      <Panel className="mb-6 p-4">
        <form
          onSubmit={submitSearch}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <AdminSearchInput
            aria-label="Search game sessions"
            autoComplete="off"
            className="flex-1"
            label="Search game sessions"
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Search by player, game, or session"
            value={search}
          />
          <AdminButton className="sm:min-w-28" type="submit">
            Search
          </AdminButton>
        </form>
      </Panel>
      <Panel className="overflow-hidden">
        <div aria-busy={isLoading} className="admin-table-scroll">
          <table className="admin-table admin-table--dense min-w-[920px]">
            <thead>
              <tr>
                <th>Session / game</th>
                <th>Player</th>
                <th>Status</th>
                <th>Rounds</th>
                <th>Wagered</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>
                    <Link
                      href={`/game-sessions/${record.id}`}
                      className="text-xs font-semibold text-[var(--admin-text)] hover:text-[var(--admin-accent)]"
                    >
                      {record.game.name}
                    </Link>
                    <div className="mt-1 text-[10px] text-[var(--admin-muted)]">
                      {record.id.slice(0, 8)} · {record.game.slug}
                    </div>
                  </td>
                  <td>
                    <div className="text-xs">{record.user.username ?? "—"}</div>
                    <div className="mt-1 text-[10px] text-[var(--admin-muted)]">
                      {record.user.email}
                    </div>
                  </td>
                  <td>
                    <StatusPill value={record.status} />
                  </td>
                  <td className="text-sm">{record.roundCount}</td>
                  <td className="text-sm">{formatVc(record.totalWagered)}</td>
                  <td className="text-xs text-[var(--admin-muted)]">
                    {formatDate(record.startedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {isLoading && (
            <div aria-live="polite" className="admin-empty-state" role="status">
              Loading sessions…
            </div>
          )}
          {!isLoading && hasLoaded && !records.length && (
            <EmptyState>No sessions match those filters.</EmptyState>
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-[var(--admin-border)] px-5 py-4 text-xs text-[var(--admin-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span aria-live="polite">
            {meta
              ? `Page ${meta.page} of ${Math.max(1, meta.totalPages)} · ${meta.total} sessions`
              : isLoading
                ? "Loading sessions…"
                : ""}
          </span>
          <div className="flex gap-2">
            <AdminButton
              aria-label="Previous sessions page"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((value) => value - 1)}
              size="sm"
              variant="secondary"
            >
              Previous
            </AdminButton>
            <AdminButton
              aria-label="Next sessions page"
              disabled={!meta || page >= meta.totalPages || isLoading}
              onClick={() => setPage((value) => value + 1)}
              size="sm"
              variant="secondary"
            >
              Next
            </AdminButton>
          </div>
        </div>
      </Panel>
    </>
  );
}

export default function SessionsPage() {
  return (
    <AdminShell>
      <SessionsContent />
    </AdminShell>
  );
}
