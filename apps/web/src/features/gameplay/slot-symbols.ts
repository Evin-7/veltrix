import { slotCatalogForSlug, type SlotGameSlug } from "@/shared/slot-catalog";

export type SlotDisplaySymbol = {
  id: string;
  glyph: string;
  label: string;
  tone: string;
};

type ConfiguredSlotSlug = Exclude<SlotGameSlug, "neon-relics">;

const slotDisplaySymbols = {
  "lunar-circuit": [
    { id: "moon", glyph: "☾", label: "Moon", tone: "text-violet-200" },
    { id: "comet", glyph: "☄", label: "Comet", tone: "text-cyan-200" },
    { id: "orbit", glyph: "◎", label: "Orbit", tone: "text-indigo-200" },
    { id: "star", glyph: "✧", label: "Star", tone: "text-yellow-100" },
    { id: "signal", glyph: "ϟ", label: "Signal", tone: "text-amber-200" },
    { id: "planet", glyph: "●", label: "Planet", tone: "text-sky-200" },
  ],
  "orbit-reels": [
    { id: "sun", glyph: "☼", label: "Sun", tone: "text-amber-200" },
    { id: "ring", glyph: "◎", label: "Ring", tone: "text-fuchsia-200" },
    { id: "comet", glyph: "☄", label: "Comet", tone: "text-cyan-200" },
    { id: "satellite", glyph: "✧", label: "Satellite", tone: "text-sky-200" },
    { id: "asteroid", glyph: "◆", label: "Asteroid", tone: "text-slate-200" },
    { id: "spark", glyph: "✦", label: "Spark", tone: "text-yellow-100" },
  ],
  "ember-room": [
    { id: "flame", glyph: "♨", label: "Flame", tone: "text-orange-200" },
    { id: "ruby", glyph: "♦", label: "Ruby", tone: "text-rose-200" },
    { id: "lantern", glyph: "♢", label: "Lantern", tone: "text-amber-200" },
    { id: "ember", glyph: "✺", label: "Ember", tone: "text-red-200" },
    { id: "rose", glyph: "✿", label: "Rose", tone: "text-pink-200" },
    { id: "coal", glyph: "●", label: "Coal", tone: "text-slate-300" },
  ],
  "moonlit-mint": [
    { id: "mint", glyph: "✣", label: "Mint", tone: "text-emerald-200" },
    { id: "leaf", glyph: "❧", label: "Leaf", tone: "text-lime-200" },
    { id: "pearl", glyph: "◌", label: "Pearl", tone: "text-sky-100" },
    { id: "dew", glyph: "◦", label: "Dew", tone: "text-cyan-100" },
    { id: "luna", glyph: "☽", label: "Luna", tone: "text-violet-200" },
    { id: "sprig", glyph: "⌁", label: "Sprig", tone: "text-teal-200" },
  ],
} as const satisfies Record<ConfiguredSlotSlug, readonly SlotDisplaySymbol[]>;

export class InvalidSlotOutcomeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSlotOutcomeError";
  }
}

function invalidOutcome(message: string): never {
  throw new InvalidSlotOutcomeError(message);
}

export function getSlotDisplaySymbols(gameSlug: string): readonly SlotDisplaySymbol[] {
  const definition = slotCatalogForSlug(gameSlug);
  if (!definition) return invalidOutcome(`No slot configuration exists for ${gameSlug}.`);
  if (gameSlug === "neon-relics") return invalidOutcome("Neon Relics uses its dedicated symbol renderer.");

  const displaySymbols = slotDisplaySymbols[gameSlug as ConfiguredSlotSlug];
  if (!displaySymbols) return invalidOutcome(`No slot renderer exists for ${gameSlug}.`);
  if (displaySymbols.length !== definition.symbols.length || displaySymbols.some((symbol, index) => symbol.id !== definition.symbols[index])) {
    return invalidOutcome(`Slot renderer symbols do not match the ${gameSlug} server configuration.`);
  }
  return displaySymbols;
}

export function getSlotDisplaySymbol(gameSlug: string, symbolId: string) {
  const symbol = getSlotDisplaySymbols(gameSlug).find((item) => item.id === symbolId);
  if (!symbol) return invalidOutcome(`Unknown ${gameSlug} slot symbol: ${symbolId}.`);
  return symbol;
}

export function validateSlotReels(gameSlug: string, reels: unknown): string[][] {
  const definition = slotCatalogForSlug(gameSlug);
  if (!definition) return invalidOutcome(`No slot configuration exists for ${gameSlug}.`);
  if (!Array.isArray(reels) || reels.length !== 5) {
    return invalidOutcome(`${gameSlug} returned an invalid 5x3 slot matrix.`);
  }
  const matrix = reels as unknown[];
  if (matrix.some((reel) => !Array.isArray(reel) || reel.length !== 3)) {
    return invalidOutcome(`${gameSlug} returned an invalid 5x3 slot matrix.`);
  }

  const allowedSymbols: ReadonlySet<string> = new Set(definition.symbols);
  return matrix.map((reel) => (reel as unknown[]).map((symbol: unknown) => {
    if (typeof symbol !== "string" || !allowedSymbols.has(symbol)) {
      return invalidOutcome(`${gameSlug} returned an unknown slot symbol.`);
    }
    return symbol;
  }));
}
