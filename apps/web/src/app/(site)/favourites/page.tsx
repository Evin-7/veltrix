import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/layout-primitives";
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
  return (
    <main className="page-shell player-page">
      <PageHeader
        description={"Games you've saved for later."}
        eyebrow="Your saved table"
        title="Favourites"
      />
      <section className="player-section">
        <FavouritesGrid initialGames={games} />
      </section>
    </main>
  );
}
