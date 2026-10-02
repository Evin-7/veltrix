import "server-only";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/server/db/prisma";
import { badRequest, forbidden, notFound } from "@/server/http/errors";
import { applyWalletMutationToLockedWallet, lockWallet } from "@/server/wallet/ledger";
import { writeAuditLog } from "./audit";
import type { SafeUser } from "@/types/auth";
import type { PlayerListInput, SessionListInput, TransactionListInput } from "./schemas";

function iso(value: Date | null) {
  return value?.toISOString() ?? null;
}

function dateFilter(from?: Date, to?: Date): Prisma.DateTimeFilter | undefined {
  if (!from && !to) return undefined;
  return { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
}

function ensureDateRange(from?: Date, to?: Date) {
  if (from && to && from > to) throw badRequest("The start date must be before the end date.");
}

export async function getDashboard(range: "24h" | "7d" | "30d") {
  const prisma = getPrisma();
  const now = new Date();
  const durationMs = range === "24h" ? 24 * 60 * 60 * 1000 : range === "7d" ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  const from = new Date(now.getTime() - durationMs);
  const [players, activePlayers, games, activeSessions, sessions, wagered, won, transactions, recentPlayers, recentSessions, recentTransactions, topGames] = await prisma.$transaction([
    prisma.user.count({ where: { role: "PLAYER" } }),
    prisma.user.count({ where: { role: "PLAYER", status: "ACTIVE" } }),
    prisma.game.count(),
    prisma.gameSession.count({ where: { status: "ACTIVE" } }),
    prisma.gameSession.count({ where: { createdAt: { gte: from } } }),
    prisma.walletTransaction.aggregate({ where: { type: "GAME_WAGER", createdAt: { gte: from } }, _sum: { amount: true } }),
    prisma.walletTransaction.aggregate({ where: { type: "GAME_WIN", createdAt: { gte: from } }, _sum: { amount: true } }),
    prisma.walletTransaction.count({ where: { createdAt: { gte: from } } }),
    prisma.user.count({ where: { role: "PLAYER", createdAt: { gte: from } } }),
    prisma.gameSession.count({ where: { createdAt: { gte: from } } }),
    prisma.walletTransaction.count({ where: { createdAt: { gte: from } } }),
    prisma.gameSession.groupBy({ by: ["gameId"], where: { createdAt: { gte: from } }, _count: { _all: true }, _sum: { totalWagered: true, totalWon: true }, orderBy: { _count: { gameId: "desc" } }, take: 5 }),
  ]);

  const topGameRecords = await prisma.game.findMany({ where: { id: { in: topGames.map((game) => game.gameId) } }, select: { id: true, name: true, slug: true } });
  const gameNames = new Map(topGameRecords.map((game) => [game.id, game]));
  const points = await prisma.$queryRaw<Array<{ bucket: Date; sessions: bigint; wagers: bigint }>>(Prisma.sql`
    SELECT date_trunc('day', d.bucket) AS "bucket",
      COALESCE((SELECT COUNT(*) FROM "GameSession" s WHERE s."createdAt" >= d.bucket AND s."createdAt" < d.bucket + interval '1 day'), 0)::bigint AS "sessions",
      COALESCE((SELECT SUM(ABS(t."amount")) FROM "WalletTransaction" t WHERE t."type" = 'GAME_WAGER' AND t."createdAt" >= d.bucket AND t."createdAt" < d.bucket + interval '1 day'), 0)::bigint AS "wagers"
    FROM generate_series(date_trunc('day', ${from}), date_trunc('day', ${now}), interval '1 day') AS d(bucket)
    ORDER BY d.bucket ASC
  `);

  return {
    range,
    generatedAt: now.toISOString(),
    kpis: {
      players,
      activePlayers,
      games,
      activeSessions,
      sessionsInRange: sessions,
      wageredVc: Math.abs(wagered._sum.amount ?? 0),
      wonVc: won._sum.amount ?? 0,
      transactionsInRange: transactions,
    },
    trends: { newPlayers: recentPlayers, sessions: recentSessions, transactions: recentTransactions, points: points.map((point) => ({ bucket: point.bucket.toISOString(), sessions: Number(point.sessions), wagers: Number(point.wagers) })) },
    topGames: topGames.map((game) => ({
      ...gameNames.get(game.gameId),
      gameId: game.gameId,
      sessions: typeof game._count === "object" && game._count ? game._count._all ?? 0 : 0,
      wageredVc: typeof game._sum === "object" && game._sum ? game._sum.totalWagered ?? 0 : 0,
      wonVc: typeof game._sum === "object" && game._sum ? game._sum.totalWon ?? 0 : 0,
    })),
  };
}

export async function listPlayers(input: PlayerListInput) {
  ensureDateRange(input.from, input.to);
  const where: Prisma.UserWhereInput = { role: "PLAYER", ...(input.status ? { status: input.status } : {}), ...(dateFilter(input.from, input.to) ? { createdAt: dateFilter(input.from, input.to) } : {}) };
  if (input.search) where.OR = [{ email: { contains: input.search, mode: "insensitive" } }, { profile: { username: { contains: input.search, mode: "insensitive" } } }, { profile: { displayName: { contains: input.search, mode: "insensitive" } } }];
  const prisma = getPrisma();
  const [records, total] = await prisma.$transaction([
    prisma.user.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (input.page - 1) * input.pageSize, take: input.pageSize, select: { id: true, email: true, role: true, status: true, createdAt: true, lastLoginAt: true, profile: { select: { username: true, displayName: true, avatarUrl: true } }, wallet: { select: { balance: true } }, _count: { select: { gameSessions: true, walletTransactions: true } } } }),
    prisma.user.count({ where }),
  ]);
  return { players: records.map((player) => ({ ...player, createdAt: player.createdAt.toISOString(), lastLoginAt: iso(player.lastLoginAt), wallet: player.wallet ?? { balance: 0 } })), meta: { page: input.page, pageSize: input.pageSize, total, totalPages: Math.ceil(total / input.pageSize) } };
}

export async function getPlayer(id: string) {
  const player = await getPrisma().user.findFirst({ where: { id, role: "PLAYER" }, select: { id: true, email: true, role: true, status: true, createdAt: true, updatedAt: true, lastLoginAt: true, profile: { select: { username: true, displayName: true, avatarUrl: true, createdAt: true, updatedAt: true } }, wallet: { select: { balance: true, updatedAt: true } }, walletTransactions: { orderBy: { createdAt: "desc" }, take: 20, select: { id: true, type: true, amount: true, balanceBefore: true, balanceAfter: true, referenceId: true, metadata: true, createdAt: true } }, gameSessions: { orderBy: { createdAt: "desc" }, take: 10, select: { id: true, status: true, startedAt: true, endedAt: true, totalWagered: true, totalWon: true, roundCount: true, game: { select: { name: true, slug: true } } } } } });
  if (!player) throw notFound("Player not found.");
  return { ...player, createdAt: player.createdAt.toISOString(), updatedAt: player.updatedAt.toISOString(), lastLoginAt: iso(player.lastLoginAt), profile: player.profile ? { ...player.profile, createdAt: player.profile.createdAt.toISOString(), updatedAt: player.profile.updatedAt.toISOString() } : null, wallet: player.wallet ? { ...player.wallet, updatedAt: player.wallet.updatedAt.toISOString() } : null, walletTransactions: player.walletTransactions.map((tx) => ({ ...tx, createdAt: tx.createdAt.toISOString() })), gameSessions: player.gameSessions.map((session) => ({ ...session, startedAt: session.startedAt.toISOString(), endedAt: iso(session.endedAt) })) };
}

export async function setPlayerStatus(actor: SafeUser, playerId: string, status: "ACTIVE" | "DISABLED") {
  if (actor.id === playerId) throw forbidden("You cannot disable your own account.");
  return getPrisma().$transaction(async (tx) => {
    const player = await tx.user.findFirst({ where: { id: playerId, role: "PLAYER" }, select: { id: true, status: true } });
    if (!player) throw notFound("Player not found.");
    if (player.status === status) return { id: player.id, status: player.status, changed: false };
    await tx.user.update({ where: { id: player.id }, data: { status } });
    if (status === "DISABLED") await tx.authSession.updateMany({ where: { userId: player.id, revokedAt: null }, data: { revokedAt: new Date() } });
    await writeAuditLog(tx, { actorUserId: actor.id, action: status === "DISABLED" ? "PLAYER_DISABLED" : "PLAYER_ENABLED", targetType: "USER", targetId: player.id, metadata: { previousStatus: player.status, status } });
    return { id: player.id, status, changed: true };
  });
}

export async function adjustPlayerVc(actor: SafeUser, input: { userId: string; amount: number; reason: string; idempotencyKey: string }) {
  if (actor.role !== "SUPER_ADMIN") throw forbidden("Only super administrators can adjust VC.");
  if (input.idempotencyKey.length > 120) throw badRequest("Idempotency key is too long.");
  const prisma = getPrisma();
  const walletKey = `admin-vc:${actor.id}:${input.idempotencyKey}`;
  const auditKey = `admin-vc-audit:${actor.id}:${input.idempotencyKey}`;
  return prisma.$transaction(async (tx) => {
    const previousAudit = await tx.auditLog.findUnique({ where: { idempotencyKey: auditKey } });
    if (previousAudit) {
      const previousTransaction = await tx.walletTransaction.findUnique({ where: { idempotencyKey: walletKey } });
      if (previousTransaction) return { transactionId: previousTransaction.id, balance: previousTransaction.balanceAfter, idempotent: true };
    }
    const player = await tx.user.findFirst({ where: { id: input.userId, role: "PLAYER" }, select: { id: true } });
    if (!player) throw notFound("Player not found.");
    const wallet = await lockWallet(tx, player.id);
    const result = await applyWalletMutationToLockedWallet(tx, wallet, { userId: player.id, type: "ADMIN_ADJUSTMENT", amount: input.amount, idempotencyKey: walletKey, referenceId: `admin-adjustment:${input.idempotencyKey}`, metadata: { actorUserId: actor.id, reason: input.reason } });
    if (!result.idempotent) await writeAuditLog(tx, { actorUserId: actor.id, action: "VC_ADJUSTED", targetType: "USER", targetId: player.id, idempotencyKey: auditKey, metadata: { amount: input.amount, reason: input.reason, walletTransactionId: result.transaction.id } });
    return { transactionId: result.transaction.id, balance: result.balance, idempotent: result.idempotent };
  });
}

export async function listTransactions(input: TransactionListInput) {
  ensureDateRange(input.from, input.to);
  const where: Prisma.WalletTransactionWhereInput = { ...(input.type ? { type: input.type } : {}), ...(dateFilter(input.from, input.to) ? { createdAt: dateFilter(input.from, input.to) } : {}) };
  if (input.search) where.user = { OR: [{ email: { contains: input.search, mode: "insensitive" } }, { profile: { username: { contains: input.search, mode: "insensitive" } } }] };
  const prisma = getPrisma();
  const [records, total] = await prisma.$transaction([
    prisma.walletTransaction.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (input.page - 1) * input.pageSize, take: input.pageSize, select: { id: true, userId: true, type: true, amount: true, balanceBefore: true, balanceAfter: true, referenceId: true, idempotencyKey: true, metadata: true, createdAt: true, user: { select: { email: true, profile: { select: { username: true } } } } } }),
    prisma.walletTransaction.count({ where }),
  ]);
  return { transactions: records.map((tx) => ({ ...tx, createdAt: tx.createdAt.toISOString(), user: { ...tx.user, username: tx.user.profile?.username ?? null } })), meta: { page: input.page, pageSize: input.pageSize, total, totalPages: Math.ceil(total / input.pageSize) } };
}

export async function listSessions(input: SessionListInput) {
  ensureDateRange(input.from, input.to);
  const where: Prisma.GameSessionWhereInput = { ...(input.status ? { status: input.status } : {}), ...(dateFilter(input.from, input.to) ? { createdAt: dateFilter(input.from, input.to) } : {}) };
  if (input.search) where.OR = [{ user: { email: { contains: input.search, mode: "insensitive" } } }, { user: { profile: { username: { contains: input.search, mode: "insensitive" } } } }, { game: { name: { contains: input.search, mode: "insensitive" } } }, { game: { slug: { contains: input.search, mode: "insensitive" } } }];
  const prisma = getPrisma();
  const [records, total] = await prisma.$transaction([
    prisma.gameSession.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (input.page - 1) * input.pageSize, take: input.pageSize, select: { id: true, status: true, startedAt: true, endedAt: true, totalWagered: true, totalWon: true, roundCount: true, createdAt: true, user: { select: { email: true, profile: { select: { username: true } } } }, game: { select: { name: true, slug: true } } } }),
    prisma.gameSession.count({ where }),
  ]);
  return { sessions: records.map((session) => ({ ...session, createdAt: session.createdAt.toISOString(), startedAt: session.startedAt.toISOString(), endedAt: iso(session.endedAt), user: { ...session.user, username: session.user.profile?.username ?? null } })), meta: { page: input.page, pageSize: input.pageSize, total, totalPages: Math.ceil(total / input.pageSize) } };
}

export async function getSession(id: string) {
  const record = await getPrisma().gameSession.findUnique({ where: { id }, include: { user: { select: { id: true, email: true, profile: { select: { username: true } } } }, game: { select: { id: true, name: true, slug: true, provider: { select: { name: true } } } }, rounds: { orderBy: { roundNumber: "asc" }, take: 100, select: { id: true, roundNumber: true, status: true, wager: true, payout: true, netResult: true, gameType: true, state: true, result: true, createdAt: true, settledAt: true, actions: { orderBy: { createdAt: "asc" }, take: 50, select: { id: true, type: true, idempotencyKey: true, response: true, createdAt: true } } } } } });
  if (!record) throw notFound("Game session not found.");
  return { ...record, startedAt: record.startedAt.toISOString(), endedAt: iso(record.endedAt), createdAt: record.createdAt.toISOString(), user: { ...record.user, username: record.user.profile?.username ?? null }, rounds: record.rounds.map((round) => ({ ...round, createdAt: round.createdAt.toISOString(), settledAt: iso(round.settledAt), actions: round.actions.map((action) => ({ ...action, createdAt: action.createdAt.toISOString() })) })) };
}

export async function listAdminGames() {
  const [games, providers] = await Promise.all([
    getPrisma().game.findMany({ orderBy: [{ updatedAt: "desc" }, { name: "asc" }], include: { provider: { select: { id: true, name: true, slug: true, status: true } }, _count: { select: { gameSessions: true } } } }),
    getPrisma().gameProvider.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { games: true } } } }),
  ]);
  return { games: games.map((game) => ({ ...game, demoRtp: Number(game.demoRtp), createdAt: game.createdAt.toISOString(), updatedAt: game.updatedAt.toISOString() })), providers };
}

export async function createAdminGame(actor: SafeUser, input: Prisma.GameCreateInput) {
  const game = await getPrisma().$transaction(async (tx) => {
    const created = await tx.game.create({ data: input, include: { provider: { select: { id: true, name: true, slug: true, status: true } } } });
    await writeAuditLog(tx, { actorUserId: actor.id, action: "GAME_CREATED", targetType: "GAME", targetId: created.id, metadata: { slug: created.slug } });
    return created;
  });
  return { ...game, demoRtp: Number(game.demoRtp), createdAt: game.createdAt.toISOString(), updatedAt: game.updatedAt.toISOString() };
}

export async function updateAdminGame(actor: SafeUser, id: string, input: Prisma.GameUpdateInput) {
  const game = await getPrisma().$transaction(async (tx) => {
    const existing = await tx.game.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw notFound("Game not found.");
    const updated = await tx.game.update({ where: { id }, data: input, include: { provider: { select: { id: true, name: true, slug: true, status: true } } } });
    await writeAuditLog(tx, { actorUserId: actor.id, action: "GAME_UPDATED", targetType: "GAME", targetId: updated.id, metadata: { fields: Object.keys(input) } });
    return updated;
  });
  return { ...game, demoRtp: Number(game.demoRtp), createdAt: game.createdAt.toISOString(), updatedAt: game.updatedAt.toISOString() };
}

export async function createProvider(actor: SafeUser, input: Prisma.GameProviderCreateInput) {
  const provider = await getPrisma().$transaction(async (tx) => {
    const created = await tx.gameProvider.create({ data: input, include: { _count: { select: { games: true } } } });
    await writeAuditLog(tx, { actorUserId: actor.id, action: "PROVIDER_CREATED", targetType: "PROVIDER", targetId: created.id, metadata: { slug: created.slug } });
    return created;
  });
  return provider;
}

export async function updateProvider(actor: SafeUser, id: string, input: Prisma.GameProviderUpdateInput) {
  const provider = await getPrisma().$transaction(async (tx) => {
    const existing = await tx.gameProvider.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw notFound("Provider not found.");
    const updated = await tx.gameProvider.update({ where: { id }, data: input, include: { _count: { select: { games: true } } } });
    await writeAuditLog(tx, { actorUserId: actor.id, action: "PROVIDER_UPDATED", targetType: "PROVIDER", targetId: updated.id, metadata: { fields: Object.keys(input) } });
    return updated;
  });
  return provider;
}
