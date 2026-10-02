"use client";

import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRealtime } from "@/components/realtime/realtime-provider";
import type { Game } from "@/features/games/types";
import { formatCurrency } from "@/lib/currency";
import { useState } from "react";
import { GameSoundToggle } from "./game-audio";
import { FullscreenButton } from "./fullscreen-button";

export function GameplayRouteHeader({ game, initialBalance }: { game: Pick<Game, "category" | "name" | "slug">; initialBalance: number }) {
  const realtime = useRealtime();
  const balance = realtime.walletBalance ?? initialBalance;
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function refreshWallet() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await realtime.refreshWallet();
    } finally {
      setIsRefreshing(false);
    }
  }

  return <header className="gameplay-game-header flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4"><div className="flex min-w-0 items-center gap-4"><Link aria-label="Back to game details" className="focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground-muted hover:text-foreground" href={`/casino/${game.slug}`}><ArrowLeft size={17} /></Link><div className="min-w-0"><p className="eyebrow">{game.category}</p><h1 className="display truncate text-2xl text-foreground sm:text-3xl">{game.name}</h1><p className="mt-1 text-sm text-foreground-muted">Play with virtual balance</p></div></div><div className="flex items-center gap-2"><GameSoundToggle className="game-audio-control rounded-full border px-3 py-2 text-xs font-semibold hover:text-foreground" /><div aria-live="polite" className="inline-flex items-center rounded-full border border-success/30 bg-success/10 px-3 py-2 text-xs font-bold text-success"><span>{formatCurrency(balance)}</span></div><button aria-label="Refresh wallet balance" className="game-icon-control focus-ring rounded-full border p-2 text-foreground-muted hover:text-foreground" disabled={isRefreshing} onClick={() => void refreshWallet()} type="button"><RefreshCw className={isRefreshing ? "animate-spin" : undefined} size={14} /></button><FullscreenButton targetId="veltrix-game-stage" /></div></header>;
}
