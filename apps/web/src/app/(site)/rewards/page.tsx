import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/layout-primitives";
import { RewardsPanel } from "@/features/product/product-panels";
import { getCurrentUser } from "@/server/auth/session";
import { getRewardOverview } from "@/server/rewards/service";

export const metadata: Metadata = { title: "Rewards" };
export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/rewards");
  if (user.role !== "PLAYER") redirect("/profile");
  return (
    <main className="page-shell player-page">
      <PageHeader
        description="Earn XP from completed rounds and unlock a transparent VIP ladder. XP and your balance are separate systems."
        eyebrow="Progression, made clear"
        title="Rewards"
      />
      <section className="player-section">
        <RewardsPanel initial={await getRewardOverview(user.id)} />
      </section>
    </main>
  );
}
