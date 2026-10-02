"use client";

import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { useState } from "react";
import type {
  WalletTransactionTypeValue,
  WalletTransactionView,
} from "@/server/wallet/service";

type TransactionsTableProps = {
  initialTransactions: WalletTransactionView[];
  initialMeta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
const filterOptions: Array<{
  label: string;
  value: "" | WalletTransactionTypeValue;
}> = [
  { label: "All movement", value: "" },
  { label: "Welcome rewards", value: "WELCOME_BONUS" },
  { label: "Daily rewards", value: "DAILY_REWARD" },
  { label: "Game wagers", value: "GAME_WAGER" },
  { label: "Game wins", value: "GAME_WIN" },
  { label: "Adjustments", value: "ADMIN_ADJUSTMENT" },
];

function labelFor(type: WalletTransactionTypeValue) {
  return type === "WELCOME_BONUS"
    ? "Welcome reward"
    : type === "DAILY_REWARD"
      ? "Daily reward"
      : type === "GAME_WAGER"
        ? "Game wager"
        : type === "GAME_WIN"
          ? "Game win"
          : "Account adjustment";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function TransactionsTable({
  initialTransactions,
  initialMeta,
}: TransactionsTableProps) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [meta, setMeta] = useState(initialMeta);
  const [type, setType] = useState<"" | WalletTransactionTypeValue>("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function load(nextPage: number, nextType = type) {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(meta.pageSize),
      });
      if (nextType) params.set("type", nextType);
      const response = await fetch(`/api/v1/wallet/transactions?${params}`);
      const payload = (await response.json()) as {
        data?: WalletTransactionView[];
        meta?: typeof initialMeta;
        error?: { message?: string };
      };
      if (!response.ok || !payload.data || !payload.meta) {
        setErrorMessage(
          payload.error?.message ?? "We could not load transactions.",
        );
        return;
      }
      setTransactions(payload.data);
      setMeta(payload.meta);
    } catch {
      setErrorMessage(
        "The service is unavailable right now. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function changeType(nextType: "" | WalletTransactionTypeValue) {
    setType(nextType);
    void load(1, nextType);
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="block max-w-xs flex-1">
          <span className="sr-only">Filter transactions</span>
          <select
            className="focus-ring h-11 w-full rounded-[var(--radius-control)] border border-border bg-surface-hover/60 px-3 text-sm text-muted-strong outline-none hover:border-border-strong"
            onChange={(event) =>
              changeType(event.target.value as "" | WalletTransactionTypeValue)
            }
            value={type}
          >
            {filterOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs font-semibold text-muted">
          {meta.total.toLocaleString("en-US")} entries
        </p>
      </div>
      {errorMessage ? (
        <p
          aria-live="polite"
          className="mt-5 text-xs font-semibold text-danger"
        >
          {errorMessage}
        </p>
      ) : null}
      <div className="relative mt-5 border-y border-border">
        {isLoading ? (
          <div className="absolute inset-0 z-10 grid place-items-center bg-surface/80 backdrop-blur-sm">
            <LoaderCircle className="animate-spin text-amber" size={20} />
          </div>
        ) : null}
        <div className="hidden grid-cols-[1.4fr_1fr_0.8fr] gap-4 border-b border-border px-1 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted sm:grid">
          <span>Movement</span>
          <span>Date</span>
          <span className="text-right">Amount</span>
        </div>
        {transactions.length > 0 ? (
          transactions.map((transaction, index) => (
            <div
              className="grid gap-2 border-b border-border px-1 py-4 last:border-0 sm:grid-cols-[1.4fr_1fr_0.8fr] sm:items-center sm:gap-4"
              key={`${transaction.createdAt}-${index}`}
            >
              <div>
                <p className="text-sm font-semibold text-ink">
                  {labelFor(transaction.type)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Balance after{" "}
                  {transaction.balanceAfter.toLocaleString("en-US")} VC
                </p>
              </div>
              <p className="text-xs text-muted">
                {formatDate(transaction.createdAt)}
              </p>
              <p
                className={
                  transaction.amount >= 0
                    ? "text-sm font-semibold text-mint sm:text-right"
                    : "text-sm font-semibold text-danger sm:text-right"
                }
              >
                {transaction.amount > 0 ? "+" : ""}
                {transaction.amount.toLocaleString("en-US")} VC
              </p>
            </div>
          ))
        ) : (
          <div className="py-10 text-center">
            <p className="text-sm font-semibold text-ink">
              No transactions in this view.
            </p>
            <p className="mt-2 text-xs text-muted">
              Try another filter or return after your next game.
            </p>
          </div>
        )}
      </div>
      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs text-muted">
          Page {meta.page} of {Math.max(meta.totalPages, 1)}
        </p>
        <div className="flex gap-2">
          <button
            aria-label="Previous page"
            className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-hover/60 text-muted-strong disabled:opacity-40"
            disabled={isLoading || meta.page <= 1}
            onClick={() => void load(meta.page - 1)}
            type="button"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            aria-label="Next page"
            className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-hover/60 text-muted-strong disabled:opacity-40"
            disabled={isLoading || meta.page >= meta.totalPages}
            onClick={() => void load(meta.page + 1)}
            type="button"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
