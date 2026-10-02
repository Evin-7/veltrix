import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/layout-primitives";
import { ResponsibleGamingPanel } from "@/features/product/product-panels";
import { getCurrentUser } from "@/server/auth/session";
import {
  getResponsibleGamingSettings,
  getResponsibleGamingStatus,
} from "@/server/responsible-gaming/service";

export const metadata: Metadata = { title: "Responsible gaming" };
export const dynamic = "force-dynamic";

export default async function ResponsibleGamingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/responsible-gaming");
  if (user.role !== "PLAYER") redirect("/profile");
  const [settings, status] = await Promise.all([
    getResponsibleGamingSettings(user.id),
    getResponsibleGamingStatus(user.id),
  ]);
  return (
    <main className="page-shell player-page">
      <PageHeader
        description="Set limits, manage session reminders and take a break whenever you need."
        eyebrow="Your controls"
        title="Responsible gaming"
      />
      <section className="player-section">
        <ResponsibleGamingPanel
          initialSettings={settings}
          initialStatus={status}
        />
      </section>
    </main>
  );
}
