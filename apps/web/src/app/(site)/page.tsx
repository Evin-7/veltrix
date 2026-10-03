import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { GameCard } from "@/components/games/game-card";
import { CasinoComposition } from "@/components/hero/casino-composition";
import { EuropeanRouletteShowcase } from "@/components/hero/european-roulette-showcase";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCurrentUser } from "@/server/auth/session";
import { listPublicGames } from "@/server/games/service";
import { listFavouriteGameIds, listRecentGames } from "@/server/users/service";

export const dynamic = "force-dynamic";

function GameRail({
  games,
  favouriteGameIds,
  priorityCount = 0,
}: {
  games: Awaited<ReturnType<typeof listPublicGames>>["games"];
  favouriteGameIds: string[];
  priorityCount?: number;
}) {
  if (games.length === 0) return null;
  return (
    <div className="game-rail">
      {games.map((game, index) => (
        <GameCard
          compact
          game={game}
          initialIsFavourite={favouriteGameIds.includes(game.id)}
          key={game.id}
          priority={index < priorityCount}
        />
      ))}
    </div>
  );
}

export default async function Home() {
  const [{ games: popularGames }, { games: newGames }, { games: tableGames }, { games: slotGames }, currentUser] = await Promise.all([
    listPublicGames({ includeTotal: false, page: 1, pageSize: 8, popular: true, sort: "popular" }),
    listPublicGames({ includeTotal: false, page: 1, pageSize: 8, new: true, sort: "newest" }),
    listPublicGames({ categories: ["Table Games", "Blackjack", "Roulette", "Live-style"], includeTotal: false, page: 1, pageSize: 8, sort: "popular" }),
    listPublicGames({ category: "Slots", includeTotal: false, page: 1, pageSize: 8, sort: "popular" }),
    getCurrentUser(),
  ]);
  const [favouriteGameIds, recentlyPlayed] =
    currentUser?.role === "PLAYER"
      ? await Promise.all([
          listFavouriteGameIds(currentUser.id),
          listRecentGames(currentUser.id, 6).then((items) =>
            items.map((item) => item.game),
          ),
        ])
      : [[], []];
  return (
    <main>
      <section className="home-hero">
        <div
          aria-hidden="true"
          className="hero-mesh pointer-events-none absolute inset-0 opacity-70"
        />
        <div className="home-hero-inner relative z-10 grid items-center gap-8 lg:grid-cols-[1fr_0.78fr] lg:gap-14">
          <div className="max-w-2xl">
            <Badge tone="mint">
              <span className="h-1.5 w-1.5 rounded-full bg-mint" /> The Veltrix
              collection
            </Badge>
            <h1 className="display mt-5 max-w-xl text-balance text-[3.25rem] font-bold leading-[0.95] text-foreground sm:text-[5.5rem]">
              Play the atmosphere.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-foreground-muted sm:text-lg sm:leading-8">
              Original worlds, crisp decisions, and a lobby built to feel good
              between rounds. Find your next ritual in the Veltrix collection.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                className="button-primary focus-ring inline-flex min-h-12 items-center justify-center rounded-full px-5 text-sm"
                href="/casino"
                prefetch={false}
              >
                Explore the lobby
              </Link>
              <Link
                className="button-secondary focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm"
                href="/rewards"
                prefetch={false}
              >
                View rewards
              </Link>
            </div>
          </div>

          <CasinoComposition />
        </div>
      </section>

      {recentlyPlayed.length > 0 ? (
        <section className="page-shell player-section">
          <SectionHeading
            eyebrow="Pick up where you left off"
            title="Continue playing"
            href="/casino"
            actionLabel="Open history"
          />
          <GameRail
            games={recentlyPlayed}
            favouriteGameIds={favouriteGameIds}
          />
        </section>
      ) : null}
      <section className="page-shell player-section">
        <SectionHeading
          eyebrow="Curated signal"
          title="Trending now"
          href="/casino"
        />
        <GameRail games={popularGames} favouriteGameIds={favouriteGameIds} priorityCount={4} />
      </section>
      <section className="page-shell player-section--large">
        <SectionHeading
          eyebrow="Fresh from the studio"
          title="New releases"
          href="/casino"
        />
        <GameRail games={newGames} favouriteGameIds={favouriteGameIds} />
      </section>

      <EuropeanRouletteShowcase />

      <section className="page-shell player-section--large">
        <SectionHeading
          eyebrow="Table and live-style"
          title="Set the table"
          href="/casino"
        />
        <GameRail games={tableGames} favouriteGameIds={favouriteGameIds} />
      </section>
      <section className="page-shell player-section">
        <SectionHeading
          eyebrow="Slots and reels"
          title="Find your spin"
          href="/casino"
        />
        <GameRail games={slotGames} favouriteGameIds={favouriteGameIds} />
      </section>

      <section className="page-shell player-section--large border-t border-border pt-8">
        <div className="home-cta-section">
          <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <Badge tone="amber">Welcome season</Badge>
              <h2 className="mt-4 max-w-xl text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl">
                A little more atmosphere, without the pressure.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-foreground-muted">
                Browse promotions and rewards designed to keep your collection
                moving. Find your next ritual, then come back for another.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                className="button-primary focus-ring inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-4 text-xs"
                href="/promotions"
                prefetch={false}
              >
                See promotions
              </Link>
              <Link
                className="button-secondary focus-ring inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-4 text-xs"
                href="/responsible-gaming"
                prefetch={false}
              >
                Play responsibly
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
