import type { Metadata } from "next";
import { ArrowLeft, Check, Clock3, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GameArtwork } from "@/components/games/game-artwork";
import { Badge } from "@/components/ui/badge";
import { GameActions } from "@/features/games/game-actions";
import { BlackjackPanel, RoulettePanel, SlotsPanel } from "@/features/gameplay/gameplay-panels";
import { getPublicGameBySlug } from "@/server/games/service";
import { getCurrentUser } from "@/server/auth/session";
import { isGameFavourite } from "@/server/users/service";
import { getWalletSummary } from "@/server/wallet/service";

type GamePageProps = {
  params: Promise<{ gameSlug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: GamePageProps): Promise<Metadata> {
  const { gameSlug } = await params;
  const game = await getPublicGameBySlug(gameSlug);
  return { title: game ? game.name : "Game not found" };
}

export default async function GamePage({ params }: GamePageProps) {
  const { gameSlug } = await params;
  const [game, currentUser] = await Promise.all([getPublicGameBySlug(gameSlug), getCurrentUser()]);
  if (!game) notFound();
  const initialIsFavourite = currentUser?.role === "PLAYER" ? await isGameFavourite(currentUser.id, game.id) : false;
  const initialWallet = currentUser?.role === "PLAYER" ? await getWalletSummary(currentUser.id) : null;
  const isPlayable = Boolean(initialWallet && ["neon-relics", "veltrix-blackjack", "european-roulette"].includes(game.slug));

  return (
    <main className="page-shell pb-16 pt-8 sm:pb-24 sm:pt-12">
      <Link className="focus-ring inline-flex items-center gap-2 rounded-full px-1 py-2 text-xs font-semibold text-muted hover:text-ink" href="/casino"><ArrowLeft size={15} /> Back to lobby</Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-center lg:gap-14">
        <div className="surface rounded-[28px] p-3 sm:p-4">
          <GameArtwork className="rounded-[22px]" game={game} />
        </div>
        <div>
          <Badge tone={game.isNew ? "mint" : "amber"}>{game.isNew ? "New arrival" : "Demo preview"}</Badge>
          <h1 className="display mt-5 text-5xl leading-[0.95] text-ink sm:text-6xl">{game.name}</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted">{game.description} This is a fictional experience using Veltrix Credits only.</p>
          {isPlayable ? (
            <div className="mt-8">
              {game.slug === "neon-relics" ? <SlotsPanel initialBalance={initialWallet!.balance} /> : null}
              {game.slug === "veltrix-blackjack" ? <BlackjackPanel initialBalance={initialWallet!.balance} /> : null}
              {game.slug === "european-roulette" ? <RoulettePanel initialBalance={initialWallet!.balance} /> : null}
            </div>
          ) : <GameActions gameSlug={game.slug} initialIsFavourite={initialIsFavourite} isAuthenticated={currentUser?.role === "PLAYER"} />}
          <Link className="focus-ring mt-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-muted-strong hover:bg-white/[0.08] hover:text-ink" href="/casino">Browse other games</Link>
          <div className="mt-8 grid max-w-md grid-cols-3 gap-3 border-y border-white/10 py-5">
            <div><p className="text-[10px] uppercase tracking-[0.12em] text-muted">Category</p><p className="mt-2 text-sm font-semibold text-ink">{game.category}</p></div>
            <div><p className="text-[10px] uppercase tracking-[0.12em] text-muted">Demo RTP</p><p className="mt-2 text-sm font-semibold text-ink">{game.demoRtp}</p></div>
            <div><p className="text-[10px] uppercase tracking-[0.12em] text-muted">Players</p><p className="mt-2 text-sm font-semibold text-ink">{game.players}</p></div>
          </div>
          <ul className="mt-6 grid gap-3 text-xs font-semibold text-muted sm:grid-cols-2">
            <li className="flex items-center gap-2"><Check className="text-mint" size={14} /> Fictional credits only</li>
            <li className="flex items-center gap-2"><ShieldCheck className="text-mint" size={14} /> {isPlayable ? "Server-authoritative play" : "No wager or outcome yet"}</li>
            <li className="flex items-center gap-2"><Clock3 className="text-amber" size={14} /> Short, replayable sessions</li>
            <li className="flex items-center gap-2"><Sparkles className="text-amber" size={14} /> Original Veltrix world</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
