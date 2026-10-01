import type { Metadata } from "next";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { GameCatalog } from "@/features/games/game-catalog";
import { listPublicGames, listPublicProviders } from "@/server/games/service";
import { getCurrentUser } from "@/server/auth/session";
import { listFavouriteGameIds } from "@/server/users/service";

export const metadata: Metadata = {
  title: "Casino lobby",
  description: "Browse fictional games in the Veltrix demo lobby.",
};

export const dynamic = "force-dynamic";

export default async function CasinoPage() {
  const [gamesResult, providers, user] = await Promise.all([
    listPublicGames({ page: 1, pageSize: 100, sort: "popular" }),
    listPublicProviders(),
    getCurrentUser(),
  ]);
  const favouriteGameIds = user?.role === "PLAYER" ? await listFavouriteGameIds(user.id) : [];

  return (
    <main className="page-shell pb-16 pt-10 sm:pb-24 sm:pt-16">
      <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#111925] px-6 py-8 sm:px-10 sm:py-12">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(124,225,192,0.18),transparent_25%),radial-gradient(circle_at_12%_100%,rgba(232,184,106,0.12),transparent_29%)]" />
        <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <Badge tone="mint"><Sparkles size={12} /> The Veltrix lobby</Badge>
            <h1 className="display mt-5 text-5xl leading-[0.95] text-ink sm:text-6xl">Find your next ritual.</h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-muted sm:text-base">Original demo games for curious players. Browse by mood, discover a new favourite, and keep every round comfortably fictional.</p>
          </div>
          <Link className="focus-ring inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-3 text-xs font-semibold text-muted-strong hover:border-white/20 hover:bg-white/[0.09] hover:text-ink" href="/#how-it-works">How this demo works <ArrowRight size={15} /></Link>
        </div>
      </section>

      <section className="mt-10 sm:mt-12">
        <GameCatalog games={gamesResult.games} favouriteGameIds={favouriteGameIds} providers={providers} />
      </section>
    </main>
  );
}
