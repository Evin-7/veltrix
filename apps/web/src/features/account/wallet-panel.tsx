"use client";

import { ArrowRight, CalendarClock, Check, Gift, LoaderCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { WalletSummary, WalletTransactionView } from "@/server/wallet/service";

type DailyStatus = { amount: number; claimed: boolean; available: boolean; nextEligibleAt: string };
type WalletPanelProps = { initialWallet: WalletSummary; initialDailyStatus: DailyStatus; initialTransactions: WalletTransactionView[] };

function formatAmount(amount: number) {
  return `${amount > 0 ? "+" : ""}${amount.toLocaleString("en-US")} VC`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function WalletPanel({ initialWallet, initialDailyStatus, initialTransactions }: WalletPanelProps) {
  const [wallet, setWallet] = useState(initialWallet);
  const [dailyStatus, setDailyStatus] = useState(initialDailyStatus);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [isClaiming, setIsClaiming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function claimReward() {
    if (!dailyStatus.available || isClaiming) return;
    setErrorMessage(null);
    setIsClaiming(true);
    try {
      const response = await fetch("/api/v1/rewards/daily", { method: "POST" });
      if (!response.ok) {
        setErrorMessage("The daily reward could not be claimed right now.");
        return;
      }
      const [walletResponse, transactionResponse, statusResponse] = await Promise.all([
        fetch("/api/v1/wallet"),
        fetch("/api/v1/wallet/transactions?page=1&pageSize=4"),
        fetch("/api/v1/rewards/daily"),
      ]);
      const walletPayload = (await walletResponse.json()) as { data: WalletSummary };
      const transactionPayload = (await transactionResponse.json()) as { data: WalletTransactionView[] };
      const statusPayload = (await statusResponse.json()) as { data: DailyStatus };
      setWallet(walletPayload.data);
      setTransactions(transactionPayload.data);
      setDailyStatus(statusPayload.data);
    } catch {
      setErrorMessage("The service is unavailable right now. Please try again.");
    } finally {
      setIsClaiming(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="surface relative overflow-hidden rounded-[28px] p-6 sm:p-8">
        <div aria-hidden="true" className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-mint/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Veltrix balance</p><p className="mt-5 text-5xl font-semibold tracking-[-0.06em] text-ink sm:text-6xl">{wallet.balance.toLocaleString("en-US")}</p><p className="mt-2 text-sm font-semibold text-amber-bright">VC <span className="font-normal text-muted">· fictional demo credits</span></p></div><span className="grid h-11 w-11 place-items-center rounded-2xl border border-amber/25 bg-amber/10 text-amber"><Sparkles size={19} /></span></div>
          <p className="mt-9 max-w-md text-xs leading-5 text-muted">Veltrix Credits are fictional demo credits with no monetary value. They cannot be purchased, transferred, redeemed, or withdrawn.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2"><div className="surface-subtle rounded-2xl p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-muted">Balance mode</p><p className="mt-2 text-sm font-semibold text-ink">Virtual only</p></div><div className="surface-subtle rounded-2xl p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-muted">Ledger</p><p className="mt-2 text-sm font-semibold text-ink">Append-only</p></div></div>
        </div>
      </section>

      <section className="surface-subtle rounded-[28px] p-6 sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Daily demo reward</p><h2 className="display mt-3 text-3xl text-ink">A little extra rhythm.</h2></div><span className="grid h-10 w-10 place-items-center rounded-xl border border-mint/20 bg-mint/10 text-mint"><Gift size={17} /></span></div><p className="mt-4 max-w-sm text-sm leading-6 text-muted">Claim {dailyStatus.amount.toLocaleString("en-US")} VC once per UTC calendar day. There are no wagers attached.</p><Button className="mt-7 w-full sm:w-auto" disabled={!dailyStatus.available || isClaiming} onClick={claimReward} size="lg" variant="primary">{isClaiming ? <><LoaderCircle className="animate-spin" size={16} /> Claiming…</> : dailyStatus.claimed ? <><Check size={16} /> Claimed today</> : <>Claim {dailyStatus.amount.toLocaleString("en-US")} VC</>}</Button><div className="mt-5 flex items-center gap-2 text-xs font-semibold text-muted"><CalendarClock size={14} className="text-amber" />{dailyStatus.claimed ? `Next claim ${formatDate(dailyStatus.nextEligibleAt)}` : "Available now"}</div>{errorMessage ? <p aria-live="polite" className="mt-4 rounded-xl border border-[#ff9bbb]/25 bg-[#ff9bbb]/10 px-3 py-2.5 text-xs font-semibold text-[#ffb1c9]">{errorMessage}</p> : null}</section>

      <section className="surface-subtle rounded-[28px] p-6 sm:p-8 lg:col-span-2"><div className="flex items-end justify-between gap-4"><div><p className="eyebrow">Latest movement</p><h2 className="display mt-3 text-3xl text-ink">Recent transactions</h2></div><Link className="focus-ring inline-flex items-center gap-1 rounded-full px-2 py-2 text-xs font-semibold text-muted-strong hover:text-amber-bright" href="/transactions">See all <ArrowRight size={13} /></Link></div><div className="mt-6 grid gap-2">{transactions.length > 0 ? transactions.map((transaction, index) => <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3" key={`${transaction.createdAt}-${index}`}><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{transaction.type === "WELCOME_BONUS" ? "Welcome reward" : transaction.type === "DAILY_REWARD" ? "Daily reward" : transaction.type === "GAME_WAGER" ? "Demo game session" : transaction.type === "GAME_WIN" ? "Demo game win" : "Account adjustment"}</p><p className="mt-1 text-xs text-muted">{formatDate(transaction.createdAt)} · Balance {transaction.balanceAfter.toLocaleString("en-US")} VC</p></div><span className={transaction.amount >= 0 ? "shrink-0 text-sm font-semibold text-mint" : "shrink-0 text-sm font-semibold text-[#ffb1c9]"}>{formatAmount(transaction.amount)}</span></div>) : <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-muted">Your wallet activity will appear here.</p>}</div></section>
    </div>
  );
}
