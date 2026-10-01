import { describe, expect, it } from "vitest";
import { filterGames } from "./filter";

const games = [
  { id: "1", name: "Lunar Circuit", slug: "lunar-circuit", description: "", category: "Slots" as const, provider: "Astra Works", providerSlug: "astra-works", thumbnail: null, status: "ACTIVE" as const, featured: true, isNew: true, popular: true, demoRtp: "96.4%", players: "2.4k", accent: "#82e4c1", palette: ["#153b49", "#172034"] as [string, string], symbol: "◒" },
  { id: "2", name: "Velvet Roulette", slug: "velvet-roulette", description: "", category: "Table Games" as const, provider: "House of V", providerSlug: "house-of-v", thumbnail: null, status: "ACTIVE" as const, featured: true, isNew: false, popular: true, demoRtp: "97.3%", players: "1.8k", accent: "#e9b46a", palette: ["#5e2637", "#1b1425"] as [string, string], symbol: "✦" },
  { id: "3", name: "Gilded Dice", slug: "gilded-dice", description: "", category: "Table Games" as const, provider: "House of V", providerSlug: "house-of-v", thumbnail: null, status: "ACTIVE" as const, featured: false, isNew: true, popular: false, demoRtp: "96.8%", players: "690", accent: "#f4d68c", palette: ["#6a4626", "#261a1d"] as [string, string], symbol: "◆" },
];

describe("filterGames", () => {
  it("matches game names and providers without mutating the seed order", () => {
    const result = filterGames(games, { query: "astra", category: "All", provider: "All", sort: "name" });

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((game) => game.provider === "Astra Works")).toBe(true);
    expect(games[0]?.name).toBe("Lunar Circuit");
  });

  it("combines category and provider filters", () => {
    const result = filterGames(games, { query: "", category: "Table Games", provider: "House of V", sort: "popular" });

    expect(result.map((game) => game.name)).toEqual(["Velvet Roulette", "Gilded Dice"]);
  });

  it("prioritizes new games when newest is selected", () => {
    const result = filterGames(games, { query: "", category: "All", provider: "All", sort: "newest" });

    expect(result.slice(0, 2).every((game) => game.isNew)).toBe(true);
    expect(result[2]?.isNew).toBe(false);
  });
});
