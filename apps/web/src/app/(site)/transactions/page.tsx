import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/layout-primitives";
import { AccountNav } from "@/features/account/account-nav";
import { TransactionsTable } from "@/features/account/transactions-table";
import { getCurrentUser } from "@/server/auth/session";
import { listWalletTransactions } from "@/server/wallet/service";

export const metadata: Metadata = { title: "Transactions" };
export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/transactions");
  if (user.role !== "PLAYER") redirect("/profile");
  const result = await listWalletTransactions(user.id, {
    page: 1,
    pageSize: 10,
  });
  return (
    <main className="page-shell player-page">
      <PageHeader
        description="Every balance change is recorded in your transaction history."
        eyebrow="A transparent trail"
        title="Transactions"
      />
      <div className="mt-8 max-w-4xl">
        <AccountNav />
      </div>
      <section className="player-section">
        <TransactionsTable
          initialMeta={result.meta}
          initialTransactions={result.transactions}
        />
      </section>
    </main>
  );
}
