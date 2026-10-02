import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import { getPrisma } from "@/server/db/prisma";
import { notFound } from "@/server/http/errors";
import type { AuditListInput } from "./schemas";

export type AuditDbClient = Prisma.TransactionClient | PrismaClient;

export async function writeAuditLog(tx: AuditDbClient, input: {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId?: string;
  idempotencyKey?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return tx.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata,
    },
  });
}

export async function listAuditLogs(input: AuditListInput) {
  const where: Prisma.AuditLogWhereInput = {};
  if (input.action) where.action = input.action;
  if (input.targetType) where.targetType = input.targetType;
  if (input.from || input.to) where.createdAt = { ...(input.from ? { gte: input.from } : {}), ...(input.to ? { lte: input.to } : {}) };
  if (input.actor) {
    where.actor = { OR: [{ email: { contains: input.actor, mode: "insensitive" } }, { profile: { username: { contains: input.actor, mode: "insensitive" } } }] };
  }
  const prisma = getPrisma();
  const [records, total] = await prisma.$transaction([
    prisma.auditLog.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (input.page - 1) * input.pageSize, take: input.pageSize, include: { actor: { select: { email: true, profile: { select: { username: true } } } } } }),
    prisma.auditLog.count({ where }),
  ]);
  return {
    logs: records.map((record) => ({ id: record.id, action: record.action, targetType: record.targetType, targetId: record.targetId, metadata: record.metadata, createdAt: record.createdAt.toISOString(), actor: { email: record.actor.email, username: record.actor.profile?.username ?? null } })),
    meta: { page: input.page, pageSize: input.pageSize, total, totalPages: Math.ceil(total / input.pageSize) },
  };
}

export async function getAuditLog(id: string) {
  const record = await getPrisma().auditLog.findUnique({ where: { id }, include: { actor: { select: { email: true, profile: { select: { username: true } } } } } });
  if (!record) throw notFound("Audit log not found.");
  return { id: record.id, action: record.action, targetType: record.targetType, targetId: record.targetId, metadata: record.metadata, createdAt: record.createdAt.toISOString(), actor: { email: record.actor.email, username: record.actor.profile?.username ?? null } };
}
