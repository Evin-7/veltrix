"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRealtime } from "@/components/realtime/realtime-provider";
import type { Game } from "@/features/games/types";
import { formatCurrency } from "@/lib/currency";
import { FullscreenButton } from "./fullscreen-button";

export function GameplayRouteHeader({ game, initialBalance }: { game: Pick<Game, "category" | "name" | "slug">; initialBalance: number }) {
  const realtime = useRealtime();
  const balance = realtime.walletBalance ?? initialBalance;

  return <header className="gameplay-game-header flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4"><div className="flex min-w-0 items-center gap-4"><Link aria-label="Back to game details" className="focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground-muted hover:text-foreground" href={`/casino/${game.slug}`}><ArrowLeft size={17} /></Link><div className="min-w-0"><p className="eyebrow">{game.category}</p><h1 className="display truncate text-2xl text-foreground sm:text-3xl">{game.name}</h1></div></div><div className="flex items-center gap-2"><div className="inline-flex items-center rounded-full border border-success/30 bg-success/10 px-3 py-2 text-xs font-bold text-success"><span>{formatCurrency(balance)}</span></div><FullscreenButton targetId="veltrix-game-stage" /></div></header>;
}
