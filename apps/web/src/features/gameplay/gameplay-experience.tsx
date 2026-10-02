"use client";

import type { Game } from "@/features/games/types";
import { BlackjackPanel, RoulettePanel, SlotsPanel } from "./gameplay-panels";
import { NeonRelicsPanel } from "./neon-relics-panel";
import { UniversalGameplayPanel } from "./universal-gameplay-panel";

type Props = { game: Game; initialBalance: number };
const slots = new Set(["lunar-circuit", "orbit-reels", "ember-room", "moonlit-mint"]);
const blackjack = new Set(["veltrix-blackjack", "signal-blackjack"]);
const roulette = new Set(["european-roulette", "velvet-roulette"]);
const universal = new Set(["afterglow-baccarat", "gilded-dice", "cinder-club", "neon-paddock", "tide-chase", "prism-pulse"]);

export function GameplayExperience({ game, initialBalance }: Props) {
  if (game.slug === "neon-relics") return <NeonRelicsPanel initialBalance={initialBalance} />;
  if (slots.has(game.slug)) return <SlotsPanel gameSlug={game.slug} />;
  if (blackjack.has(game.slug)) return <BlackjackPanel gameSlug={game.slug} />;
  if (roulette.has(game.slug)) return <RoulettePanel gameSlug={game.slug} />;
  if (universal.has(game.slug)) return <UniversalGameplayPanel game={game} />;
  return <section className="border-y border-border py-14 text-center"><p className="eyebrow">Gameplay</p><h2 className="display mt-3 text-3xl text-foreground">Coming soon</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-foreground-muted">This game is not enabled for play yet.</p></section>;
}
