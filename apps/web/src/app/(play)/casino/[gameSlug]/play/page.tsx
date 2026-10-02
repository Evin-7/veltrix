import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GameplayExperience } from "@/features/gameplay/gameplay-experience";
import { FullscreenButton } from "@/features/gameplay/fullscreen-button";
import { getCurrentUser } from "@/server/auth/session";
import { getPublicGameBySlug } from "@/server/games/service";
import { getWalletSummary } from "@/server/wallet/service";

type PlayPageProps = { params: Promise<{ gameSlug: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PlayPageProps): Promise<Metadata> {
  const { gameSlug } = await params;
  const game = await getPublicGameBySlug(gameSlug);
  return { title: game ? `Play ${game.name}` : "Game not found" };
}

export default async function PlayPage({ params }: PlayPageProps) {
  const { gameSlug } = await params;
  const next = `/casino/${gameSlug}/play`;
  const currentUser = await getCurrentUser();
  if (currentUser?.role !== "PLAYER") redirect(`/login?next=${encodeURIComponent(next)}`);
  const [game, wallet] = await Promise.all([getPublicGameBySlug(gameSlug), getWalletSummary(currentUser.id)]);
  if (!game) notFound();

  return <main className="gameplay-page bg-background"><div className="mx-auto max-w-[1280px]">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4"><div className="flex min-w-0 items-center gap-4"><Link aria-label="Back to game details" className="focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground-muted hover:text-foreground" href={`/casino/${game.slug}`}><ArrowLeft size={17} /></Link><div className="min-w-0"><p className="eyebrow">{game.category}</p><h1 className="display truncate text-2xl text-foreground sm:text-3xl">{game.name}</h1></div></div><div className="flex items-center gap-2"><div className="inline-flex items-center rounded-full border border-success/30 bg-success/10 px-3 py-2 text-xs font-bold text-success"><span>{wallet.balance.toLocaleString("en-US")} VC</span></div><FullscreenButton targetId="veltrix-game-stage" /></div></header>
    <div className="mx-auto mt-5 max-w-[1160px]" id="veltrix-game-stage"><GameplayExperience game={game} initialBalance={wallet.balance} /></div>
  </div></main>;
}
