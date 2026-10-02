import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GameDetail } from "@/components/games/game-detail";
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

  return <GameDetail game={game} initialIsFavourite={initialIsFavourite} isAuthenticated={currentUser?.role === "PLAYER"} />;
}
