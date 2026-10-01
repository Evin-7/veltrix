export const gameCategories = ["All", "Slots", "Table Games", "Live-style", "Arcade"] as const;

export type GameCategory = "Slots" | "Table Games" | "Live-style" | "Arcade" | "Blackjack" | "Roulette";
export type GameSort = "popular" | "newest" | "name";
export type GameStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

export type Game = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: GameCategory;
  provider: string;
  providerSlug: string;
  thumbnail: string | null;
  status: GameStatus;
  featured: boolean;
  isNew: boolean;
  popular: boolean;
  demoRtp: string;
  players: string;
  accent: string;
  palette: [string, string];
  symbol: string;
};
