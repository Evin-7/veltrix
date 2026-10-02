import type { VipLevel } from "@prisma/client";

export const VIP_LEVELS: readonly VipLevel[] = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"];

export function calculateGameplayXp(wager: number) {
  return Math.max(1, Math.floor(wager / 10));
}

export function vipLevelIndex(level: VipLevel) {
  return VIP_LEVELS.indexOf(level);
}
