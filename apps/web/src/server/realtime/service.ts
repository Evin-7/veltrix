import "server-only";

import { getPrisma } from "@/server/db/prisma";
import { getUnreadNotificationCount } from "@/server/notifications/service";

export async function getRealtimeSnapshot(userId: string) {
  const prisma = getPrisma();
  const [wallet, unread, activeSession] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId }, select: { balance: true } }),
    getUnreadNotificationCount(userId),
    prisma.gameSession.findFirst({ where: { userId, status: "ACTIVE" }, orderBy: { startedAt: "asc" }, select: { id: true, game: { select: { slug: true, name: true } }, startedAt: true } }),
  ]);

  return {
    walletBalance: wallet?.balance ?? 0,
    unreadNotifications: unread,
    activeSession: activeSession ? { id: activeSession.id, gameSlug: activeSession.game.slug, gameName: activeSession.game.name, startedAt: activeSession.startedAt.toISOString() } : null,
    emittedAt: new Date().toISOString(),
  };
}
