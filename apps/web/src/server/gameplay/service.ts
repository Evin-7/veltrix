import "server-only";

import { createHash } from "node:crypto";
import { Prisma, type GameActionType, type GameRound } from "@prisma/client";
import { getPrisma } from "@/server/db/prisma";
import { badRequest, conflict, notFound } from "@/server/http/errors";
import { assertGameplayAllowed } from "@/server/responsible-gaming/service";
import { awardGameplayXp } from "@/server/rewards/service";
import { calculateGameplayXp } from "@/server/rewards/constants";
import { applyWalletMutationToLockedWallet, lockWallet, MAX_VC_BALANCE, type LockedWallet } from "@/server/wallet/ledger";
import { GAME_SLUGS, MAX_DEMO_WAGER, type DemoWager } from "./constants";
import { blackjackEngine, payoutForBlackjack, publicBlackjackState, type BlackjackState } from "./engine";
import { rouletteEngine } from "./engine";
import type { RouletteBet } from "./roulette";
import { slotsEngine } from "./engine";

type Tx = Prisma.TransactionClient;
type JsonRecord = Record<string, unknown>;

function asInputJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function asJsonRecord(value: Prisma.JsonValue): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Stored game response is invalid.");
  return value as JsonRecord;
}

function requestHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function requireIdempotencyKey(value: string | null) {
  const key = value?.trim();
  if (!key || key.length > 160 || !/^[a-zA-Z0-9._:-]+$/.test(key)) throw badRequest("A valid Idempotency-Key header is required.");
  return key;
}

async function getActiveGame(tx: Tx, slug: string) {
  const game = await tx.game.findFirst({ where: { slug, status: "ACTIVE", provider: { status: "ACTIVE" } }, select: { id: true, slug: true } });
  if (!game) throw notFound("Game not found.");
  return game;
}

async function getOrCreateSession(tx: Tx, userId: string, gameId: string) {
  const existing = await tx.gameSession.findFirst({ where: { userId, gameId, status: "ACTIVE" }, orderBy: { updatedAt: "desc" } });
  if (existing) return existing;
  return tx.gameSession.create({ data: { userId, gameId } });
}

async function existingAction(tx: Tx, input: { idempotencyKey: string; userId: string; type: GameActionType; hash: string }) {
  const action = await tx.gameAction.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (!action) return null;
  if (action.userId !== input.userId || action.type !== input.type || action.requestHash !== input.hash) throw conflict("The idempotency key has already been used for a different game action.");
  return { ...asJsonRecord(action.response), idempotent: true };
}

async function saveAction(tx: Tx, input: { sessionId: string; roundId: string; userId: string; type: GameActionType; idempotencyKey: string; hash: string; response: JsonRecord }) {
  await tx.gameAction.create({ data: { sessionId: input.sessionId, roundId: input.roundId, userId: input.userId, type: input.type, idempotencyKey: input.idempotencyKey, requestHash: input.hash, response: asInputJson(input.response) } });
}

function walletReference(roundId: string, kind: "wager" | "double" | "payout") {
  return `game-round:${roundId}:${kind}`;
}

function walletIdempotency(roundId: string, kind: "wager" | "double" | "payout") {
  return `game-wallet:${roundId}:${kind}`;
}

function assertSessionTotals(session: { totalWagered: number; totalWon: number }, wagered: number, won: number) {
  if (!Number.isSafeInteger(session.totalWagered + wagered) || !Number.isSafeInteger(session.totalWon + won) || session.totalWagered + wagered > MAX_VC_BALANCE || session.totalWon + won > MAX_VC_BALANCE) {
    throw conflict("The game session has reached its configured VC statistics limit.");
  }
}

async function settlePayout(tx: Tx, wallet: LockedWallet, userId: string, roundId: string, payout: number) {
  if (payout <= 0) return { wallet, balance: wallet.balance };
  const result = await applyWalletMutationToLockedWallet(tx, wallet, {
    userId,
    type: "GAME_WIN",
    amount: payout,
    idempotencyKey: walletIdempotency(roundId, "payout"),
    referenceId: walletReference(roundId, "payout"),
    metadata: asInputJson({ roundId, convention: "total_returned_after_wager" }),
  });
  return { wallet: { ...wallet, balance: result.balance }, balance: result.balance };
}

async function recordRecentGame(tx: Tx, userId: string, gameId: string) {
  await tx.recentGame.upsert({ where: { userId_gameId: { userId, gameId } }, update: { lastPlayedAt: new Date() }, create: { userId, gameId, lastPlayedAt: new Date() } });
}

export async function spinSlotsRound(userId: string, wager: DemoWager, idempotencyKey: string) {
  const hash = requestHash({ wager });
  const response = await getPrisma().$transaction(async (tx) => {
    const game = await getActiveGame(tx, GAME_SLUGS.slots);
    const wallet = await lockWallet(tx, userId);
    const duplicate = await existingAction(tx, { idempotencyKey, userId, type: "SLOT_SPIN", hash });
    if (duplicate) return duplicate;
    await assertGameplayAllowed(tx, userId, wager, MAX_DEMO_WAGER);
    const session = await getOrCreateSession(tx, userId, game.id);
    const round = await tx.gameRound.create({ data: { sessionId: session.id, gameId: game.id, userId, roundNumber: session.roundCount + 1, status: "PENDING", wager, netResult: -wager, gameType: "SLOTS" } });
    const wagerResult = await applyWalletMutationToLockedWallet(tx, wallet, { userId, type: "GAME_WAGER", amount: -wager, idempotencyKey: walletIdempotency(round.id, "wager"), referenceId: walletReference(round.id, "wager"), metadata: asInputJson({ roundId: round.id, game: GAME_SLUGS.slots }) });
    const result = slotsEngine.resolve(wager);
    const payoutResult = await settlePayout(tx, { ...wallet, balance: wagerResult.balance }, userId, round.id, result.payout);
    const rewardResult = await awardGameplayXp(tx, userId, round.id, calculateGameplayXp(wager), payoutResult.wallet);
    assertSessionTotals(session, wager, result.payout);
    const settled = await tx.gameRound.update({ where: { id: round.id }, data: { status: "SETTLED", payout: result.payout, netResult: result.payout - wager, result: asInputJson(result), settledAt: new Date() } });
    await tx.gameSession.update({ where: { id: session.id }, data: { status: "COMPLETED", endedAt: new Date(), totalWagered: { increment: wager }, totalWon: { increment: result.payout }, roundCount: { increment: 1 } } });
    await recordRecentGame(tx, userId, game.id);
    const responseBody: JsonRecord = { roundId: settled.id, wager, reels: result.reels, winningLines: result.winningLines, payout: result.payout, netResult: result.payout - wager, newBalance: rewardResult.wallet.balance, idempotent: false };
    await saveAction(tx, { sessionId: session.id, roundId: round.id, userId, type: "SLOT_SPIN", idempotencyKey, hash, response: responseBody });
    return responseBody;
  }, { maxWait: 15_000, timeout: 30_000 });
  return response;
}

export async function spinRouletteRound(userId: string, wager: DemoWager, bet: RouletteBet, idempotencyKey: string) {
  const normalizedBet = bet.type === "SINGLE_NUMBER" ? { type: bet.type, number: bet.number } : { type: bet.type };
  const hash = requestHash({ wager, bet: normalizedBet });
  return getPrisma().$transaction(async (tx) => {
    const game = await getActiveGame(tx, GAME_SLUGS.roulette);
    const wallet = await lockWallet(tx, userId);
    const duplicate = await existingAction(tx, { idempotencyKey, userId, type: "ROULETTE_SPIN", hash });
    if (duplicate) return duplicate;
    await assertGameplayAllowed(tx, userId, wager, MAX_DEMO_WAGER);
    const session = await getOrCreateSession(tx, userId, game.id);
    const round = await tx.gameRound.create({ data: { sessionId: session.id, gameId: game.id, userId, roundNumber: session.roundCount + 1, status: "PENDING", wager, netResult: -wager, gameType: "ROULETTE" } });
    const wagerResult = await applyWalletMutationToLockedWallet(tx, wallet, { userId, type: "GAME_WAGER", amount: -wager, idempotencyKey: walletIdempotency(round.id, "wager"), referenceId: walletReference(round.id, "wager"), metadata: asInputJson({ roundId: round.id, game: GAME_SLUGS.roulette }) });
    const result = rouletteEngine.resolve({ wager, bet: normalizedBet });
    const payoutResult = await settlePayout(tx, { ...wallet, balance: wagerResult.balance }, userId, round.id, result.payout);
    const rewardResult = await awardGameplayXp(tx, userId, round.id, calculateGameplayXp(wager), payoutResult.wallet);
    assertSessionTotals(session, wager, result.payout);
    const settled = await tx.gameRound.update({ where: { id: round.id }, data: { status: "SETTLED", payout: result.payout, netResult: result.payout - wager, result: asInputJson(result), settledAt: new Date() } });
    await tx.gameSession.update({ where: { id: session.id }, data: { status: "COMPLETED", endedAt: new Date(), totalWagered: { increment: wager }, totalWon: { increment: result.payout }, roundCount: { increment: 1 } } });
    await recordRecentGame(tx, userId, game.id);
    const responseBody: JsonRecord = { roundId: settled.id, winningNumber: result.winningNumber, winningColor: result.winningColor, bet: normalizedBet, wager, payout: result.payout, netResult: result.payout - wager, newBalance: rewardResult.wallet.balance, idempotent: false };
    await saveAction(tx, { sessionId: session.id, roundId: round.id, userId, type: "ROULETTE_SPIN", idempotencyKey, hash, response: responseBody });
    return responseBody;
  }, { maxWait: 15_000, timeout: 30_000 });
}

function parseBlackjackState(round: Pick<GameRound, "state">) {
  if (!round.state) throw conflict("This blackjack hand cannot be recovered.");
  return round.state as unknown as BlackjackState;
}

function blackjackResponse(round: Pick<GameRound, "id" | "wager" | "payout" | "netResult" | "status" | "state" | "result">, balance: number, idempotent = false): JsonRecord {
  if (round.status === "ACTIVE") {
    const state = parseBlackjackState(round);
    return { roundId: round.id, status: "ACTIVE", ...publicBlackjackState(state), payout: 0, netResult: -round.wager, newBalance: balance, idempotent };
  }
  const result = round.result ? asJsonRecord(round.result) : {};
  return { roundId: round.id, status: round.status, ...result, wager: round.wager, payout: round.payout, netResult: round.netResult, newBalance: balance, idempotent };
}

export async function dealBlackjackRound(userId: string, wager: DemoWager, idempotencyKey: string) {
  const hash = requestHash({ wager });
  return getPrisma().$transaction(async (tx) => {
    const game = await getActiveGame(tx, GAME_SLUGS.blackjack);
    const wallet = await lockWallet(tx, userId);
    const duplicate = await existingAction(tx, { idempotencyKey, userId, type: "BLACKJACK_DEAL", hash });
    if (duplicate) return duplicate;
    const existingActive = await tx.gameRound.findFirst({ where: { userId, gameId: game.id, status: { in: ["PENDING", "ACTIVE"] } }, select: { id: true } });
    if (existingActive) throw conflict("Finish or recover the active blackjack hand before dealing again.");
    await assertGameplayAllowed(tx, userId, wager, MAX_DEMO_WAGER);
    const session = await getOrCreateSession(tx, userId, game.id);
    const round = await tx.gameRound.create({ data: { sessionId: session.id, gameId: game.id, userId, roundNumber: session.roundCount + 1, status: "PENDING", wager, netResult: -wager, gameType: "BLACKJACK" } });
    const wagerResult = await applyWalletMutationToLockedWallet(tx, wallet, { userId, type: "GAME_WAGER", amount: -wager, idempotencyKey: walletIdempotency(round.id, "wager"), referenceId: walletReference(round.id, "wager"), metadata: asInputJson({ roundId: round.id, game: GAME_SLUGS.blackjack }) });
    const state = blackjackEngine.deal(wager);
    const isSettled = state.phase !== "PLAYER_TURN";
    const payout = isSettled ? payoutForBlackjack(state, wager) : 0;
    const payoutResult = await settlePayout(tx, { ...wallet, balance: wagerResult.balance }, userId, round.id, payout);
    const rewardResult = isSettled ? await awardGameplayXp(tx, userId, round.id, calculateGameplayXp(wager), payoutResult.wallet) : { wallet: payoutResult.wallet };
    assertSessionTotals(session, wager, payout);
    const updated = await tx.gameRound.update({ where: { id: round.id }, data: { status: isSettled ? "SETTLED" : "ACTIVE", state: isSettled ? Prisma.DbNull : asInputJson(state), result: isSettled ? asInputJson(publicBlackjackState(state)) : Prisma.DbNull, payout, netResult: payout - wager, settledAt: isSettled ? new Date() : null } });
    await tx.gameSession.update({ where: { id: session.id }, data: { ...(isSettled ? { status: "COMPLETED", endedAt: new Date() } : {}), totalWagered: { increment: wager }, totalWon: { increment: payout }, roundCount: { increment: 1 } } });
    await recordRecentGame(tx, userId, game.id);
    const responseBody = blackjackResponse(updated, rewardResult.wallet.balance);
    await saveAction(tx, { sessionId: session.id, roundId: round.id, userId, type: "BLACKJACK_DEAL", idempotencyKey, hash, response: responseBody });
    return responseBody;
  }, { maxWait: 15_000, timeout: 30_000 });
}

async function lockRound(tx: Tx, userId: string, roundId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT "id" FROM "GameRound" WHERE "id" = ${roundId}::uuid AND "userId" = ${userId}::uuid FOR UPDATE`);
  if (!rows[0]) throw notFound("Blackjack hand not found.");
  return tx.gameRound.findUniqueOrThrow({ where: { id: roundId } });
}

export async function blackjackAction(userId: string, roundId: string, action: "hit" | "stand" | "double", idempotencyKey: string) {
  const actionType = action === "hit" ? "BLACKJACK_HIT" : action === "stand" ? "BLACKJACK_STAND" : "BLACKJACK_DOUBLE";
  const hash = requestHash({ roundId, action });
  return getPrisma().$transaction(async (tx) => {
    const round = await lockRound(tx, userId, roundId);
    if (round.gameType !== "BLACKJACK") throw conflict("This round is not a blackjack hand.");
    const duplicate = await existingAction(tx, { idempotencyKey, userId, type: actionType, hash });
    if (duplicate) return duplicate;
    if (round.status !== "ACTIVE") throw conflict("This blackjack hand is no longer active.");
    const wallet = await lockWallet(tx, userId);
    const session = await tx.gameSession.findUniqueOrThrow({ where: { id: round.sessionId } });
    const state = parseBlackjackState(round);
    await assertGameplayAllowed(tx, userId, action === "double" ? state.wager : 0, MAX_DEMO_WAGER);
    let nextState: BlackjackState;
    let walletAfterAction = wallet;
    let updatedWager = round.wager;
    if (action === "hit") nextState = blackjackEngine.hit(state);
    else if (action === "stand") nextState = blackjackEngine.stand(state);
    else {
      const additionalWager = state.wager;
      const wagerResult = await applyWalletMutationToLockedWallet(tx, wallet, { userId, type: "GAME_WAGER", amount: -additionalWager, idempotencyKey: walletIdempotency(round.id, "double"), referenceId: walletReference(round.id, "double"), metadata: asInputJson({ roundId: round.id, game: GAME_SLUGS.blackjack, action: "double" }) });
      assertSessionTotals(session, additionalWager, 0);
      walletAfterAction = { ...wallet, balance: wagerResult.balance };
      nextState = blackjackEngine.double(state);
      updatedWager = nextState.wager;
      await tx.gameSession.update({ where: { id: round.sessionId }, data: { totalWagered: { increment: additionalWager } } });
    }
    const isSettled = nextState.phase !== "PLAYER_TURN";
    const payout = isSettled ? payoutForBlackjack(nextState, updatedWager) : 0;
    if (isSettled) assertSessionTotals(session, 0, payout);
    if (isSettled) {
      const payoutResult = await settlePayout(tx, walletAfterAction, userId, round.id, payout);
      walletAfterAction = payoutResult.wallet;
      const rewardResult = await awardGameplayXp(tx, userId, round.id, calculateGameplayXp(updatedWager), walletAfterAction);
      walletAfterAction = rewardResult.wallet;
    }
    const updated = await tx.gameRound.update({ where: { id: round.id }, data: { status: isSettled ? "SETTLED" : "ACTIVE", wager: updatedWager, state: isSettled ? Prisma.DbNull : asInputJson(nextState), result: isSettled ? asInputJson(publicBlackjackState(nextState)) : Prisma.DbNull, payout, netResult: payout - updatedWager, settledAt: isSettled ? new Date() : null } });
    if (isSettled) await tx.gameSession.update({ where: { id: round.sessionId }, data: { status: "COMPLETED", endedAt: new Date(), totalWon: { increment: payout } } });
    await recordRecentGame(tx, userId, round.gameId);
    const responseBody = blackjackResponse(updated, walletAfterAction.balance);
    await saveAction(tx, { sessionId: round.sessionId, roundId, userId, type: actionType, idempotencyKey, hash, response: responseBody });
    return responseBody;
  }, { maxWait: 15_000, timeout: 30_000 });
}

export async function recoverBlackjack(userId: string) {
  const round = await getPrisma().gameRound.findFirst({ where: { userId, gameType: "BLACKJACK", status: "ACTIVE" }, orderBy: { createdAt: "desc" } });
  if (!round) return null;
  const wallet = await getPrisma().wallet.findUnique({ where: { userId }, select: { balance: true } });
  if (!wallet) throw notFound("Wallet not found.");
  return blackjackResponse(round, wallet.balance);
}

export async function listGameSessions(userId: string, page: number, pageSize: number) {
  const prisma = getPrisma();
  const where = { userId };
  const [sessions, total] = await prisma.$transaction([
    prisma.gameSession.findMany({ where, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize, include: { game: { select: { slug: true, name: true } } } }),
    prisma.gameSession.count({ where }),
  ]);
  return { sessions: sessions.map((session) => ({ id: session.id, game: session.game, status: session.status, startedAt: session.startedAt.toISOString(), endedAt: session.endedAt?.toISOString() ?? null, totalWagered: session.totalWagered, totalWon: session.totalWon, roundCount: session.roundCount })), meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}

export async function getGameSession(userId: string, sessionId: string) {
  const session = await getPrisma().gameSession.findFirst({ where: { id: sessionId, userId }, include: { game: { select: { slug: true, name: true } } } });
  if (!session) throw notFound("Game session not found.");
  return { id: session.id, game: session.game, status: session.status, startedAt: session.startedAt.toISOString(), endedAt: session.endedAt?.toISOString() ?? null, totalWagered: session.totalWagered, totalWon: session.totalWon, roundCount: session.roundCount };
}

export async function listGameSessionRounds(userId: string, sessionId: string, page: number, pageSize: number) {
  const session = await getGameSession(userId, sessionId);
  const where = { sessionId: session.id, userId };
  const [rounds, total] = await getPrisma().$transaction([
    getPrisma().gameRound.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize, select: { id: true, roundNumber: true, status: true, wager: true, payout: true, netResult: true, gameType: true, result: true, createdAt: true, settledAt: true } }),
    getPrisma().gameRound.count({ where }),
  ]);
  return { rounds: rounds.map((round) => ({ ...round, result: round.result ? asJsonRecord(round.result) : null, createdAt: round.createdAt.toISOString(), settledAt: round.settledAt?.toISOString() ?? null })), meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}
