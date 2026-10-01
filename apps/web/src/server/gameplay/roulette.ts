import { secureRandom, type RandomSource } from "./random";

export const rouletteBetTypes = ["RED", "BLACK", "ODD", "EVEN", "SINGLE_NUMBER"] as const;
export type RouletteBetType = (typeof rouletteBetTypes)[number];
export type RouletteBet = { type: RouletteBetType; number?: number };

const redNumbers = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export function rouletteColor(number: number): "GREEN" | "RED" | "BLACK" {
  if (number === 0) return "GREEN";
  return redNumbers.has(number) ? "RED" : "BLACK";
}

export function validateRouletteBet(bet: RouletteBet) {
  if (bet.type === "SINGLE_NUMBER" && (!Number.isInteger(bet.number) || bet.number! < 0 || bet.number! > 36)) throw new Error("A single-number bet must select a number from 0 through 36.");
  if (bet.type !== "SINGLE_NUMBER" && bet.number !== undefined) throw new Error("This roulette bet does not accept a number.");
  return bet;
}

export type RouletteSpinResult = {
  winningNumber: number;
  winningColor: "GREEN" | "RED" | "BLACK";
  bet: RouletteBet;
  payout: number;
};

export function evaluateRoulette(number: number, bet: RouletteBet, wager: number): RouletteSpinResult {
  validateRouletteBet(bet);
  const color = rouletteColor(number);
  const wins = bet.type === "RED"
    ? color === "RED"
    : bet.type === "BLACK"
      ? color === "BLACK"
      : bet.type === "ODD"
        ? number !== 0 && number % 2 === 1
        : bet.type === "EVEN"
          ? number !== 0 && number % 2 === 0
          : number === bet.number;
  const multiplier = bet.type === "SINGLE_NUMBER" ? 36 : 2;
  return { winningNumber: number, winningColor: color, bet, payout: wins ? wager * multiplier : 0 };
}

export function spinRoulette(wager: number, bet: RouletteBet, rng: RandomSource = secureRandom) {
  return evaluateRoulette(rng.nextInt(37), bet, wager);
}
