"use client";

import { RefreshCw, Volume2, VolumeX } from "lucide-react";
import { useState } from "react";
import { VeltrixSelect } from "@/components/ui/veltrix-select";
import { errorMessage } from "@/lib/app-error";
import { formatCurrency } from "@/lib/currency";
import { emitWalletUpdate } from "@/lib/wallet-sync";
import { readAuthoritativeWalletBalance } from "./gameplay-wallet";
import { useGameAudio } from "./game-audio";

export const wagers = [10, 25, 50, 100, 250, 500] as const;
export type Wager = (typeof wagers)[number];
export type HistoryItem = { id: string; label: string; net: number };

export function gameplayIdempotencyKey(scope: string) {
  return `${scope}:${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now()}`;
}

const wagerOptions = wagers.map((wager) => ({
  label: formatCurrency(wager),
  value: String(wager),
}));

export function Header({
  balance,
  gameName,
}: {
  balance: number;
  gameName: string;
}) {
  const { enabled: sound, setEnabled } = useGameAudio();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshedBalance, setRefreshedBalance] = useState<{
    value: number;
    base: number;
  } | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  async function refresh() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      const nextBalance = await readAuthoritativeWalletBalance();
      setRefreshedBalance({ value: nextBalance, base: balance });
      emitWalletUpdate(nextBalance);
    } catch (caught) {
      setRefreshError(errorMessage(caught, "NETWORK_ERROR"));
    } finally {
      setIsRefreshing(false);
    }
  }

  const displayedBalance =
    refreshedBalance?.base === balance ? refreshedBalance.value : balance;

  return (
    <div className="gameplay-table-header flex flex-wrap items-center justify-between gap-4 border-b pb-5">
      <div>
        <p className="eyebrow">{gameName}</p>
        <p className="mt-2 text-sm text-muted">Play with virtual balance</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          aria-pressed={sound}
          aria-label={sound ? "Turn sound off" : "Turn sound on"}
          className="game-audio-control focus-ring inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold hover:text-ink"
          onClick={() => setEnabled((value) => !value)}
          type="button"
        >
          {sound ? <Volume2 size={14} /> : <VolumeX size={14} />}
          <span className="hidden sm:inline">Sound {sound ? "on" : "off"}</span>
        </button>
        <div
          aria-live="polite"
          className="game-balance-badge inline-flex items-center rounded-full border px-3 py-2 text-xs font-bold"
        >
          {formatCurrency(displayedBalance)}
        </div>
        <button
          aria-label="Refresh wallet balance"
          className="game-icon-control focus-ring rounded-full border p-2"
          disabled={isRefreshing}
          onClick={() => void refresh()}
          type="button"
        >
          <RefreshCw
            className={isRefreshing ? "animate-spin" : undefined}
            size={14}
          />
        </button>
      </div>
      {refreshError ? (
        <p
          aria-live="polite"
          className="basis-full text-xs font-semibold text-danger"
        >
          {refreshError}
        </p>
      ) : null}
    </div>
  );
}

export function Wager({
  value,
  onChange,
}: {
  value: Wager;
  onChange: (value: Wager) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="flex justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
        <span>Wager</span>
        <span>€</span>
      </span>
      <VeltrixSelect
        ariaLabel="Wager amount"
        className="w-full"
        onValueChange={(nextWager) => onChange(Number(nextWager) as Wager)}
        options={wagerOptions}
        value={String(value)}
      />
    </label>
  );
}

export function History({ items }: { items: HistoryItem[] }) {
  return (
    <div className="mt-7 border-t border-white/10 pt-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
        Recent rounds
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-5">
        {items.length ? (
          items.map((item) => (
            <div
              className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
              key={item.id}
            >
              <p className="text-xs font-semibold text-ink">{item.label}</p>
              <p
                className={
                  item.net >= 0
                    ? "mt-1 text-xs text-mint"
                    : "mt-1 text-xs text-rose-300"
                }
              >
                {formatCurrency(item.net, { sign: "always" })}
              </p>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted">
            Your settled rounds will appear here.
          </p>
        )}
      </div>
    </div>
  );
}
