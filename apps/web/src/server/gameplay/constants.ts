export const DEMO_WAGERS = [10, 25, 50, 100, 250, 500] as const;
export type DemoWager = (typeof DEMO_WAGERS)[number];

export const MIN_DEMO_WAGER = DEMO_WAGERS[0];
export const MAX_DEMO_WAGER = DEMO_WAGERS[DEMO_WAGERS.length - 1];

export const GAME_SLUGS = {
  slots: "neon-relics",
  blackjack: "veltrix-blackjack",
  roulette: "european-roulette",
} as const;

export type GameplayMode = "SLOTS" | "BLACKJACK" | "ROULETTE" | "BACCARAT" | "DICE" | "ARCADE";

const gameplayModes: Record<string, GameplayMode> = {
  "neon-relics": "SLOTS",
  "lunar-circuit": "SLOTS",
  "orbit-reels": "SLOTS",
  "ember-room": "SLOTS",
  "moonlit-mint": "SLOTS",
  "veltrix-blackjack": "BLACKJACK",
  "signal-blackjack": "BLACKJACK",
  "european-roulette": "ROULETTE",
  "velvet-roulette": "ROULETTE",
  "afterglow-baccarat": "BACCARAT",
  "gilded-dice": "DICE",
  "neon-paddock": "ARCADE",
  "tide-chase": "ARCADE",
  "prism-pulse": "ARCADE",
};

export function gameplayModeForSlug(slug: string) {
  return gameplayModes[slug] ?? null;
}

export function isPlayableGameSlug(slug: string): slug is keyof typeof gameplayModes {
  return Boolean(gameplayModes[slug]);
}

export function isSupportedWager(value: unknown): value is DemoWager {
  return typeof value === "number" && Number.isSafeInteger(value) && (DEMO_WAGERS as readonly number[]).includes(value);
}
