import { secureRandom, type RandomSource } from "./random";

export const diceBetTypes = ["HIGH", "LOW"] as const;
export type DiceBet = (typeof diceBetTypes)[number];

export function rollDice(wager: number, bet: DiceBet, rng: RandomSource = secureRandom) {
  const roll = rng.nextInt(100) + 1;
  const wins = bet === "HIGH" ? roll >= 51 : roll <= 49;
  return { roll, bet, payout: wins ? wager * 2 : 0 };
}
