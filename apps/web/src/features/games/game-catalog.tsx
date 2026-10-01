"use client";

import { ChevronDown, Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { GameCard } from "@/components/games/game-card";
import { Button } from "@/components/ui/button";
import { filterGames } from "@/features/games/filter";
import { gameCategories, type Game, type GameCategory, type GameSort } from "@/features/games/types";

type GameCatalogProps = {
  games: Game[];
  providers: Array<{ id: string; name: string; slug: string }>;
  favouriteGameIds?: string[];
};

export function GameCatalog({ games, providers, favouriteGameIds = [] }: GameCatalogProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"All" | GameCategory>("All");
  const [provider, setProvider] = useState("All");
  const [sort, setSort] = useState<GameSort>("popular");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filteredGames = useMemo(() => filterGames(games, { query, category, provider, sort }), [category, games, provider, query, sort]);
  const hasFilters = query.length > 0 || category !== "All" || provider !== "All";

  function clearFilters() {
    setQuery("");
    setCategory("All");
    setProvider("All");
  }

  return (
    <div>
      <div className="surface rounded-[24px] p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search games</span>
            <Search aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={17} strokeWidth={1.8} />
            <input className="focus-ring h-12 w-full rounded-full border border-white/10 bg-white/[0.04] pl-11 pr-10 text-sm text-ink outline-none placeholder:text-muted/70 hover:border-white/20 focus:border-amber/50" onChange={(event) => setQuery(event.target.value)} placeholder="Search by game or provider" type="search" value={query} />
            {query ? <button aria-label="Clear search" className="focus-ring absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-white/[0.08] hover:text-ink" onClick={() => setQuery("")} type="button"><X size={14} /></button> : null}
          </label>
          <div className="flex gap-2">
            <label className="relative min-w-0 flex-1 sm:min-w-[155px]">
              <span className="sr-only">Sort games</span>
              <SlidersHorizontal aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={15} strokeWidth={1.8} />
              <select className="focus-ring h-12 w-full appearance-none rounded-full border border-white/10 bg-white/[0.04] pl-10 pr-9 text-xs font-semibold text-muted-strong outline-none hover:border-white/20 focus:border-amber/50" onChange={(event) => setSort(event.target.value as GameSort)} value={sort}>
                <option value="popular">Sort: Popular</option>
                <option value="newest">Sort: Newest</option>
                <option value="name">Sort: A–Z</option>
              </select>
              <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" size={14} />
            </label>
            <Button className="shrink-0 lg:hidden" onClick={() => setFiltersOpen((value) => !value)} size="md" type="button"><Filter size={15} /> Filters</Button>
          </div>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5 scrollbar-none" aria-label="Game categories" role="group">
          {gameCategories.map((item) => (
            <button aria-pressed={category === item} className={`focus-ring shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold ${category === item ? "border-amber/45 bg-amber/10 text-amber-bright" : "border-white/10 bg-white/[0.02] text-muted hover:border-white/20 hover:text-ink"}`} key={item} onClick={() => setCategory(item)} type="button">{item}</button>
          ))}
        </div>
      </div>

      <div className={`${filtersOpen ? "block" : "hidden"} mt-3 rounded-[20px] border border-white/10 bg-[#10151f] p-4 lg:hidden`}>
        <label className="block"><span className="mb-2 block text-xs font-semibold text-muted-strong">Provider</span><select className="focus-ring h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-ink outline-none" onChange={(event) => setProvider(event.target.value)} value={provider}><option value="All">All providers</option>{providers.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label>
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <p aria-live="polite" className="text-xs font-semibold text-muted"><span className="text-ink">{filteredGames.length}</span> games in the lobby</p>
        <div className="hidden items-center gap-3 lg:flex">
          <label className="flex items-center gap-2 text-xs font-semibold text-muted"><span>Provider</span><select className="focus-ring h-9 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs text-muted-strong outline-none hover:border-white/20" onChange={(event) => setProvider(event.target.value)} value={provider}><option value="All">All providers</option>{providers.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label>
          {hasFilters ? <button className="focus-ring inline-flex items-center gap-1.5 rounded-full px-2 py-2 text-xs font-semibold text-amber-bright hover:text-ink" onClick={clearFilters} type="button"><X size={13} /> Clear filters</button> : null}
        </div>
        {hasFilters ? <button className="focus-ring inline-flex items-center gap-1.5 rounded-full px-2 py-2 text-xs font-semibold text-amber-bright hover:text-ink lg:hidden" onClick={clearFilters} type="button"><X size={13} /> Clear</button> : null}
      </div>

      {filteredGames.length > 0 ? <div className="game-grid mt-4">{filteredGames.map((game) => <GameCard game={game} initialIsFavourite={favouriteGameIds.includes(game.id)} key={game.id} />)}</div> : (
        <div className="surface mt-4 rounded-[24px] px-6 py-20 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-muted"><Search size={20} /></div>
          <h2 className="display mt-5 text-3xl text-ink">No games found</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">Try a different search or clear your filters to see the full Veltrix catalogue.</p>
          <Button className="mt-6" onClick={clearFilters} type="button">Clear filters</Button>
        </div>
      )}
    </div>
  );
}
