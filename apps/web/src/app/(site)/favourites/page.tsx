import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FavouritesGrid } from "@/features/games/favourites-grid";
import { getCurrentUser } from "@/server/auth/session";
import { listFavouriteGames } from "@/server/users/service";

export const metadata: Metadata = { title: "Favourites" };
export const dynamic = "force-dynamic";

export default async function FavouritesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/favourites");
  if (user.role !== "PLAYER") redirect("/profile");

  const games = await listFavouriteGames(user.id);
  return <main className="page-shell pb-20 pt-10 sm:pt-16"><div className="max-w-2xl"><p className="eyebrow">Your saved table</p><h1 className="display mt-4 text-5xl leading-none text-ink sm:text-6xl">Favourites</h1><p className="mt-4 text-sm leading-6 text-muted">Games you&apos;ve saved for later.</p></div><section className="mt-9"><FavouritesGrid initialGames={games} /></section></main>;
}
