"use client";

import {
  CalendarClock,
  LoaderCircle,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionHeader, Stat } from "@/components/ui/layout-primitives";
import { useToast } from "@/components/ui/toast";
import { requestJson } from "@/lib/api-client";
import { errorMessage as safeErrorMessage } from "@/lib/app-error";
import { formatCurrency } from "@/lib/currency";
import { emitWalletUpdate } from "@/lib/wallet-sync";
import type {
  WalletSummary,
  WalletTransactionView,
} from "@/server/wallet/service";

type DailyStatus = {
  amount: number;
  claimed: boolean;
  available: boolean;
  nextEligibleAt: string;
};
type WalletPanelProps = {
  initialWallet: WalletSummary;
  initialDailyStatus: DailyStatus;
  initialTransactions: WalletTransactionView[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function transactionLabel(type: WalletTransactionView["type"]) {
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

export function WalletPanel({
  initialWallet,
  initialDailyStatus,
  initialTransactions,
}: WalletPanelProps) {
  const [wallet, setWallet] = useState(initialWallet);
  const [dailyStatus, setDailyStatus] = useState(initialDailyStatus);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [isClaiming, setIsClaiming] = useState(false);
  const { showToast } = useToast();

  async function claimReward() {
    if (!dailyStatus.available || isClaiming) return;
    setIsClaiming(true);
    try {
      const reward = await requestJson<DailyStatus & { balance: number }>("/api/v1/rewards/daily", { method: "POST" });
      setWallet((current) => ({ ...current, balance: reward.balance }));
      setDailyStatus({ amount: reward.amount, claimed: reward.claimed, available: false, nextEligibleAt: reward.nextEligibleAt });
      emitWalletUpdate(reward.balance);
      showToast("Daily reward claimed", "success");
      try {
        setTransactions(await requestJson<WalletTransactionView[]>("/api/v1/wallet/transactions?page=1&pageSize=4"));
      } catch {
        showToast("Reward claimed, but recent activity could not refresh.", "error");
      }
    } catch (error) {
      const message = safeErrorMessage(error, "NETWORK_ERROR");
      showToast(message, "error");
    } finally {
      setIsClaiming(false);
    }
  }

  return (
    <div>
      <section className="wallet-balance-focus">
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Available balance</p>
              <p className="mt-5 text-5xl font-semibold tracking-[-0.06em] text-ink sm:text-6xl">
                {formatCurrency(wallet.balance)}
              </p>
              <p className="mt-2 text-sm font-semibold text-amber-bright">
                Virtual play balance
              </p>
            </div>
          </div>
          <p className="mt-9 max-w-md text-xs leading-5 text-muted">
            Your balance is ready whenever you are. Recent movement and your
            daily reward live below.
          </p>
        </div>
      </section>
      <section className="mt-14">
        <SectionHeader
          eyebrow="Daily reward"
          title="A little extra rhythm"
          description={`Claim ${formatCurrency(dailyStatus.amount)} once per UTC calendar day. There are no wagers attached.`}
        />
        <div className="border-y border-border py-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted">
              <CalendarClock size={14} className="text-amber" />
              {dailyStatus.claimed
                ? `Next claim ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(dailyStatus.nextEligibleAt))}`
                : "Available now"}
            </div>
            <Button
              disabled={!dailyStatus.available || isClaiming}
              onClick={claimReward}
              size="lg"
              variant="primary"
            >
              {isClaiming ? (
                <>
                  <LoaderCircle className="animate-spin" size={16} /> Claiming…
                </>
              ) : dailyStatus.claimed ? (
                <>Claimed today</>
              ) : (
                <>Claim {formatCurrency(dailyStatus.amount)}</>
              )}
            </Button>
          </div>
        </div>
      </section>
      <section className="mt-14">
        <SectionHeader
          eyebrow="Latest movement"
          title="Recent activity"
          href="/transactions"
          actionLabel="See all"
        />
        <div className="border-y border-border">
          {transactions.length > 0 ? (
            transactions.map((transaction, index) => (
              <div
                className="flex items-center justify-between gap-4 border-b border-border py-4 last:border-b-0"
                key={`${transaction.createdAt}-${index}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {transactionLabel(transaction.type)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {formatDate(transaction.createdAt)} · Balance{" "}
                    {formatCurrency(transaction.balanceAfter)}
                  </p>
                </div>
                <span
                  className={
                    transaction.amount >= 0
                      ? "shrink-0 text-sm font-semibold text-mint"
                      : "shrink-0 text-sm font-semibold text-danger"
                  }
                >
                  {formatCurrency(transaction.amount, { sign: "always" })}
                </span>
              </div>
            ))
          ) : (
            <p className="py-10 text-center text-sm text-muted">
              Your wallet activity will appear here.
            </p>
          )}
        </div>
      </section>
      <div className="mt-8 grid gap-6 border-t border-border pt-6 sm:grid-cols-2">
        <Stat
          label="Currency"
          value="€"
          detail="Virtual play balance for Veltrix."
        />
        <Stat
          label="Ledger"
          value="History"
          detail="Every balance change is recorded."
        />
      </div>
    </div>
  );
}
