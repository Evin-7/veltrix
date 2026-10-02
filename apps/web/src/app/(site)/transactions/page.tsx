import type { Metadata } from "next";
import { redirect } from "next/navigation";
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
  const result = await listWalletTransactions(user.id, { page: 1, pageSize: 10 });
  return <main className="page-shell pb-20 pt-10 sm:pt-16"><div className="max-w-3xl"><p className="eyebrow">A transparent trail</p><h1 className="display mt-4 text-5xl leading-none text-ink sm:text-6xl">Transactions</h1><p className="mt-4 max-w-xl text-sm leading-6 text-muted">Every VC change is recorded as a signed, append-only demo ledger entry.</p></div><div className="mt-8 max-w-4xl"><AccountNav /></div><section className="surface-subtle mt-6 rounded-[28px] p-5 sm:p-8"><TransactionsTable initialMeta={result.meta} initialTransactions={result.transactions} /></section></main>;
}
