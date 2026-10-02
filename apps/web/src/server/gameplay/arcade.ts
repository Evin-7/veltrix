import { secureRandom, type RandomSource } from "./random";

const arcadeDifficulty: Record<string, number> = { "neon-paddock": 1, "tide-chase": 2, "prism-pulse": 3 };

export function resolveArcadeRun(gameSlug: string, wager: number, rng: RandomSource = secureRandom) {
  const difficulty = arcadeDifficulty[gameSlug] ?? 1;
  const distance = 700 + rng.nextInt(650 - difficulty * 70);
  const tokens = 8 + rng.nextInt(18 - difficulty * 2);
  const boosts = rng.nextInt(4);
  const score = distance + tokens * 30 + boosts * 80;
  const payout = score >= 1_700 ? wager * 3 : score >= 1_250 ? wager * 2 : 0;
  return { distance, tokens, boosts, score, payout };
}
