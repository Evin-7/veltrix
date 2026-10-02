export type SlotPayouts = Readonly<Record<3 | 4 | 5, number>>;

export type SlotCatalogEntry = {
  readonly symbols: readonly string[];
  readonly paytable: Readonly<Record<string, SlotPayouts>>;
};

export const slotGameCatalog = {
  "neon-relics": {
    symbols: ["crystal", "crown", "orb", "star", "lightning", "diamond"],
    paytable: {
      crystal: { 3: 8, 4: 30, 5: 150 },
      crown: { 3: 6, 4: 20, 5: 100 },
      orb: { 3: 5, 4: 15, 5: 75 },
      star: { 3: 4, 4: 12, 5: 60 },
      lightning: { 3: 3, 4: 10, 5: 40 },
      diamond: { 3: 2, 4: 8, 5: 25 },
    },
  },
  "lunar-circuit": {
    symbols: ["moon", "comet", "orbit", "star", "signal", "planet"],
    paytable: {
      moon: { 3: 8, 4: 30, 5: 150 },
      comet: { 3: 6, 4: 20, 5: 100 },
      orbit: { 3: 5, 4: 15, 5: 75 },
      star: { 3: 4, 4: 12, 5: 60 },
      signal: { 3: 3, 4: 10, 5: 40 },
      planet: { 3: 2, 4: 8, 5: 25 },
    },
  },
  "orbit-reels": {
    symbols: ["sun", "ring", "comet", "satellite", "asteroid", "spark"],
    paytable: {
      sun: { 3: 8, 4: 30, 5: 150 },
      ring: { 3: 6, 4: 20, 5: 100 },
      comet: { 3: 5, 4: 15, 5: 75 },
      satellite: { 3: 4, 4: 12, 5: 60 },
      asteroid: { 3: 3, 4: 10, 5: 40 },
      spark: { 3: 2, 4: 8, 5: 25 },
    },
  },
  "ember-room": {
    symbols: ["flame", "ruby", "lantern", "ember", "rose", "coal"],
    paytable: {
      flame: { 3: 8, 4: 30, 5: 150 },
      ruby: { 3: 6, 4: 20, 5: 100 },
      lantern: { 3: 5, 4: 15, 5: 75 },
      ember: { 3: 4, 4: 12, 5: 60 },
      rose: { 3: 3, 4: 10, 5: 40 },
      coal: { 3: 2, 4: 8, 5: 25 },
    },
  },
  "moonlit-mint": {
    symbols: ["mint", "leaf", "pearl", "dew", "luna", "sprig"],
    paytable: {
      mint: { 3: 8, 4: 30, 5: 150 },
      leaf: { 3: 6, 4: 20, 5: 100 },
      pearl: { 3: 5, 4: 15, 5: 75 },
      dew: { 3: 4, 4: 12, 5: 60 },
      luna: { 3: 3, 4: 10, 5: 40 },
      sprig: { 3: 2, 4: 8, 5: 25 },
    },
  },
} as const satisfies Record<string, SlotCatalogEntry>;

export type SlotGameSlug = keyof typeof slotGameCatalog;

export function slotCatalogForSlug(slug: string) {
  return slotGameCatalog[slug as SlotGameSlug] ?? null;
}
