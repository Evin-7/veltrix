"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AdminButton, AdminSearchInput } from "@/components/admin-form";
import { AdminSelect } from "@/components/admin-select";
import {
  AdminShell,
  EmptyState,
  PageIntro,
  Panel,
  formatDate,
  formatVc,
} from "@/components/admin-shell";
import { apiFetch, type ApiMeta } from "@/lib/api";

type Transaction = {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId: string | null;
  idempotencyKey: string | null;
  metadata: unknown;
  createdAt: string;
  user: { email: string; username: string | null };
};
const transactionTypes = [
  { value: "", label: "All transaction types" },
  { value: "WELCOME_BONUS", label: "Welcome bonus" },
  { value: "DAILY_REWARD", label: "Daily reward" },
  { value: "GAME_WAGER", label: "Game wager" },
  { value: "GAME_WIN", label: "Game win" },
  { value: "ADMIN_ADJUSTMENT", label: "Admin adjustment" },
];

function TransactionsContent() {
  const [records, setRecords] = useState<Transaction[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [requestVersion, setRequestVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (submittedSearch) params.set("search", submittedSearch);
    if (type) params.set("type", type);
    setIsLoading(true);
    setRecords([]);
    setMeta(null);
    setHasLoaded(false);
    void apiFetch<Transaction[]>(`/api/v1/admin/transactions?${params}`)
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
  }, [page, requestVersion, submittedSearch, type]);

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedSearch(search.trim());
    setPage(1);
    setRequestVersion((version) => version + 1);
  }

  return (
    <>
      <PageIntro
        eyebrow="Ledger explorer"
        title="Transactions"
        description="Read-only visibility into the append-only virtual-credit ledger. Use the player detail for authorized balance adjustments."
      />
      <Panel className="mb-6 p-4">
        <form
          onSubmit={submitFilters}
          className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_240px_auto]"
        >
          <AdminSearchInput
            aria-label="Search transactions"
            autoComplete="off"
            className="w-full"
            label="Search transactions"
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Search by player or reference"
            value={search}
          />
          <AdminSelect
            ariaLabel="Transaction type"
            onValueChange={(value) => {
              setType(value);
              setPage(1);
            }}
            options={transactionTypes}
            value={type}
          />
          <AdminButton className="md:min-w-36" type="submit">
            Filter ledger
          </AdminButton>
        </form>
      </Panel>
      <Panel className="overflow-hidden">
        <div aria-busy={isLoading} className="admin-table-scroll">
          <table className="admin-table admin-table--dense min-w-[900px]">
            <thead>
              <tr>
                <th>Player</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Balance after</th>
                <th>Reference</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>
                    <div className="text-xs font-semibold">
                      {record.user.username ?? "—"}
                    </div>
                    <div className="mt-1 text-[10px] text-[var(--admin-muted)]">
                      {record.user.email}
                    </div>
                  </td>
                  <td className="text-[11px] font-semibold">
                    {record.type.replaceAll("_", " ")}
                  </td>
                  <td
                    className={`text-sm font-semibold ${record.amount >= 0 ? "text-[var(--admin-success-text)]" : "text-[var(--admin-danger)]"}`}
                  >
                    {record.amount >= 0 ? "+" : ""}
                    {formatVc(record.amount)}
                  </td>
                  <td className="text-sm">{formatVc(record.balanceAfter)}</td>
                  <td className="max-w-[180px] truncate text-[10px] text-[var(--admin-muted)]">
                    {record.referenceId ?? "—"}
                  </td>
                  <td className="text-xs text-[var(--admin-muted)]">
                    {formatDate(record.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {isLoading && (
            <div aria-live="polite" className="admin-empty-state" role="status">
              Loading transactions…
            </div>
          )}
          {!isLoading && hasLoaded && !records.length && (
            <EmptyState>No ledger entries match those filters.</EmptyState>
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-[var(--admin-border)] px-5 py-4 text-xs text-[var(--admin-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span aria-live="polite">
            {meta
              ? `Page ${meta.page} of ${Math.max(1, meta.totalPages)} · ${meta.total} records`
              : isLoading
                ? "Loading transactions…"
                : ""}
          </span>
          <div className="flex gap-2">
            <AdminButton
              aria-label="Previous transactions page"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((value) => value - 1)}
              size="sm"
              variant="secondary"
            >
              Previous
            </AdminButton>
            <AdminButton
              aria-label="Next transactions page"
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

export default function TransactionsPage() {
  return (
    <AdminShell>
      <TransactionsContent />
    </AdminShell>
  );
}
