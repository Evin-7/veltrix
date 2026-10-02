import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RewardsPanel } from "@/features/product/product-panels";
import { getCurrentUser } from "@/server/auth/session";
import { getRewardOverview } from "@/server/rewards/service";

export const metadata: Metadata = { title: "Rewards" };
export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/rewards");
  if (user.role !== "PLAYER") redirect("/profile");
  return <main className="page-shell pb-20 pt-10 sm:pt-16"><div className="max-w-2xl"><p className="eyebrow">Progression, made clear</p><h1 className="display mt-4 text-5xl leading-none text-ink sm:text-6xl">Rewards</h1><p className="mt-4 text-sm leading-6 text-muted">Earn XP from completed demo rounds and unlock a transparent VIP ladder. XP and VC are separate systems.</p></div><section className="mt-9"><RewardsPanel initial={await getRewardOverview(user.id)} /></section></main>;
}
