import type { GameplayMode } from "./constants";
import { slotGameCatalog } from "@/shared/slot-catalog";

export type SlotGameDefinition = {
  mode: "SLOTS";
  symbols: readonly string[];
  paytable: Readonly<Record<string, Readonly<Record<3 | 4 | 5, number>>>>;
};

export type GameplayDefinition =
  | SlotGameDefinition
  | { mode: Exclude<GameplayMode, "SLOTS"> };

const slotDefinitions: Record<string, SlotGameDefinition> = Object.fromEntries(
  Object.entries(slotGameCatalog).map(([slug, definition]) => [slug, { mode: "SLOTS", ...definition }]),
) as Record<string, SlotGameDefinition>;

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
