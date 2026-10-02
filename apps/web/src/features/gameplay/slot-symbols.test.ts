import { describe, expect, it } from "vitest";
import { slotGameCatalog } from "@/shared/slot-catalog";
import { getSlotDisplaySymbol, getSlotDisplaySymbols, validateSlotReels } from "./slot-symbols";

describe("slot frontend symbol mapping", () => {
  it("maps every configured symbol ID to distinct display art", () => {
    for (const slug of ["lunar-circuit", "orbit-reels", "ember-room", "moonlit-mint"] as const) {
      const definition = slotGameCatalog[slug];
      const displaySymbols = getSlotDisplaySymbols(slug);

      expect(displaySymbols.map((symbol) => symbol.id)).toEqual(definition.symbols);
      expect(new Set(displaySymbols.map((symbol) => symbol.id)).size).toBe(definition.symbols.length);
      for (const symbol of definition.symbols) {
        expect(getSlotDisplaySymbol(slug, symbol).id).toBe(symbol);
      }
    }
  });

  it("preserves a settled matrix and rejects an unknown symbol", () => {
    const matrix = [
      ["flame", "ruby", "lantern"],
      ["ember", "rose", "coal"],
      ["lantern", "flame", "ruby"],
      ["rose", "coal", "ember"],
      ["ruby", "lantern", "flame"],
    ];

    expect(validateSlotReels("ember-room", matrix)).toEqual(matrix);
    expect(() => validateSlotReels("ember-room", matrix.map((reel, index) => index === 0 ? ["not-a-flame", ...reel.slice(1)] : reel))).toThrow("unknown slot symbol");
    expect(() => getSlotDisplaySymbol("ember-room", "not-a-flame")).toThrow("Unknown ember-room slot symbol");
  });

  it("rejects a missing renderer instead of falling back to another game", () => {
    expect(() => getSlotDisplaySymbols("unknown-slot")).toThrow("No slot configuration");
  });
});
