import { secureRandom, type RandomSource } from "./random";

export const slotSymbols = ["crystal", "crown", "orb", "star", "lightning", "diamond"] as const;
export type SlotSymbol = (typeof slotSymbols)[number];

export const slotPaylines = [
  [0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
] as const;

export const slotMultipliers: Record<SlotSymbol, Record<3 | 4 | 5, number>> = {
  crystal: { 3: 8, 4: 30, 5: 150 },
  crown: { 3: 6, 4: 20, 5: 100 },
  orb: { 3: 5, 4: 15, 5: 75 },
  star: { 3: 4, 4: 12, 5: 60 },
  lightning: { 3: 3, 4: 10, 5: 40 },
  diamond: { 3: 2, 4: 8, 5: 25 },
};

export type SlotWinLine = {
  line: number;
  symbol: SlotSymbol;
  count: number;
  multiplier: number;
  payout: number;
};

export type SlotSpinResult = {
  reels: SlotSymbol[][];
  winningLines: SlotWinLine[];
  payout: number;
};

export function evaluateSlotReels(reels: SlotSymbol[][], wager: number): SlotSpinResult {
  const winningLines: SlotWinLine[] = [];
  for (const [lineIndex, line] of slotPaylines.entries()) {
    const first = reels[0]?.[line[0]];
    if (!first) continue;
    let count = 1;
    for (let reel = 1; reel < line.length; reel += 1) {
      if (reels[reel]?.[line[reel]] !== first) break;
      count += 1;
    }
    if (count < 3) continue;
    const multiplier = slotMultipliers[first][count as 3 | 4 | 5];
    winningLines.push({ line: lineIndex + 1, symbol: first, count, multiplier, payout: wager * multiplier });
  }
  return { reels, winningLines, payout: winningLines.reduce((total, win) => total + win.payout, 0) };
}

export function spinSlots(wager: number, rng: RandomSource = secureRandom): SlotSpinResult {
  const reels = Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => slotSymbols[rng.nextInt(slotSymbols.length)]));
  return evaluateSlotReels(reels, wager);
}
