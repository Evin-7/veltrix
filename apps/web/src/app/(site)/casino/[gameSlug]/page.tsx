import type { Metadata } from "next";
import { ArrowLeft, Check, Clock3, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GameArtwork } from "@/components/games/game-artwork";
import { Badge } from "@/components/ui/badge";
import { GameActions } from "@/features/games/game-actions";
import { BlackjackPanel, RoulettePanel } from "@/features/gameplay/gameplay-panels";
import { NeonRelicsPanel } from "@/features/gameplay/neon-relics-panel";
import { SessionReminderNotice } from "@/features/responsible-gaming/session-reminder";
import { getCurrentUser } from "@/server/auth/session";
import { getPublicGameBySlug } from "@/server/games/service";
import { isGameFavourite } from "@/server/users/service";
import { getWalletSummary } from "@/server/wallet/service";

type GamePageProps = { params: Promise<{ gameSlug: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: GamePageProps): Promise<Metadata> {
  const { gameSlug } = await params;
  const game = await getPublicGameBySlug(gameSlug);
  return { title: game ? game.name : "Game not found" };
}

function playableMeta(slug: string) {
  if (slug === "neon-relics") return "Five reels · Three rows · Five fixed paylines";
  if (slug === "veltrix-blackjack") return "Blackjack table · Dealer stands on soft 17";
  return "European wheel · Single zero · Classic outside bets";
}

export default async function GamePage({ params }: GamePageProps) {
  const { gameSlug } = await params;
  const [game, currentUser] = await Promise.all([getPublicGameBySlug(gameSlug), getCurrentUser()]);
  if (!game) notFound();
  const initialIsFavourite = currentUser?.role === "PLAYER" ? await isGameFavourite(currentUser.id, game.id) : false;
  const initialWallet = currentUser?.role === "PLAYER" ? await getWalletSummary(currentUser.id) : null;
  const isPlayable = Boolean(initialWallet && ["neon-relics", "veltrix-blackjack", "european-roulette"].includes(game.slug));

  return <main className="page-shell pb-16 pt-8 sm:pb-24 sm:pt-12">
    <Link className="focus-ring inline-flex items-center gap-2 rounded-full px-1 py-2 text-xs font-semibold text-foreground-muted hover:text-foreground" href="/casino"><ArrowLeft size={15} /> Back to lobby</Link>
    {isPlayable ? <>
      <header className="mt-5 flex flex-col justify-between gap-5 border-b border-border pb-6 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold text-foreground-muted">Casino / {game.category}</p><div className="mt-4 flex flex-wrap items-center gap-2"><Badge tone="mint">Demo play</Badge><span className="text-[11px] font-semibold text-foreground-muted">{game.provider}</span></div><h1 className="display mt-4 text-4xl leading-none text-foreground sm:text-6xl">{game.name}</h1><p className="mt-3 text-sm font-medium text-foreground-muted sm:text-base">{playableMeta(game.slug)} · VC has no monetary value</p></div><div className="flex items-center gap-2 text-xs font-semibold text-foreground-muted"><span className="grid h-8 w-8 place-items-center rounded-xl border border-success/25 bg-success/10 text-success"><ShieldCheck size={15} /></span>Fictional credits only</div></header>
      <div className="mt-6"><SessionReminderNotice />{game.slug === "neon-relics" ? <NeonRelicsPanel initialBalance={initialWallet!.balance} /> : null}{game.slug === "veltrix-blackjack" ? <BlackjackPanel initialBalance={initialWallet!.balance} /> : null}{game.slug === "european-roulette" ? <RoulettePanel initialBalance={initialWallet!.balance} /> : null}</div>
      <section className="surface-subtle mt-5 rounded-[24px] p-6 sm:p-8"><div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-start"><div><p className="eyebrow">Game information</p><h2 className="display mt-2 text-2xl text-foreground">A considered demo table.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-foreground-muted">{game.description} Every round uses Veltrix Credits, which are fictional demonstration credits with no monetary value.</p></div><div className="grid grid-cols-2 gap-x-8 gap-y-4 text-xs sm:grid-cols-3"><div><p className="text-[10px] uppercase tracking-[0.14em] text-foreground-muted">Category</p><p className="mt-1 font-semibold text-foreground">{game.category}</p></div><div><p className="text-[10px] uppercase tracking-[0.14em] text-foreground-muted">Demo RTP</p><p className="mt-1 font-semibold text-foreground">{game.demoRtp}</p></div><div><p className="text-[10px] uppercase tracking-[0.14em] text-foreground-muted">Players</p><p className="mt-1 font-semibold text-foreground">{game.players}</p></div></div></div><div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 border-t border-border pt-5 text-xs font-semibold text-foreground-muted"><span className="inline-flex items-center gap-2"><Check className="text-success" size={14} /> No deposits or withdrawals</span><span className="inline-flex items-center gap-2"><Clock3 className="text-primary" size={14} /> Short, replayable sessions</span><span className="inline-flex items-center gap-2"><Sparkles className="text-primary" size={14} /> Original Veltrix world</span></div></section>
    </> : <div className="mt-6 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14"><div className="surface rounded-[28px] p-3 sm:p-4"><GameArtwork className="rounded-[22px]" game={game} priority /></div><div><Badge tone={game.isNew ? "mint" : "amber"}>{game.isNew ? "New arrival" : "Demo preview"}</Badge><h1 className="display mt-5 text-5xl leading-none text-foreground sm:text-6xl">{game.name}</h1><p className="mt-5 max-w-lg text-base leading-7 text-foreground-muted">{game.description} This is a fictional experience using Veltrix Credits only.</p><GameActions gameName={game.name} gameSlug={game.slug} initialIsFavourite={initialIsFavourite} isAuthenticated={currentUser?.role === "PLAYER"} /><Link className="focus-ring mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface-hover/40 px-5 text-sm font-semibold text-foreground-subtle hover:bg-surface-hover hover:text-foreground" href="/casino">Browse other games</Link><div className="mt-8 grid max-w-md grid-cols-3 gap-3 border-y border-border py-5"><div><p className="text-[10px] uppercase tracking-[0.12em] text-foreground-muted">Category</p><p className="mt-2 text-sm font-semibold text-foreground">{game.category}</p></div><div><p className="text-[10px] uppercase tracking-[0.12em] text-foreground-muted">Demo RTP</p><p className="mt-2 text-sm font-semibold text-foreground">{game.demoRtp}</p></div><div><p className="text-[10px] uppercase tracking-[0.12em] text-foreground-muted">Players</p><p className="mt-2 text-sm font-semibold text-foreground">{game.players}</p></div></div></div></div>}
  </main>;
}
