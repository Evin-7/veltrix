import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { GameplayExperience } from "@/features/gameplay/gameplay-experience";
import { GameplayRouteHeader } from "@/features/gameplay/gameplay-route-header";
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
    <GameplayRouteHeader game={game} initialBalance={wallet.balance} />
    <div className="mx-auto mt-5 max-w-[1160px]" id="veltrix-game-stage"><GameplayExperience game={game} initialBalance={wallet.balance} /></div>
  </div></main>;
}
