import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import { getPrisma } from "@/server/db/prisma";
import { notFound } from "@/server/http/errors";

type NotificationDbClient = Prisma.TransactionClient | PrismaClient;

export async function createNotification(tx: NotificationDbClient, input: { userId: string; type: "REWARD" | "PROMOTION" | "ACCOUNT" | "RESPONSIBLE_GAMING" | "SYSTEM"; title: string; message: string }) {
  return tx.notification.create({ data: input });
}

export async function listNotifications(userId: string, input: { page: number; pageSize: number }) {
  const prisma = getPrisma();
  const where = { userId };
  const [records, total, unread] = await prisma.$transaction([
    prisma.notification.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (input.page - 1) * input.pageSize, take: input.pageSize }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return {
    notifications: records.map((record) => ({ id: record.id, type: record.type, title: record.title, message: record.message, readAt: record.readAt?.toISOString() ?? null, createdAt: record.createdAt.toISOString() })),
    unread,
    meta: { page: input.page, pageSize: input.pageSize, total, totalPages: Math.ceil(total / input.pageSize) },
  };
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const record = await getPrisma().notification.updateMany({ where: { id: notificationId, userId, readAt: null }, data: { readAt: new Date() } });
  if (!record.count) {
    const exists = await getPrisma().notification.findFirst({ where: { id: notificationId, userId }, select: { id: true } });
    if (!exists) throw notFound("Notification not found.");
  }
  return { id: notificationId, read: true };
}

export async function markAllNotificationsRead(userId: string) {
  const result = await getPrisma().notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  return { markedRead: result.count };
}

export async function getUnreadNotificationCount(userId: string) {
  return getPrisma().notification.count({ where: { userId, readAt: null } });
}
