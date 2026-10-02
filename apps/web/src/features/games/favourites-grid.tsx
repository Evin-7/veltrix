"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { GameCard } from "@/components/games/game-card";
import type { Game } from "@/features/games/types";

export function FavouritesGrid({ initialGames }: { initialGames: Game[] }) {
  const [games, setGames] = useState(initialGames);

  useEffect(() => {
    function handleFavouriteChange(event: Event) {
      const detail = (
        event as CustomEvent<{ slug?: string; isFavourite?: boolean }>
      ).detail;
      if (detail.slug && detail.isFavourite === false)
        setGames((current) =>
          current.filter((game) => game.slug !== detail.slug),
        );
    }

    window.addEventListener("veltrix:favourite-changed", handleFavouriteChange);
    return () =>
      window.removeEventListener(
        "veltrix:favourite-changed",
        handleFavouriteChange,
      );
  }, []);

  if (games.length === 0) {
    return (
      <div className="py-16 text-center sm:py-20">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-favorite/20 bg-favorite/10 text-favorite">
          <Heart fill="currentColor" size={22} />
        </span>
        <h2 className="display mt-6 text-3xl text-foreground">
          No favourites yet
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-foreground-muted">
          Save games using the heart icon and they&apos;ll appear here.
        </p>
        <Link
          className="button-primary focus-ring mt-7 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] px-5 text-sm"
          href="/casino"
        >
          Explore casino
        </Link>
      </div>
    );
  }

  return (
    <div className="game-grid">
      {games.map((game) => (
        <GameCard game={game} initialIsFavourite key={game.id} />
      ))}
    </div>
  );
}
