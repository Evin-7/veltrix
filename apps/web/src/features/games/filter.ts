import type { Game, GameCategory, GameSort } from "./types";

type FilterOptions = {
  query: string;
  category: "All" | GameCategory;
  provider: string;
  sort: GameSort;
};

export function filterGames(games: Game[], options: FilterOptions) {
  const normalizedQuery = options.query.trim().toLowerCase();

  const filtered = games.filter((game) => {
    const matchesQuery = normalizedQuery.length === 0 || `${game.name} ${game.provider}`.toLowerCase().includes(normalizedQuery);
    const matchesCategory = options.category === "All" || game.category === options.category;
    const matchesProvider = options.provider === "All" || game.provider === options.provider || game.providerSlug === options.provider;

    return matchesQuery && matchesCategory && matchesProvider;
  });

  return [...filtered].sort((a, b) => {
    if (options.sort === "name") return a.name.localeCompare(b.name);
    if (options.sort === "newest") return Number(b.isNew) - Number(a.isNew) || a.name.localeCompare(b.name);
    return Number(b.popular) - Number(a.popular) || Number(b.featured) - Number(a.featured);
  });
}
