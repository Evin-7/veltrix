import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResponsibleGamingPanel } from "@/features/product/product-panels";
import { getCurrentUser } from "@/server/auth/session";
import { getResponsibleGamingSettings, getResponsibleGamingStatus } from "@/server/responsible-gaming/service";

export const metadata: Metadata = { title: "Responsible gaming" };
export const dynamic = "force-dynamic";

export default async function ResponsibleGamingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/responsible-gaming");
  if (user.role !== "PLAYER") redirect("/profile");
  const [settings, status] = await Promise.all([getResponsibleGamingSettings(user.id), getResponsibleGamingStatus(user.id)]);
  return <main className="page-shell pb-20 pt-10 sm:pt-16"><div className="max-w-2xl"><p className="eyebrow">Your controls</p><h1 className="display mt-4 text-5xl leading-none text-ink sm:text-6xl">Responsible gaming</h1><p className="mt-4 text-sm leading-6 text-muted">A calm, server-enforced set of controls for this fictional-credit demo. There is no cash play, deposit, or withdrawal.</p></div><section className="mt-9"><ResponsibleGamingPanel initialSettings={settings} initialStatus={status} /></section></main>;
}
