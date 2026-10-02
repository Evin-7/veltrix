"use client";

import { VeltrixSelect } from "@/components/ui/veltrix-select";
import { formatCurrency } from "@/lib/currency";

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
