"use client";

import { Heart, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Game } from "@/features/games/types";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { GameArtwork } from "./game-artwork";

type GameCardProps = {
  game: Game;
  compact?: boolean;
  initialIsFavourite?: boolean;
};

export function GameCard({ game, compact = false, initialIsFavourite = false }: GameCardProps) {
  const router = useRouter();
  const [isFavourite, setIsFavourite] = useState(initialIsFavourite);
  const [isSaving, setIsSaving] = useState(false);

  async function toggleFavourite() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/v1/games/${game.slug}/favourite`, { method: isFavourite ? "DELETE" : "POST" });
      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/casino/${game.slug}`)}`);
        return;
      }
      if (!response.ok) return;
      const payload = (await response.json()) as { data?: { isFavourite?: boolean } };
      setIsFavourite(Boolean(payload.data?.isFavourite));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className={cn("group min-w-0", compact && "max-w-[228px]")}>
      <div className="relative">
        <Link aria-label={`Open ${game.name}`} className="focus-ring block" href={`/casino/${game.slug}`}>
          <GameArtwork game={game} compact={compact} />
        </Link>
        <button
            aria-label={isFavourite ? `Remove ${game.name} from favourites` : `Add ${game.name} to favourites`}
            aria-pressed={isFavourite}
            className={cn(
            "focus-ring absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/25 text-white/70 backdrop-blur-md hover:border-white/30 hover:text-white",
            isFavourite && "border-rose-300/40 bg-[#ff9bbb]/20 text-[#ffb1c9]",
            )}
          disabled={isSaving}
          onClick={toggleFavourite}
          type="button"
        >
          <Heart fill={isFavourite ? "currentColor" : "none"} size={15} strokeWidth={1.8} />
        </button>
        {game.isNew ? <Badge className="absolute left-3 top-3" tone="mint">New</Badge> : null}
      </div>
      <div className="flex items-start justify-between gap-2 px-0.5 pt-3">
        <div className="min-w-0">
          <Link className="focus-ring block truncate rounded-sm text-sm font-semibold text-ink hover:text-amber-bright" href={`/casino/${game.slug}`}>
            {game.name}
          </Link>
          <p className="mt-1 truncate text-xs text-muted">{game.provider}</p>
        </div>
        <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-muted">
          <Play fill="currentColor" size={9} />
          {game.players}
        </span>
      </div>
    </article>
  );
}
