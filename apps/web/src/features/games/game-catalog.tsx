"use client";

import {
  Filter,
  Search,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { GameCard } from "@/components/games/game-card";
import { Button } from "@/components/ui/button";
import { VeltrixSelect } from "@/components/ui/veltrix-select";
import { filterGames } from "@/features/games/filter";
import {
  gameCategories,
  type Game,
  type GameCategory,
  type GameSort,
} from "@/features/games/types";

type GameCatalogProps = {
  games: Game[];
  providers: Array<{ id: string; name: string; slug: string }>;
  favouriteGameIds?: string[];
};

export function GameCatalog({
  games,
  providers,
  favouriteGameIds = [],
}: GameCatalogProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"All" | GameCategory>("All");
  const [provider, setProvider] = useState("All");
  const [sort, setSort] = useState<GameSort>("popular");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filteredGames = useMemo(
    () => filterGames(games, { query, category, provider, sort }),
    [category, games, provider, query, sort],
  );
  const hasFilters =
    query.length > 0 || category !== "All" || provider !== "All";

  function clearFilters() {
    setQuery("");
    setCategory("All");
    setProvider("All");
  }

  return (
    <div>
      <div className="border-y border-border py-3 sm:py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search games</span>
            <Search
              aria-hidden="true"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted"
              size={17}
              strokeWidth={1.8}
            />
            <input
              className="focus-ring h-12 w-full rounded-[var(--radius-control)] border border-border bg-surface-hover/40 pl-11 pr-10 text-sm text-foreground outline-none placeholder:text-foreground-muted/70 hover:border-border-strong focus:border-primary/50"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by game or provider"
              type="search"
              value={query}
            />
            {query ? (
              <button
                aria-label="Clear search"
                className="focus-ring absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-foreground-muted hover:bg-surface-hover hover:text-foreground"
                onClick={() => setQuery("")}
                type="button"
              >
                <X size={14} />
              </button>
            ) : null}
          </label>
          <div className="flex gap-2">
            <label className="relative min-w-0 flex-1 sm:min-w-[155px]">
              <span className="sr-only">Sort games</span>
              <VeltrixSelect
                ariaLabel="Sort games"
                className="w-full"
                onValueChange={(nextSort) => setSort(nextSort as GameSort)}
                options={[
                  { label: "Popular", value: "popular" },
                  { label: "Newest", value: "newest" },
                  { label: "A–Z", value: "name" },
                ]}
                value={sort}
              />
            </label>
            <Button
              className="shrink-0 lg:hidden"
              onClick={() => setFiltersOpen((value) => !value)}
              size="md"
              type="button"
            >
              <Filter size={15} /> Filters
            </Button>
          </div>
        </div>
        <div
          aria-label="Game categories"
          className="mt-3 flex gap-2 overflow-x-auto pb-0.5 scrollbar-none"
          role="group"
        >
          {gameCategories.map((item) => (
            <button
              aria-pressed={category === item}
              className={`focus-ring shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold ${category === item ? "border-primary/45 bg-primary/10 text-primary" : "border-border bg-surface-hover/30 text-foreground-muted hover:border-border-strong hover:text-foreground"}`}
              key={item}
              onClick={() => setCategory(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`${filtersOpen ? "block" : "hidden"} mt-3 border-b border-border pb-4 lg:hidden`}
      >
        <label className="block">
          <span className="mb-2 block text-xs font-semibold text-foreground-muted">
            Provider
          </span>
          <VeltrixSelect
            ariaLabel="Filter games by provider"
            onValueChange={setProvider}
            options={[
              { label: "All providers", value: "All" },
              ...providers.map((item) => ({ label: item.name, value: item.slug })),
            ]}
            value={provider}
          />
        </label>
      </div>
      <div className="mt-8 flex items-center justify-between gap-3">
        <p
          aria-live="polite"
          className="text-xs font-semibold text-foreground-muted"
        >
          <span className="text-foreground">{filteredGames.length}</span> games
          in the lobby
        </p>
        <div className="hidden items-center gap-3 lg:flex">
          <label className="flex items-center gap-2 text-xs font-semibold text-foreground-muted">
            <span>Provider</span>
            <VeltrixSelect
              ariaLabel="Filter games by provider"
              className="min-w-[155px]"
              onValueChange={setProvider}
              options={[
                { label: "All providers", value: "All" },
                ...providers.map((item) => ({ label: item.name, value: item.slug })),
              ]}
              size="sm"
              value={provider}
            />
          </label>
          {hasFilters ? (
            <button
              className="focus-ring inline-flex items-center gap-1.5 rounded-full px-2 py-2 text-xs font-semibold text-primary hover:text-foreground"
              onClick={clearFilters}
              type="button"
            >
              <X size={13} /> Clear filters
            </button>
          ) : null}
        </div>
        {hasFilters ? (
          <button
            className="focus-ring inline-flex items-center gap-1.5 rounded-full px-2 py-2 text-xs font-semibold text-primary hover:text-foreground lg:hidden"
            onClick={clearFilters}
            type="button"
          >
            <X size={13} /> Clear
          </button>
        ) : null}
      </div>
      {filteredGames.length > 0 ? (
        <div className="game-grid mt-4">
          {filteredGames.map((game) => (
            <GameCard
              game={game}
              initialIsFavourite={favouriteGameIds.includes(game.id)}
              key={game.id}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 border-y border-border px-6 py-16 text-center">
          <h2 className="mt-5 text-3xl font-bold text-foreground">
            No games found
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-foreground-muted">
            Try a different search or clear your filters to see the full Veltrix
            catalogue.
          </p>
          <Button className="mt-6" onClick={clearFilters} type="button">
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
