import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountNav } from "@/features/account/account-nav";
import { WalletPanel } from "@/features/account/wallet-panel";
import { getCurrentUser } from "@/server/auth/session";
import { getDailyRewardStatus, getWalletSummary, listWalletTransactions } from "@/server/wallet/service";

export const metadata: Metadata = { title: "Wallet" };
export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/wallet");
  if (user.role !== "PLAYER") redirect("/profile");
  const [wallet, dailyStatus, transactionResult] = await Promise.all([getWalletSummary(user.id), getDailyRewardStatus(user.id), listWalletTransactions(user.id, { page: 1, pageSize: 4 })]);
  return <main className="page-shell pb-20 pt-10 sm:pt-16"><div className="max-w-3xl"><p className="eyebrow">The fictional side of the house</p><h1 className="display mt-4 text-5xl leading-none text-ink sm:text-6xl">Wallet</h1><p className="mt-4 max-w-xl text-sm leading-6 text-muted">A clear view of your Veltrix Credits, daily rhythm, and append-only demo ledger.</p></div><div className="mt-8 max-w-4xl"><AccountNav /></div><section className="mt-6"><WalletPanel initialDailyStatus={dailyStatus} initialTransactions={transactionResult.transactions} initialWallet={wallet} /></section><p className="mt-6 text-center text-xs text-muted">Need to find a new ritual? <Link className="font-semibold text-amber-bright hover:text-ink" href="/casino">Return to the lobby</Link>.</p></main>;
}
