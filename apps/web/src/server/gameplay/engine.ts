import { dealBlackjack, doubleBlackjack, hitBlackjack, standBlackjack, type BlackjackState } from "./blackjack";
import { spinRoulette, type RouletteBet, type RouletteSpinResult } from "./roulette";
import { spinSlots, type SlotSpinResult } from "./slots";
import type { RandomSource } from "./random";

export interface GameEngine<Input, Output> {
  readonly id: "SLOTS" | "BLACKJACK" | "ROULETTE";
  resolve(input: Input, rng?: RandomSource): Output;
}

export const slotsEngine: GameEngine<number, SlotSpinResult> = {
  id: "SLOTS",
  resolve: (wager, rng) => spinSlots(wager, rng),
};

export const rouletteEngine: GameEngine<{ wager: number; bet: RouletteBet }, RouletteSpinResult> = {
  id: "ROULETTE",
  resolve: ({ wager, bet }, rng) => spinRoulette(wager, bet, rng),
};

export const blackjackEngine = {
  id: "BLACKJACK" as const,
  deal: dealBlackjack,
  hit: hitBlackjack,
  stand: standBlackjack,
  double: doubleBlackjack,
};

export { payoutForBlackjack, publicBlackjackState } from "./blackjack";
export type { BlackjackState };
