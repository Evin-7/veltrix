"use client";

import {
  CalendarClock,
  LoaderCircle,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionHeader, Stat } from "@/components/ui/layout-primitives";
import { useToast } from "@/components/ui/toast";
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

function formatAmount(amount: number) {
  return `${amount > 0 ? "+" : ""}${amount.toLocaleString("en-US")} VC`;
}

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { showToast } = useToast();

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
      const [walletResponse, transactionResponse, statusResponse] =
        await Promise.all([
          fetch("/api/v1/wallet"),
          fetch("/api/v1/wallet/transactions?page=1&pageSize=4"),
          fetch("/api/v1/rewards/daily"),
        ]);
      const walletPayload = (await walletResponse.json()) as {
        data: WalletSummary;
      };
      const transactionPayload = (await transactionResponse.json()) as {
        data: WalletTransactionView[];
      };
      const statusPayload = (await statusResponse.json()) as {
        data: DailyStatus;
      };
      setWallet(walletPayload.data);
      setTransactions(transactionPayload.data);
      setDailyStatus(statusPayload.data);
      showToast("Daily reward claimed", "success");
    } catch {
      setErrorMessage(
        "The service is unavailable right now. Please try again.",
      );
      showToast("Couldn’t claim daily reward", "error");
    } finally {
      setIsClaiming(false);
    }
  }

  return (
    <div>
      <section className="wallet-balance-focus">
        <div
          aria-hidden="true"
          className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-mint/10 blur-3xl"
        />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Available balance</p>
              <p className="mt-5 text-5xl font-semibold tracking-[-0.06em] text-ink sm:text-6xl">
                {wallet.balance.toLocaleString("en-US")}
              </p>
              <p className="mt-2 text-sm font-semibold text-amber-bright">
                Veltrix Credits
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
          description={`Claim ${dailyStatus.amount.toLocaleString("en-US")} VC once per UTC calendar day. There are no wagers attached.`}
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
                <>Claim {dailyStatus.amount.toLocaleString("en-US")} VC</>
              )}
            </Button>
          </div>
          {errorMessage ? (
            <p
              aria-live="polite"
              className="mt-4 text-xs font-semibold text-danger"
            >
              {errorMessage}
            </p>
          ) : null}
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
                    {transaction.balanceAfter.toLocaleString("en-US")} VC
                  </p>
                </div>
                <span
                  className={
                    transaction.amount >= 0
                      ? "shrink-0 text-sm font-semibold text-mint"
                      : "shrink-0 text-sm font-semibold text-danger"
                  }
                >
                  {formatAmount(transaction.amount)}
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
          value="VC"
          detail="Virtual credits for Veltrix play."
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
