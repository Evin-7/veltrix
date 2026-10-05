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
    { id: "moon", glyph: "☾", label: "Moon", tone: "slot-tone--violet" },
    { id: "comet", glyph: "☄", label: "Comet", tone: "slot-tone--cyan" },
    { id: "orbit", glyph: "◎", label: "Orbit", tone: "slot-tone--indigo" },
    { id: "star", glyph: "✧", label: "Star", tone: "slot-tone--yellow" },
    { id: "signal", glyph: "ϟ", label: "Signal", tone: "slot-tone--amber" },
    { id: "planet", glyph: "●", label: "Planet", tone: "slot-tone--sky" },
  ],
  "orbit-reels": [
    { id: "sun", glyph: "☼", label: "Sun", tone: "slot-tone--amber" },
    { id: "ring", glyph: "◎", label: "Ring", tone: "slot-tone--fuchsia" },
    { id: "comet", glyph: "☄", label: "Comet", tone: "slot-tone--cyan" },
    { id: "satellite", glyph: "✧", label: "Satellite", tone: "slot-tone--sky" },
    { id: "asteroid", glyph: "◆", label: "Asteroid", tone: "slot-tone--slate" },
    { id: "spark", glyph: "✦", label: "Spark", tone: "slot-tone--yellow" },
  ],
  "ember-room": [
    { id: "flame", glyph: "♨", label: "Flame", tone: "slot-tone--orange" },
    { id: "ruby", glyph: "♦", label: "Ruby", tone: "slot-tone--rose" },
    { id: "lantern", glyph: "♢", label: "Lantern", tone: "slot-tone--amber" },
    { id: "ember", glyph: "✺", label: "Ember", tone: "slot-tone--red" },
    { id: "rose", glyph: "✿", label: "Rose", tone: "slot-tone--pink" },
    { id: "coal", glyph: "●", label: "Coal", tone: "slot-tone--slate" },
  ],
  "moonlit-mint": [
    { id: "mint", glyph: "✣", label: "Mint", tone: "slot-tone--emerald" },
    { id: "leaf", glyph: "❧", label: "Leaf", tone: "slot-tone--lime" },
    { id: "pearl", glyph: "◌", label: "Pearl", tone: "slot-tone--sky" },
    { id: "dew", glyph: "◦", label: "Dew", tone: "slot-tone--cyan" },
    { id: "luna", glyph: "☽", label: "Luna", tone: "slot-tone--violet" },
    { id: "sprig", glyph: "⌁", label: "Sprig", tone: "slot-tone--teal" },
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
