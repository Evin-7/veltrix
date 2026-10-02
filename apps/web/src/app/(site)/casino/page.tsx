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
    <main className="page-shell player-page">
      <section className="casino-lobby-intro">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,color-mix(in_srgb,var(--accent)_18%,transparent),transparent_25%),radial-gradient(circle_at_12%_100%,color-mix(in_srgb,var(--primary)_12%,transparent),transparent_29%)]"
        />
        <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
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
            className="focus-ring inline-flex shrink-0 items-center rounded-full border border-border bg-surface-hover/60 px-4 py-3 text-xs font-semibold text-muted-strong hover:border-border-strong hover:bg-surface-hover hover:text-ink"
            href="/responsible-gaming"
          >
            Play responsibly
          </Link>
        </div>
      </section>

      <section className="player-section">
        <GameCatalog
          games={gamesResult.games}
          favouriteGameIds={favouriteGameIds}
          providers={providers}
        />
      </section>
    </main>
  );
}
