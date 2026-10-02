import type { GameplayMode } from "./constants";
import { slotMultipliers, slotSymbols, type SlotSymbol } from "./slots";

export type SlotGameDefinition = {
  mode: "SLOTS";
  symbols: readonly string[];
  paytable: Record<string, Record<3 | 4 | 5, number>>;
};

export type GameplayDefinition =
  | SlotGameDefinition
  | { mode: Exclude<GameplayMode, "SLOTS"> };

const defaultPaytable = Object.fromEntries(slotSymbols.map((symbol) => [symbol, slotMultipliers[symbol]]));

const slotDefinitions: Record<string, SlotGameDefinition> = {
  "neon-relics": { mode: "SLOTS", symbols: slotSymbols, paytable: defaultPaytable },
  "lunar-circuit": {
    mode: "SLOTS",
    symbols: ["moon", "comet", "orbit", "star", "signal", "planet"],
    paytable: { moon: { 3: 8, 4: 30, 5: 150 }, comet: { 3: 6, 4: 20, 5: 100 }, orbit: { 3: 5, 4: 15, 5: 75 }, star: { 3: 4, 4: 12, 5: 60 }, signal: { 3: 3, 4: 10, 5: 40 }, planet: { 3: 2, 4: 8, 5: 25 } },
  },
  "orbit-reels": {
    mode: "SLOTS",
    symbols: ["sun", "ring", "comet", "satellite", "asteroid", "spark"],
    paytable: { sun: { 3: 8, 4: 30, 5: 150 }, ring: { 3: 6, 4: 20, 5: 100 }, comet: { 3: 5, 4: 15, 5: 75 }, satellite: { 3: 4, 4: 12, 5: 60 }, asteroid: { 3: 3, 4: 10, 5: 40 }, spark: { 3: 2, 4: 8, 5: 25 } },
  },
  "ember-room": {
    mode: "SLOTS",
    symbols: ["flame", "ruby", "lantern", "ember", "rose", "coal"],
    paytable: { flame: { 3: 8, 4: 30, 5: 150 }, ruby: { 3: 6, 4: 20, 5: 100 }, lantern: { 3: 5, 4: 15, 5: 75 }, ember: { 3: 4, 4: 12, 5: 60 }, rose: { 3: 3, 4: 10, 5: 40 }, coal: { 3: 2, 4: 8, 5: 25 } },
  },
  "moonlit-mint": {
    mode: "SLOTS",
    symbols: ["mint", "leaf", "pearl", "dew", "luna", "sprig"],
    paytable: { mint: { 3: 8, 4: 30, 5: 150 }, leaf: { 3: 6, 4: 20, 5: 100 }, pearl: { 3: 5, 4: 15, 5: 75 }, dew: { 3: 4, 4: 12, 5: 60 }, luna: { 3: 3, 4: 10, 5: 40 }, sprig: { 3: 2, 4: 8, 5: 25 } },
  },
};

const definitions: Record<string, GameplayDefinition> = {
  ...slotDefinitions,
  "veltrix-blackjack": { mode: "BLACKJACK" },
  "signal-blackjack": { mode: "BLACKJACK" },
  "european-roulette": { mode: "ROULETTE" },
  "velvet-roulette": { mode: "ROULETTE" },
  "afterglow-baccarat": { mode: "BACCARAT" },
  "gilded-dice": { mode: "DICE" },
  "cinder-club": { mode: "DICE" },
  "neon-paddock": { mode: "ARCADE" },
  "tide-chase": { mode: "ARCADE" },
  "prism-pulse": { mode: "ARCADE" },
};

export function gameplayDefinitionForSlug(slug: string) {
  return definitions[slug] ?? null;
}

export function slotDefinitionForSlug(slug: string) {
  const definition = slotDefinitions[slug];
  if (!definition) return null;
  return definition;
}

export type ConfiguredSlotSymbol = SlotSymbol | string;
