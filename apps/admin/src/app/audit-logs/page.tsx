"use client";

import { useEffect, useState, type FormEvent } from "react";
import { FileClock } from "lucide-react";
import { AdminButton, AdminSearchInput } from "@/components/admin-form";
import {
  AdminShell,
  EmptyState,
  PageIntro,
  Panel,
  formatDate,
} from "@/components/admin-shell";
import { apiFetch, type ApiMeta } from "@/lib/api";

type Log = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: unknown;
  createdAt: string;
  actor: { email: string; username: string | null };
};

function AuditContent() {
  const [logs, setLogs] = useState<Log[]>([]);
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
    if (submittedSearch) query.set("actor", submittedSearch);
    setIsLoading(true);
    setLogs([]);
    setMeta(null);
    setHasLoaded(false);
    void apiFetch<Log[]>(`/api/v1/admin/audit-logs?${query}`)
      .then((result) => {
        if (!active) return;
        setLogs(result.data);
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
        eyebrow="Governance"
        title="Audit logs"
        description="Append-only operational history for access changes, ledger adjustments, catalog management, and future administrative actions."
        action={
          <div
            aria-hidden="true"
            className="grid h-10 w-10 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--admin-accent)_15%,transparent)] text-[var(--admin-accent)]"
          >
            <FileClock size={18} />
          </div>
        }
      />
      <Panel className="mb-6 p-4">
        <form
          onSubmit={submitSearch}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <AdminSearchInput
            aria-label="Filter audit logs by actor"
            autoComplete="off"
            className="flex-1"
            label="Filter audit logs by actor"
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Search by actor email or username"
            value={search}
          />
          <AdminButton className="sm:min-w-32" type="submit">
            Search logs
          </AdminButton>
        </form>
      </Panel>
      <Panel className="overflow-hidden">
        <div aria-busy={isLoading} className="admin-table-scroll">
          <table className="admin-table admin-table--dense min-w-[880px]">
            <thead>
              <tr>
                <th>Action</th>
                <th>Actor</th>
                <th>Target</th>
                <th>Metadata</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <div className="text-xs font-semibold">
                      {log.action.replaceAll("_", " ")}
                    </div>
                    <div className="mt-1 text-[10px] text-[var(--admin-muted)]">
                      {log.id.slice(0, 12)}
                    </div>
                  </td>
                  <td>
                    <div className="text-xs">{log.actor.username ?? "—"}</div>
                    <div className="mt-1 text-[10px] text-[var(--admin-muted)]">
                      {log.actor.email}
                    </div>
                  </td>
                  <td className="text-xs">
                    {log.targetType}
                    {log.targetId ? (
                      <div className="mt-1 max-w-[150px] truncate text-[10px] text-[var(--admin-muted)]">
                        {log.targetId}
                      </div>
                    ) : null}
                  </td>
                  <td className="max-w-[260px] truncate text-[10px] text-[var(--admin-muted)]">
                    {log.metadata ? JSON.stringify(log.metadata) : "—"}
                  </td>
                  <td className="text-xs text-[var(--admin-muted)]">
                    {formatDate(log.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {isLoading && (
            <div aria-live="polite" className="admin-empty-state" role="status">
              Loading audit logs…
            </div>
          )}
          {!isLoading && hasLoaded && !logs.length && (
            <EmptyState>No audit entries found.</EmptyState>
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-[var(--admin-border)] px-5 py-4 text-xs text-[var(--admin-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span aria-live="polite">
            {meta
              ? `Page ${meta.page} of ${Math.max(1, meta.totalPages)} · ${meta.total} events`
              : isLoading
                ? "Loading audit logs…"
                : ""}
          </span>
          <div className="flex gap-2">
            <AdminButton
              aria-label="Previous audit logs page"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((value) => value - 1)}
              size="sm"
              variant="secondary"
            >
              Previous
            </AdminButton>
            <AdminButton
              aria-label="Next audit logs page"
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

export default function AuditLogsPage() {
  return (
    <AdminShell>
      <AuditContent />
    </AdminShell>
  );
}
