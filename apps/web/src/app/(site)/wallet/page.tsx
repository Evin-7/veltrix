import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountNav } from "@/features/account/account-nav";
import { WalletPanel } from "@/features/account/wallet-panel";
import { PageHeader } from "@/components/ui/layout-primitives";
import { getCurrentUser } from "@/server/auth/session";
import {
  getDailyRewardStatus,
  getWalletSummary,
  listWalletTransactions,
} from "@/server/wallet/service";

export const metadata: Metadata = { title: "Wallet" };
export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/wallet");
  if (user.role !== "PLAYER") redirect("/profile");
  const [wallet, dailyStatus, transactionResult] = await Promise.all([
    getWalletSummary(user.id),
    getDailyRewardStatus(user.id),
    listWalletTransactions(user.id, { page: 1, pageSize: 4 }),
  ]);
  return (
    <main className="page-shell player-page">
      <PageHeader
        description="A clear view of your Veltrix Credits, daily rhythm and transaction history."
        eyebrow="Your Veltrix wallet"
        title="Wallet"
      />
      <div className="mt-8 max-w-4xl">
        <AccountNav />
      </div>
      <section className="player-section">
        <WalletPanel
          initialDailyStatus={dailyStatus}
          initialTransactions={transactionResult.transactions}
          initialWallet={wallet}
        />
      </section>
    </main>
  );
}
