import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PromotionsPanel } from "@/features/product/product-panels";
import { getCurrentUser } from "@/server/auth/session";
import { listEligiblePromotions } from "@/server/promotions/service";

export const metadata: Metadata = { title: "Promotions" };
export const dynamic = "force-dynamic";

export default async function PromotionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/promotions");
  if (user.role !== "PLAYER") redirect("/profile");
  return <main className="page-shell pb-20 pt-10 sm:pt-16"><div className="max-w-2xl"><p className="eyebrow">Available to you</p><h1 className="display mt-4 text-5xl leading-none text-ink sm:text-6xl">Promotions</h1><p className="mt-4 text-sm leading-6 text-muted">Server-verified fictional-credit rewards. Each promotion can be claimed once, even if you retry.</p></div><section className="mt-9"><PromotionsPanel initialPromotions={await listEligiblePromotions(user.id)} /></section></main>;
}
