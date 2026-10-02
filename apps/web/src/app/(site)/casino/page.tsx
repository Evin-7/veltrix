import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { GameCatalog } from "@/features/games/game-catalog";
import { listPublicGames, listPublicProviders } from "@/server/games/service";
import { getCurrentUser } from "@/server/auth/session";
import { listFavouriteGameIds } from "@/server/users/service";

export const metadata: Metadata = {
  title: "Casino lobby",
  description: "Browse the Veltrix collection and find your next ritual.",
};

export const dynamic = "force-dynamic";

export default async function CasinoPage() {
  const [gamesResult, providers, user] = await Promise.all([
    listPublicGames({ page: 1, pageSize: 100, sort: "popular" }),
    listPublicProviders(),
    getCurrentUser(),
  ]);
  const favouriteGameIds =
    user?.role === "PLAYER" ? await listFavouriteGameIds(user.id) : [];

  return (
    <main className="player-page">
      <section className="casino-lobby-intro">
        <div className="page-shell relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <Badge tone="mint">The Veltrix lobby</Badge>
            <h1 className="display mt-5 text-5xl leading-[0.95] text-ink sm:text-6xl">
              Find your next ritual.
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-muted sm:text-base">
              Original games for curious players. Browse by mood, discover a new
              favourite, and settle into your next ritual.
            </p>
          </div>
          <Link
            className="button-secondary focus-ring inline-flex shrink-0 items-center rounded-full px-4 py-3 text-xs"
            href="/responsible-gaming"
          >
            Play responsibly
          </Link>
        </div>
      </section>

      <section className="page-shell player-section">
        <GameCatalog
          games={gamesResult.games}
          favouriteGameIds={favouriteGameIds}
          providers={providers}
        />
      </section>
    </main>
  );
}
