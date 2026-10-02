import "server-only";
import { Prisma, type ResponsibleGamingSetting } from "@prisma/client";
import { getPrisma } from "@/server/db/prisma";
import {
  conflict,
  coolOffActive,
  dailyLimitReached,
  maxWagerExceeded,
  selfExcluded,
} from "@/server/http/errors";
import { createNotification } from "@/server/notifications/service";
import { writeAuditLog } from "@/server/admin/audit";
import { lockWallet } from "@/server/wallet/ledger";
import type { ResponsibleSettingsInput } from "./schemas";

function utcDayStart(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

function serializeSettings(settings: ResponsibleGamingSetting) {
  return {
    sessionReminderMinutes: settings.sessionReminderMinutes,
    dailyWagerLimit: settings.dailyWagerLimit,
    maxWager: settings.maxWager,
    coolOffUntil: settings.coolOffUntil?.toISOString() ?? null,
    selfExcludedUntil: settings.selfExcludedUntil?.toISOString() ?? null,
    updatedAt: settings.updatedAt.toISOString(),
  };
}

async function ensureSettings(userId: string) {
  return getPrisma().responsibleGamingSetting.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function getResponsibleGamingSettings(userId: string) {
  return serializeSettings(await ensureSettings(userId));
}

export async function updateResponsibleGamingSettings(
  userId: string,
  input: ResponsibleSettingsInput,
) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    await lockWallet(tx, userId);
    const current = await tx.responsibleGamingSetting.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    const settings = await tx.responsibleGamingSetting.update({
      where: { userId },
      data: input,
    });
    await writeAuditLog(tx, {
      actorUserId: userId,
      action: "RESPONSIBLE_GAMING_SETTINGS_UPDATED",
      targetType: "RESPONSIBLE_GAMING",
      targetId: userId,
      metadata: {
        previous: serializeSettings(current),
        next: serializeSettings(settings),
      },
    });
    await createNotification(tx, {
      userId,
      type: "RESPONSIBLE_GAMING",
      title: "Responsible gaming settings updated",
      message: "Your play limits are now active on the server.",
    });
    return serializeSettings(settings);
  });
}

export async function enterCoolOff(userId: string, hours: 1 | 24 | 168) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    await lockWallet(tx, userId);
    const current = await tx.responsibleGamingSetting.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    const requestedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
    const coolOffUntil =
      current.coolOffUntil && current.coolOffUntil > requestedUntil
        ? current.coolOffUntil
        : requestedUntil;
    const settings = await tx.responsibleGamingSetting.update({
      where: { userId },
      data: { coolOffUntil },
    });
    await writeAuditLog(tx, {
      actorUserId: userId,
      action: "RESPONSIBLE_GAMING_COOLOFF_STARTED",
      targetType: "RESPONSIBLE_GAMING",
      targetId: userId,
      metadata: { hours, coolOffUntil: coolOffUntil.toISOString() },
    });
    await createNotification(tx, {
      userId,
      type: "RESPONSIBLE_GAMING",
      title: "Cool-off started",
      message: `Gameplay is paused until ${coolOffUntil.toISOString()}.`,
    });
    return serializeSettings(settings);
  });
}

export async function activateSelfExclusion(
  userId: string,
  days: 1 | 7 | 30 | 365,
) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    await lockWallet(tx, userId);
    const current = await tx.responsibleGamingSetting.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    if (current.selfExcludedUntil && current.selfExcludedUntil > new Date())
      throw conflict(
        "Self-exclusion is already active. It cannot be shortened or cancelled from the player interface.",
      );
    const selfExcludedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const settings = await tx.responsibleGamingSetting.update({
      where: { userId },
      data: { selfExcludedUntil },
    });
    await writeAuditLog(tx, {
      actorUserId: userId,
      action: "RESPONSIBLE_GAMING_SELF_EXCLUSION_STARTED",
      targetType: "RESPONSIBLE_GAMING",
      targetId: userId,
      metadata: {
        days,
        selfExcludedUntil: selfExcludedUntil.toISOString(),
        demoFeature: true,
      },
    });
    await createNotification(tx, {
      userId,
      type: "RESPONSIBLE_GAMING",
      title: "Self-exclusion active",
      message: `Gameplay is unavailable until ${selfExcludedUntil.toISOString()}.`,
    });
    return serializeSettings(settings);
  });
}

export async function assertGameplayAllowed(
  tx: Prisma.TransactionClient,
  userId: string,
  wager: number,
  platformMaxWager: number,
  options: { dailyWager?: number } = {},
) {
  const settings = await tx.responsibleGamingSetting.findUnique({
    where: { userId },
  });
  if (!settings) return;
  const now = new Date();
  if (settings.selfExcludedUntil && settings.selfExcludedUntil > now)
    throw selfExcluded();
  if (settings.coolOffUntil && settings.coolOffUntil > now)
    throw coolOffActive();
  const effectiveMax = Math.min(
    platformMaxWager,
    settings.maxWager ?? platformMaxWager,
  );
  if (wager > effectiveMax) throw maxWagerExceeded();
  const dailyWager = options.dailyWager ?? wager;
  if (!settings.dailyWagerLimit || dailyWager <= 0) return;
  const start = utcDayStart(now);
  const next = new Date(start);
  next.setUTCDate(next.getUTCDate() + 1);
  const aggregate = await tx.walletTransaction.aggregate({
    where: { userId, type: "GAME_WAGER", createdAt: { gte: start, lt: next } },
    _sum: { amount: true },
  });
  const used = Math.abs(aggregate._sum.amount ?? 0);
  if (used + dailyWager > settings.dailyWagerLimit) throw dailyLimitReached();
}

export async function getResponsibleGamingStatus(userId: string) {
  const prisma = getPrisma();
  const now = new Date();
  const settings = await ensureSettings(userId);
  const start = utcDayStart(now);
  const next = new Date(start);
  next.setUTCDate(next.getUTCDate() + 1);
  const [aggregate, session] = await prisma.$transaction([
    prisma.walletTransaction.aggregate({
      where: {
        userId,
        type: "GAME_WAGER",
        createdAt: { gte: start, lt: next },
      },
      _sum: { amount: true },
    }),
    prisma.gameSession.findFirst({
      where: { userId, status: "ACTIVE" },
      orderBy: { startedAt: "asc" },
      select: { startedAt: true, game: { select: { name: true } } },
    }),
  ]);
  const used = Math.abs(aggregate._sum.amount ?? 0);
  return {
    settings: serializeSettings(settings),
    dailyWagered: used,
    dailyRemaining:
      settings.dailyWagerLimit === null
        ? null
        : Math.max(0, settings.dailyWagerLimit - used),
    activeSession: session
      ? {
          startedAt: session.startedAt.toISOString(),
          gameName: session.game.name,
          elapsedSeconds: Math.max(
            0,
            Math.floor((now.getTime() - session.startedAt.getTime()) / 1000),
          ),
        }
      : null,
  };
}

export async function listResponsibleRestrictions(input: {
  page: number;
  pageSize: number;
}) {
  const prisma = getPrisma();
  const where = {
    OR: [
      { dailyWagerLimit: { not: null } },
      { maxWager: { not: null } },
      { coolOffUntil: { gt: new Date() } },
      { selfExcludedUntil: { gt: new Date() } },
    ],
  };
  const [records, total] = await prisma.$transaction([
    prisma.responsibleGamingSetting.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            status: true,
            profile: { select: { username: true, displayName: true } },
          },
        },
      },
    }),
    prisma.responsibleGamingSetting.count({ where }),
  ]);
  return {
    restrictions: records.map((record) => ({
      user: record.user,
      settings: serializeSettings(record),
    })),
    meta: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.ceil(total / input.pageSize),
    },
  };
}
