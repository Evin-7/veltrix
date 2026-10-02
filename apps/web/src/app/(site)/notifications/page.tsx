import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NotificationsPanel } from "@/features/product/product-panels";
import { getCurrentUser } from "@/server/auth/session";
import { listNotifications } from "@/server/notifications/service";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/notifications");
  if (user.role !== "PLAYER") redirect("/profile");
  const result = await listNotifications(user.id, { page: 1, pageSize: 50 });
  return <main className="page-shell pb-20 pt-10 sm:pt-16"><NotificationsPanel initialNotifications={result.notifications} initialUnread={result.unread} /></main>;
}
