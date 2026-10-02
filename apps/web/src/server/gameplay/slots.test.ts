import { describe, expect, it } from "vitest";
import { jsonData } from "../http/errors";
import { slotGameCatalog } from "@/shared/slot-catalog";
import { slotDefinitionForSlug } from "./catalog";
import { evaluateConfiguredSlotReels, evaluateSlotReels, spinConfiguredSlots } from "./slots";

const ember = slotDefinitionForSlug("ember-room");
if (!ember) throw new Error("Ember Room test configuration is missing.");

const allFlameMatrix = Array.from({ length: 5 }, () => ["flame", "flame", "flame"]);
const noWinMatrix = [
  ["flame", "coal", "rose"],
  ["coal", "coal", "ember"],
  ["coal", "rose", "flame"],
  ["ember", "rose", "ruby"],
  ["lantern", "rose", "rose"],
];
const oneLineMatrix = [
  ["flame", "ruby", "lantern"],
  ["flame", "ember", "rose"],
  ["flame", "coal", "ruby"],
  ["ruby", "lantern", "ember"],
  ["coal", "ruby", "rose"],
];

describe("configured slot rules", () => {
  it("settles an all-Flame Ember Room matrix as five winning paylines", () => {
    const result = spinConfiguredSlots(ember.symbols, ember.paytable, 10, { nextInt: () => 0 });

    expect(result.reels).toEqual(allFlameMatrix);
    expect(result.winningLines).toHaveLength(5);
    expect(result.winningLines.every((line) => line.symbol === "flame" && line.count === 5 && line.multiplier === 150 && line.payout === 1_500)).toBe(true);
    expect(result.payout).toBe(7_500);
    expect(result.payout - 10).toBe(7_490);
  });

  it("evaluates no-win and single-payline matrices without changing the outcome", () => {
    const noWin = evaluateConfiguredSlotReels(noWinMatrix, ember.symbols, ember.paytable, 10);
    expect(noWin.reels).toEqual(noWinMatrix);
    expect(noWin.winningLines).toEqual([]);
    expect(noWin.payout).toBe(0);

    const oneLine = evaluateConfiguredSlotReels(oneLineMatrix, ember.symbols, ember.paytable, 10);
    expect(oneLine.reels).toEqual(oneLineMatrix);
    expect(oneLine.winningLines).toEqual([{ line: 1, symbol: "flame", count: 3, multiplier: 8, payout: 80 }]);
    expect(oneLine.payout).toBe(80);
  });

  it("rejects invalid matrices instead of silently dropping or remapping symbols", () => {
    expect(() => evaluateConfiguredSlotReels([["flame"]], ember.symbols, ember.paytable, 10)).toThrow("5x3");
    expect(() => evaluateConfiguredSlotReels(allFlameMatrix.map((reel, index) => index === 0 ? ["unknown", ...reel.slice(1)] : reel), ember.symbols, ember.paytable, 10)).toThrow("unknown symbol");
  });

  it("uses the same canonical symbol and paytable contract for every seeded slot", () => {
    for (const [slug, definition] of Object.entries(slotGameCatalog)) {
      expect(slotDefinitionForSlug(slug)?.symbols).toEqual(definition.symbols);
      const result = spinConfiguredSlots(definition.symbols, definition.paytable, 10, { nextInt: () => 0 });
      const firstSymbol = definition.symbols[0];
      expect(result.reels).toEqual(Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => firstSymbol)));
      expect(result.winningLines).toHaveLength(5);
      expect(result.payout).toBe(7_500);
    }
  });
});

describe("Neon Relics rules", () => {
  it("evaluates left-to-right paylines and calculates server payout", () => {
    const result = evaluateSlotReels([
      ["crystal", "diamond", "star"],
      ["crystal", "diamond", "star"],
      ["crystal", "diamond", "star"],
      ["crystal", "diamond", "star"],
      ["crystal", "diamond", "star"],
    ], 10);
    expect(result.winningLines[0]).toMatchObject({ line: 1, symbol: "crystal", count: 5, multiplier: 150, payout: 1500 });
    expect(result.payout).toBeGreaterThanOrEqual(1500);
  });
});

describe("slot response serialization", () => {
  it("preserves the settled reel matrix through the API envelope", async () => {
    const result = evaluateConfiguredSlotReels(allFlameMatrix, ember.symbols, ember.paytable, 10);
    const response = jsonData(result);
    expect(await response.json()).toEqual({ data: result });
  });
});
