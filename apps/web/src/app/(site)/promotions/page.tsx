import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/layout-primitives";
import { PromotionsPanel } from "@/features/product/product-panels";
import { getCurrentUser } from "@/server/auth/session";
import { listEligiblePromotions } from "@/server/promotions/service";

export const metadata: Metadata = { title: "Promotions" };
export const dynamic = "force-dynamic";

export default async function PromotionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/promotions");
  if (user.role !== "PLAYER") redirect("/profile");
  return (
    <main className="page-shell player-page">
      <PageHeader
        description="Rewards selected for your account. Each promotion can be claimed once, even if you retry."
        eyebrow="Available to you"
        title="Promotions"
      />
      <section className="player-section">
        <PromotionsPanel
          initialPromotions={await listEligiblePromotions(user.id)}
        />
      </section>
    </main>
  );
}
