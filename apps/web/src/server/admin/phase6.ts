import "server-only";
import { Prisma, type VipLevel } from "@prisma/client";
import { getPrisma } from "@/server/db/prisma";
import { badRequest, notFound } from "@/server/http/errors";
import { writeAuditLog } from "./audit";
import { listResponsibleRestrictions } from "@/server/responsible-gaming/service";
import type { PromotionCreateInput, PromotionUpdateInput } from "@/server/promotions/schemas";

function promotionData(input: PromotionCreateInput | PromotionUpdateInput): Prisma.PromotionCreateInput {
  return {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.banner !== undefined ? { banner: input.banner as Prisma.InputJsonValue | null } : {}),
    ...(input.startAt !== undefined ? { startAt: input.startAt } : {}),
    ...(input.endAt !== undefined ? { endAt: input.endAt } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.rewardVC !== undefined ? { rewardVC: input.rewardVC } : {}),
    ...(input.eligibility !== undefined ? { eligibility: input.eligibility as Prisma.InputJsonValue } : {}),
  } as Prisma.PromotionCreateInput;
}

export async function listAdminPromotions(input: { page: number; pageSize: number }) {
  const prisma = getPrisma();
  const [records, total] = await prisma.$transaction([
    prisma.promotion.findMany({ orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }], skip: (input.page - 1) * input.pageSize, take: input.pageSize, include: { _count: { select: { claims: true } }, createdBy: { select: { email: true, profile: { select: { username: true } } } } } }),
    prisma.promotion.count(),
  ]);
  return { promotions: records.map((record) => ({ ...record, startAt: record.startAt.toISOString(), endAt: record.endAt.toISOString(), createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(), createdBy: { email: record.createdBy.email, username: record.createdBy.profile?.username ?? null } })), meta: { page: input.page, pageSize: input.pageSize, total, totalPages: Math.ceil(total / input.pageSize) } };
}

export async function createAdminPromotion(actorId: string, input: PromotionCreateInput) {
  const promotion = await getPrisma().$transaction(async (tx) => {
    const created = await tx.promotion.create({ data: { title: input.title, slug: input.slug, description: input.description, banner: input.banner === null ? Prisma.DbNull : input.banner ? (input.banner as Prisma.InputJsonValue) : undefined, startAt: input.startAt, endAt: input.endAt, status: input.status, rewardVC: input.rewardVC, eligibility: input.eligibility as Prisma.InputJsonValue, createdBy: { connect: { id: actorId } } } });
    await writeAuditLog(tx, { actorUserId: actorId, action: "PROMOTION_CREATED", targetType: "PROMOTION", targetId: created.id, metadata: { slug: created.slug, status: created.status, rewardVC: created.rewardVC } });
    return created;
  });
  return { ...promotion, startAt: promotion.startAt.toISOString(), endAt: promotion.endAt.toISOString(), createdAt: promotion.createdAt.toISOString(), updatedAt: promotion.updatedAt.toISOString() };
}

export async function updateAdminPromotion(actorId: string, promotionId: string, input: PromotionUpdateInput) {
  const promotion = await getPrisma().$transaction(async (tx) => {
    const current = await tx.promotion.findUnique({ where: { id: promotionId } });
    if (!current) throw notFound("Promotion not found.");
    const nextStart = input.startAt ?? current.startAt;
    const nextEnd = input.endAt ?? current.endAt;
    const nextStatus = input.status ?? current.status;
    if (nextEnd <= nextStart) throw badRequest("End time must be after start time.");
    if (nextStatus === "ACTIVE" && (nextStart > new Date() || nextEnd <= new Date())) throw badRequest("An active promotion must be within its scheduled window.");
    const updated = await tx.promotion.update({ where: { id: promotionId }, data: promotionData(input) });
    await writeAuditLog(tx, { actorUserId: actorId, action: "PROMOTION_UPDATED", targetType: "PROMOTION", targetId: updated.id, metadata: { fields: Object.keys(input), status: updated.status } });
    return updated;
  });
  return { ...promotion, startAt: promotion.startAt.toISOString(), endAt: promotion.endAt.toISOString(), createdAt: promotion.createdAt.toISOString(), updatedAt: promotion.updatedAt.toISOString() };
}

export async function listPromotionClaims(promotionId: string, input: { page: number; pageSize: number }) {
  const where = { promotionId };
  const [records, total] = await getPrisma().$transaction([
    getPrisma().promotionClaim.findMany({ where, orderBy: { claimedAt: "desc" }, skip: (input.page - 1) * input.pageSize, take: input.pageSize, include: { user: { select: { id: true, email: true, profile: { select: { username: true } } } } } }),
    getPrisma().promotionClaim.count({ where }),
  ]);
  return { claims: records.map((record) => ({ ...record, claimedAt: record.claimedAt.toISOString(), user: { ...record.user, username: record.user.profile?.username ?? null } })), meta: { page: input.page, pageSize: input.pageSize, total, totalPages: Math.ceil(total / input.pageSize) } };
}

export async function listAdminRewardHistory(input: { page: number; pageSize: number }) {
  const where = {};
  const [records, total] = await getPrisma().$transaction([
    getPrisma().rewardHistory.findMany({ where, orderBy: { createdAt: "desc" }, skip: (input.page - 1) * input.pageSize, take: input.pageSize, include: { user: { select: { id: true, email: true, profile: { select: { username: true } } } }, promotion: { select: { title: true, slug: true } } } }),
    getPrisma().rewardHistory.count({ where }),
  ]);
  return { history: records.map((record) => ({ ...record, createdAt: record.createdAt.toISOString(), user: { ...record.user, username: record.user.profile?.username ?? null } })), meta: { page: input.page, pageSize: input.pageSize, total, totalPages: Math.ceil(total / input.pageSize) } };
}

export async function listAdminVipConfig() {
  return getPrisma().vipLevelConfig.findMany({ orderBy: { xpThreshold: "asc" } });
}

export async function updateAdminVipConfig(actorId: string, level: VipLevel, input: { xpThreshold: number; rewardVC: number }) {
  return getPrisma().$transaction(async (tx) => {
    const current = await tx.vipLevelConfig.findUnique({ where: { level } });
    if (!current) throw notFound("VIP level configuration not found.");
    const configs = await tx.vipLevelConfig.findMany({ orderBy: { xpThreshold: "asc" } });
    const next = configs.map((config) => config.level === level ? { ...config, ...input } : config).sort((a, b) => a.xpThreshold - b.xpThreshold);
    if (next[0]?.level !== "BRONZE" || next.some((config, index) => index > 0 && config.xpThreshold <= next[index - 1].xpThreshold)) throw badRequest("VIP thresholds must be strictly increasing from BRONZE.");
    const updated = await tx.vipLevelConfig.update({ where: { level }, data: input });
    await writeAuditLog(tx, { actorUserId: actorId, action: "VIP_CONFIG_UPDATED", targetType: "VIP_CONFIG", targetId: level, metadata: { previous: { xpThreshold: current.xpThreshold, rewardVC: current.rewardVC }, next: input } });
    return updated;
  });
}

export { listResponsibleRestrictions };
