import { secureRandom, type RandomSource } from "./random";
import { slotGameCatalog, type SlotPayouts } from "@/shared/slot-catalog";

export const slotSymbols = slotGameCatalog["neon-relics"].symbols;
export type SlotSymbol = (typeof slotSymbols)[number];

export const slotPaylines = [
  [0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
] as const;

export const slotMultipliers = slotGameCatalog["neon-relics"].paytable;

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

export type ConfiguredSlotSpinResult = {
  reels: string[][];
  winningLines: { line: number; symbol: string; count: number; multiplier: number; payout: number }[];
  payout: number;
};

function assertSlotConfiguration(symbols: readonly string[], paytable: Readonly<Record<string, SlotPayouts>>) {
  if (symbols.length === 0 || new Set(symbols).size !== symbols.length) {
    throw new Error("Slot configuration must contain unique symbols.");
  }
  for (const symbol of symbols) {
    const payouts = paytable[symbol];
    if (!payouts || [3, 4, 5].some((count) => !Number.isSafeInteger(payouts[count as 3 | 4 | 5]) || payouts[count as 3 | 4 | 5] < 0)) {
      throw new Error(`Slot configuration is missing a valid paytable for ${symbol}.`);
    }
  }
}

function assertSlotMatrix(reels: readonly (readonly string[])[], symbols: readonly string[]) {
  if (reels.length !== 5 || reels.some((reel) => reel.length !== 3)) {
    throw new Error("Slot outcome must be a 5x3 reel matrix.");
  }
  const allowedSymbols = new Set(symbols);
  for (const reel of reels) {
    for (const symbol of reel) {
      if (!allowedSymbols.has(symbol)) throw new Error(`Slot outcome contains unknown symbol: ${symbol}.`);
    }
  }
}

export function evaluateConfiguredSlotReels(
  reels: readonly (readonly string[])[],
  symbols: readonly string[],
  paytable: Readonly<Record<string, SlotPayouts>>,
  wager: number,
): ConfiguredSlotSpinResult {
  assertSlotConfiguration(symbols, paytable);
  assertSlotMatrix(reels, symbols);
  const winningLines: ConfiguredSlotSpinResult["winningLines"] = [];
  for (const [lineIndex, line] of slotPaylines.entries()) {
    const first = reels[0]?.[line[0]];
    if (!first) continue;
    let count = 1;
    for (let reel = 1; reel < line.length; reel += 1) {
      if (reels[reel]?.[line[reel]] !== first) break;
      count += 1;
    }
    if (count < 3) continue;
    const multiplier = paytable[first]?.[count as 3 | 4 | 5];
    if (multiplier === undefined) throw new Error(`Slot paytable has no ${count}-symbol payout for ${first}.`);
    winningLines.push({ line: lineIndex + 1, symbol: first, count, multiplier, payout: wager * multiplier });
  }
  return { reels: reels.map((reel) => [...reel]), winningLines, payout: winningLines.reduce((total, win) => total + win.payout, 0) };
}

export function evaluateSlotReels(reels: SlotSymbol[][], wager: number): SlotSpinResult {
  return evaluateConfiguredSlotReels(reels, slotSymbols, slotMultipliers, wager) as SlotSpinResult;
}

export function spinSlots(wager: number, rng: RandomSource = secureRandom): SlotSpinResult {
  const reels = Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => slotSymbols[rng.nextInt(slotSymbols.length)]));
  return evaluateSlotReels(reels, wager);
}

export function spinConfiguredSlots(
  symbols: readonly string[],
  paytable: Readonly<Record<string, SlotPayouts>>,
  wager: number,
  rng: RandomSource = secureRandom,
): ConfiguredSlotSpinResult {
  const reels = Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => symbols[rng.nextInt(symbols.length)]));
  return evaluateConfiguredSlotReels(reels, symbols, paytable, wager);
}
