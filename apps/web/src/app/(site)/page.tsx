import { ArrowRight, Check, Clock3, ShieldCheck, Sparkles, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { GameCard } from "@/components/games/game-card";
import { CasinoComposition } from "@/components/hero/casino-composition";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCurrentUser } from "@/server/auth/session";
import { listPublicGames } from "@/server/games/service";
import { listFavouriteGameIds, listRecentGames } from "@/server/users/service";

export const dynamic = "force-dynamic";

function GameRail({ games, favouriteGameIds }: { games: Awaited<ReturnType<typeof listPublicGames>>["games"]; favouriteGameIds: string[] }) {
  if (games.length === 0) return null;
  return <div className="game-rail">{games.map((game) => <GameCard compact game={game} initialIsFavourite={favouriteGameIds.includes(game.id)} key={game.id} />)}</div>;
}

export default async function Home() {
  const [{ games }, currentUser] = await Promise.all([listPublicGames({ page: 1, pageSize: 100, sort: "popular" }), getCurrentUser()]);
  const favouriteGameIds = currentUser?.role === "PLAYER" ? await listFavouriteGameIds(currentUser.id) : [];
  const recentlyPlayed = currentUser?.role === "PLAYER" ? (await listRecentGames(currentUser.id, 6)).map((item) => item.game) : [];
  const popularGames = games.filter((game) => game.popular).slice(0, 8);
  const newGames = games.filter((game) => game.isNew).slice(0, 8);
  const tableGames = games.filter((game) => ["Table Games", "Blackjack", "Roulette", "Live-style"].includes(game.category)).slice(0, 8);
  const slotGames = games.filter((game) => game.category === "Slots").slice(0, 8);

  return (
    <main>
      <section className="page-shell relative overflow-hidden pb-12 pt-8 sm:pb-16 sm:pt-12">
        <div aria-hidden="true" className="hero-mesh pointer-events-none absolute inset-x-[-20%] top-0 h-[520px] opacity-70" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_0.78fr] lg:gap-14">
          <div className="max-w-2xl">
            <Badge tone="mint"><span className="h-1.5 w-1.5 rounded-full bg-mint" /> 100% fictional credits</Badge>
            <h1 className="display mt-5 max-w-xl text-balance text-[3.25rem] font-bold leading-[0.95] text-foreground sm:text-[5.5rem]">Play the atmosphere.</h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-foreground-muted sm:text-lg sm:leading-8">Original worlds, crisp decisions, and a lobby built to feel good between rounds. Explore Veltrix with zero deposits and no real-money wagering.</p>
            <div className="mt-7 flex flex-wrap items-center gap-3"><Link className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-primary/60 bg-primary px-5 text-sm font-semibold text-background hover:border-primary-hover hover:bg-primary-hover" href="/casino">Explore the lobby <ArrowRight size={16} /></Link><Link className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-border bg-surface/60 px-5 text-sm font-semibold text-foreground-subtle hover:bg-surface-hover hover:text-foreground" href="/rewards"><Trophy size={16} /> View rewards</Link></div>
            <div className="mt-8 grid max-w-md grid-cols-3 gap-3 border-t border-border pt-5 text-xs font-semibold text-foreground-muted"><span className="inline-flex items-center gap-2"><Check className="text-success" size={14} /> No deposits</span><span className="inline-flex items-center gap-2"><Check className="text-success" size={14} /> Virtual only</span><span className="inline-flex items-center gap-2"><Check className="text-success" size={14} /> Server-led</span></div>
          </div>

          <CasinoComposition />
        </div>
      </section>

      {recentlyPlayed.length > 0 ? <section className="page-shell pb-10"><SectionHeading eyebrow="Pick up where you left off" title="Continue playing" href="/casino" actionLabel="Open history" /><GameRail games={recentlyPlayed} favouriteGameIds={favouriteGameIds} /></section> : null}
      <section className="page-shell pb-10"><SectionHeading eyebrow="Curated signal" title="Trending now" href="/casino" /><GameRail games={popularGames} favouriteGameIds={favouriteGameIds} /></section>
      <section className="page-shell pb-10"><SectionHeading eyebrow="Fresh from the studio" title="New releases" href="/casino" /><GameRail games={newGames} favouriteGameIds={favouriteGameIds} /></section>

      <section className="page-shell pb-12"><div className="grid gap-3 sm:grid-cols-3"><div className="surface-subtle rounded-[22px] p-5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><Sparkles size={17} /></span><p className="mt-5 text-sm font-semibold text-foreground">Original worlds</p><p className="mt-2 text-xs leading-5 text-foreground-muted">Every title, cover, and provider is fictional and built for this demo.</p></div><div className="surface-subtle rounded-[22px] p-5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/10 text-accent"><Clock3 size={17} /></span><p className="mt-5 text-sm font-semibold text-foreground">A better rhythm</p><p className="mt-2 text-xs leading-5 text-foreground-muted">Short sessions, visible limits, and a lobby that stays easy to navigate.</p></div><div className="surface-subtle rounded-[22px] p-5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-success/10 text-success"><ShieldCheck size={17} /></span><p className="mt-5 text-sm font-semibold text-foreground">Responsible by default</p><p className="mt-2 text-xs leading-5 text-foreground-muted">Virtual credits have no monetary value. Pause controls are always close.</p></div></div></section>

      <section className="page-shell pb-10"><SectionHeading eyebrow="Table and live-style" title="Set the table" href="/casino" /><GameRail games={tableGames} favouriteGameIds={favouriteGameIds} /></section>
      <section className="page-shell pb-12"><SectionHeading eyebrow="Slots and reels" title="Find your spin" href="/casino" /><GameRail games={slotGames} favouriteGameIds={favouriteGameIds} /></section>

      <section className="page-shell pb-12"><div className="surface relative overflow-hidden rounded-[26px] p-6 sm:p-8"><div aria-hidden="true" className="absolute right-[-5%] top-[-120%] h-[540px] w-[540px] rounded-full border border-primary/10 bg-primary/5" /><div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center"><div><Badge tone="amber"><Zap size={12} /> Welcome season</Badge><h2 className="mt-4 max-w-xl text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl">A little more atmosphere, without the pressure.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-foreground-muted">Browse promotions and rewards designed for a fictional-credit product. Nothing here has cash value, and every game remains a demo.</p></div><div className="flex flex-wrap gap-3"><Link className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/55 bg-primary px-4 text-xs font-bold text-background" href="/promotions">See promotions <ArrowRight size={14} /></Link><Link className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface/60 px-4 text-xs font-semibold text-foreground-subtle hover:bg-surface-hover" href="/responsible-gaming">Play responsibly</Link></div></div></div></section>
    </main>
  );
}
