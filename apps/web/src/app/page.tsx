import { ArrowRight, Check, ChevronRight, CirclePlay, Clock3, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { GameArtwork } from "@/components/games/game-artwork";
import { GameCard } from "@/components/games/game-card";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/section-heading";
import { listPublicGames } from "@/server/games/service";
import { getCurrentUser } from "@/server/auth/session";
import { listFavouriteGameIds, listRecentGames } from "@/server/users/service";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ games }, currentUser] = await Promise.all([
    listPublicGames({ page: 1, pageSize: 100, sort: "popular" }),
    getCurrentUser(),
  ]);
  const featuredGames = games.filter((game) => game.featured);
  const popularGames = games.filter((game) => game.popular).slice(0, 4);
  const newGames = games.filter((game) => game.isNew).slice(0, 4);
  const [favouriteGameIds, recentActivity] = currentUser?.role === "PLAYER"
    ? await Promise.all([listFavouriteGameIds(currentUser.id), listRecentGames(currentUser.id, 4)])
    : [[], []];
  const recentlyPlayed = recentActivity.map((item) => item.game);
  return (
    <main>
      <section className="page-shell relative overflow-hidden pb-20 pt-10 sm:pb-28 sm:pt-16">
        <div aria-hidden="true" className="hero-mesh pointer-events-none absolute inset-x-[-20%] top-0 h-[520px] opacity-70" />
        <div className="relative grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="max-w-2xl">
            <Badge tone="mint"><span className="h-1.5 w-1.5 rounded-full bg-mint" /> Demo world · 100% fictional credits</Badge>
            <h1 className="display text-balance mt-6 max-w-xl text-[3.5rem] leading-[0.94] text-ink sm:text-[5.5rem]">Play the atmosphere.</h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-muted sm:text-lg sm:leading-8">A sharper kind of game lobby. Discover original worlds, try a round, and build your own rhythm with Veltrix Credits.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-amber/60 bg-amber px-5 text-sm font-semibold text-[#16120b] hover:border-amber-bright hover:bg-amber-bright" href="/casino">
                Enter the lobby <ArrowRight size={16} strokeWidth={2} />
              </Link>
              <Link className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-muted-strong hover:bg-white/[0.08] hover:text-ink" href="#how-it-works">
                <CirclePlay size={16} strokeWidth={1.8} /> See the idea
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-muted">
              <span className="inline-flex items-center gap-2"><Check className="text-mint" size={14} /> No deposits</span>
              <span className="inline-flex items-center gap-2"><Check className="text-mint" size={14} /> No withdrawals</span>
              <span className="inline-flex items-center gap-2"><Check className="text-mint" size={14} /> Built for play</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[510px] lg:mx-0 lg:justify-self-end">
            <div aria-hidden="true" className="hero-orb absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[#7ce1c0]/10 blur-3xl" />
            <div className="surface relative rounded-[30px] p-3 sm:p-4">
              <div className="relative overflow-hidden rounded-[23px] border border-white/10 bg-[#121b25] p-5 sm:p-7">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_4%,rgba(124,225,192,0.28),transparent_27%),radial-gradient(circle_at_12%_78%,rgba(232,184,106,0.14),transparent_29%)]" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="eyebrow">Featured tonight</p>
                    <p className="mt-2 text-xs font-medium text-muted">Small worlds. Long evenings.</p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/15 px-2.5 py-1.5 text-[10px] font-bold text-muted-strong"><span className="h-1.5 w-1.5 rounded-full bg-mint" /> Live demo</div>
                </div>
                <div className="relative mt-7 rotate-[-2deg] rounded-[21px] border border-white/15 bg-[#0c1119] p-2 shadow-2xl shadow-black/30 transition-transform duration-500 hover:rotate-0">
                  <GameArtwork className="rounded-[16px]" game={games[0]} />
                  <div className="flex items-center justify-between gap-3 px-2 pb-1 pt-4">
                    <div><p className="display text-2xl text-ink">{games[0].name}</p><p className="mt-1 text-xs text-muted">{games[0].provider} · {games[0].demoRtp} demo RTP</p></div>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber text-[#17110a]"><ArrowRight size={17} /></span>
                  </div>
                </div>
                <div className="relative mt-6 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
                  <div><p className="text-[10px] uppercase tracking-[0.12em] text-muted">In the lobby</p><p className="mt-1 text-sm font-semibold text-ink">{games.length} worlds</p></div>
                  <div><p className="text-[10px] uppercase tracking-[0.12em] text-muted">Currency mode</p><p className="mt-1 text-sm font-semibold text-ink">Virtual only</p></div>
                  <div><p className="text-[10px] uppercase tracking-[0.12em] text-muted">Access</p><p className="mt-1 text-sm font-semibold text-ink">Open lobby</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell pb-20 sm:pb-28" id="featured">
        <SectionHeading eyebrow="Curated for you" title="A good place to start" href="/casino" />
        <div className="game-grid">
          {featuredGames.map((game) => <GameCard game={game} initialIsFavourite={favouriteGameIds.includes(game.id)} key={game.id} />)}
        </div>
      </section>

      <section className="page-shell pb-20 sm:pb-28" id="how-it-works">
        <div className="surface relative overflow-hidden rounded-[28px] p-6 sm:p-9">
          <div aria-hidden="true" className="absolute right-[-4%] top-[-80%] h-[500px] w-[500px] rounded-full border border-amber/10 bg-amber/[0.04]" />
          <div className="relative grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <Badge tone="amber"><Sparkles size={12} /> Designed for the demo</Badge>
              <h2 className="display mt-5 max-w-md text-4xl leading-tight text-ink sm:text-5xl">A premium product canvas, without the noise.</h2>
              <p className="mt-5 max-w-md text-sm leading-7 text-muted">Veltrix is a portfolio project exploring what a modern virtual-credit gaming platform can feel like when the details matter.</p>
              <Link className="focus-ring mt-6 inline-flex items-center gap-2 rounded-full text-sm font-semibold text-amber-bright hover:text-ink" href="/casino">Browse the catalogue <ArrowRight size={15} /></Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: Sparkles, title: "Original worlds", body: "Fictional games, names, and artwork built for this product." },
                { icon: Clock3, title: "Easy rhythm", body: "A calm lobby that gets out of your way and lets you explore." },
                { icon: Trophy, title: "Progression", body: "A clear path toward rewards, levels, and memorable sessions." },
              ].map(({ icon: Icon, title, body }, index) => (
                <div className="surface-subtle rounded-2xl p-4 sm:p-5" key={title}>
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-amber"><Icon size={16} strokeWidth={1.8} /></span>
                  <p className="mt-5 text-sm font-semibold text-ink">{title}</p>
                  <p className="mt-2 text-xs leading-5 text-muted">{body}</p>
                  <span className="mt-5 block text-[10px] font-bold text-muted/60">0{index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell pb-20 sm:pb-28" id="rewards">
        <SectionHeading eyebrow="Keep exploring" title="Popular right now" href="/casino" />
        <div className="game-grid">
          {popularGames.map((game) => <GameCard game={game} initialIsFavourite={favouriteGameIds.includes(game.id)} key={game.id} />)}
        </div>
      </section>

      <section className="page-shell pb-20 sm:pb-28" id="promotions">
        <SectionHeading eyebrow="Fresh arrivals" title="New to Veltrix" href="/casino" />
        <div className="game-grid">
          {newGames.map((game) => <GameCard game={game} initialIsFavourite={favouriteGameIds.includes(game.id)} key={game.id} />)}
        </div>
      </section>

      <section className="page-shell pb-10 sm:pb-16">
        <div className="mb-6 flex items-end justify-between gap-5">
          <div><p className="eyebrow mb-2">Pick up where you left off</p><h2 className="display text-3xl text-ink sm:text-[2.25rem]">Recently played</h2></div>
          <Link className="focus-ring hidden items-center gap-1.5 rounded-full px-2 py-2 text-xs font-semibold text-muted-strong hover:text-amber-bright sm:inline-flex" href="/casino">Open history <ChevronRight size={14} /></Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {recentlyPlayed.map((game) => (
            <Link className="focus-ring surface-subtle group flex items-center gap-3 rounded-2xl p-2.5 hover:border-white/20" href={`/casino/${game.slug}`} key={game.id}>
              <GameArtwork className="h-[62px] w-[74px] shrink-0 rounded-xl" compact game={game} />
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink group-hover:text-amber-bright">{game.name}</p><p className="mt-1 text-xs text-muted">{game.category}</p><p className="mt-2 text-[10px] font-semibold text-mint">Continue round <ArrowRight className="ml-1 inline" size={10} /></p></div>
            </Link>
          ))}
          {recentlyPlayed.length === 0 ? <div className="surface-subtle rounded-2xl p-6 sm:col-span-2 lg:col-span-4"><p className="text-sm font-semibold text-ink">{currentUser ? "Your recent rhythm will appear here." : "Keep your place between visits."}</p><p className="mt-2 max-w-lg text-xs leading-5 text-muted">{currentUser ? "Open a demo preview from the lobby and it will stay in this space." : "Sign in to save favourites, remember demo previews, and build your own lobby."}</p>{!currentUser ? <Link className="focus-ring mt-4 inline-flex rounded-full border border-amber/45 bg-amber/10 px-4 py-2 text-xs font-semibold text-amber-bright" href="/login">Log in to continue</Link> : null}</div> : null}
        </div>
      </section>
    </main>
  );
}
