import { randomInt } from "node:crypto";

export type RandomSource = {
  nextInt(maxExclusive: number): number;
};

export const secureRandom: RandomSource = {
  nextInt(maxExclusive) {
    if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0) throw new Error("Random bound must be a positive safe integer.");
    return randomInt(maxExclusive);
  },
};

export function shuffle<T>(items: readonly T[], rng: RandomSource = secureRandom): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = rng.nextInt(index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}
