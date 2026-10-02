import { secureRandom, type RandomSource } from "./random";

export const rouletteBetTypes = [
  "RED",
  "BLACK",
  "ODD",
  "EVEN",
  "LOW_18",
  "HIGH_19",
  "DOZEN_1_12",
  "DOZEN_13_24",
  "DOZEN_25_36",
  "COLUMN_1",
  "COLUMN_2",
  "COLUMN_3",
  "SINGLE_NUMBER",
] as const;
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

function isValidRouletteNumber(number: number): number is number {
  return Number.isInteger(number) && number >= 0 && number <= 36;
}

export function evaluateRoulette(number: number, bet: RouletteBet, wager: number): RouletteSpinResult {
  if (!isValidRouletteNumber(number)) throw new Error("A European roulette result must be a number from 0 through 36.");
  validateRouletteBet(bet);
  const color = rouletteColor(number);
  const wins = (() => {
    switch (bet.type) {
      case "RED": return color === "RED";
      case "BLACK": return color === "BLACK";
      case "ODD": return number !== 0 && number % 2 === 1;
      case "EVEN": return number !== 0 && number % 2 === 0;
      case "LOW_18": return number >= 1 && number <= 18;
      case "HIGH_19": return number >= 19 && number <= 36;
      case "DOZEN_1_12": return number >= 1 && number <= 12;
      case "DOZEN_13_24": return number >= 13 && number <= 24;
      case "DOZEN_25_36": return number >= 25 && number <= 36;
      case "COLUMN_1": return number !== 0 && number % 3 === 1;
      case "COLUMN_2": return number !== 0 && number % 3 === 2;
      case "COLUMN_3": return number !== 0 && number % 3 === 0;
      case "SINGLE_NUMBER": return number === bet.number;
    }
  })();
  const multiplier = bet.type === "SINGLE_NUMBER" ? 36 : bet.type.startsWith("DOZEN_") || bet.type.startsWith("COLUMN_") ? 3 : 2;
  return { winningNumber: number, winningColor: color, bet, payout: wins ? wager * multiplier : 0 };
}

export function spinRoulette(wager: number, bet: RouletteBet, rng: RandomSource = secureRandom) {
  return evaluateRoulette(rng.nextInt(37), bet, wager);
}
