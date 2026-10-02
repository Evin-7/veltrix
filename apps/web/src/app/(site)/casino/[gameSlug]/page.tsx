import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GameArtwork } from "@/components/games/game-artwork";
import { Badge } from "@/components/ui/badge";
import { GameActions } from "@/features/games/game-actions";
import { getCurrentUser } from "@/server/auth/session";
import { getPublicGameBySlug } from "@/server/games/service";
import { isGameFavourite } from "@/server/users/service";

type GamePageProps = { params: Promise<{ gameSlug: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: GamePageProps): Promise<Metadata> {
  const { gameSlug } = await params;
  const game = await getPublicGameBySlug(gameSlug);
  return { title: game ? game.name : "Game not found" };
}

export default async function GamePage({ params }: GamePageProps) {
  const { gameSlug } = await params;
  const [game, currentUser] = await Promise.all([
    getPublicGameBySlug(gameSlug),
    getCurrentUser(),
  ]);
  if (!game) notFound();
  const initialIsFavourite =
    currentUser?.role === "PLAYER"
      ? await isGameFavourite(currentUser.id, game.id)
      : false;

  return (
    <main className="page-shell player-page">
      <Link
        className="focus-ring inline-flex items-center gap-2 rounded-full px-1 py-2 text-xs font-semibold text-foreground-muted hover:text-foreground"
        href="/casino"
      >
        <ArrowLeft size={15} /> Back to lobby
      </Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14">
        <div className="overflow-hidden radius-media">
          <GameArtwork className="radius-media" game={game} priority />
        </div>
        <div>
          <Badge tone={game.isNew ? "mint" : "amber"}>
            {game.isNew ? "New arrival" : game.category}
          </Badge>
          <h1 className="display mt-5 text-5xl leading-none text-foreground sm:text-6xl">
            {game.name}
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-foreground-muted">
            {game.description}
          </p>
          <GameActions
            gameName={game.name}
            gameSlug={game.slug}
            initialIsFavourite={initialIsFavourite}
            isAuthenticated={currentUser?.role === "PLAYER"}
          />
          <Link
            className="focus-ring mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface-hover/40 px-5 text-sm font-semibold text-foreground-subtle hover:bg-surface-hover hover:text-foreground"
            href="/casino"
          >
            Browse other games
          </Link>
          <div
            className={`mt-8 grid max-w-md gap-3 border-y border-border py-5 ${game.category === "Arcade" ? "grid-cols-1" : "grid-cols-2"}`}
          >
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-foreground-muted">
                Category
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {game.category}
              </p>
            </div>
            {game.category !== "Arcade" ? (
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-foreground-muted">
                  RTP
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {game.rtp}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <section className="mt-[var(--section-space)] border-y border-border py-5">
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-foreground-muted">
          <span>Clear play limits</span>
          <span>Short, replayable sessions</span>
          <span>Original Veltrix world</span>
        </div>
      </section>
    </main>
  );
}
