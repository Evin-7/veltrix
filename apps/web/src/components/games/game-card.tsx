"use client";

import { Heart, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Game } from "@/features/games/types";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { requestJson } from "@/lib/api-client";
import { errorMessage } from "@/lib/app-error";
import { beginRouteTransition } from "@/lib/route-transition";
import { GameArtwork } from "./game-artwork";

type GameCardProps = { game: Game; compact?: boolean; initialIsFavourite?: boolean };

export function GameCard({ game, compact = false, initialIsFavourite = false }: GameCardProps) {
  const router = useRouter();
  const [isFavourite, setIsFavourite] = useState(initialIsFavourite);
  const [isFavouritePopping, setIsFavouritePopping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  async function toggleFavourite() {
    if (isSaving) return;
    const previousValue = isFavourite;
    const nextValue = !previousValue;
    setIsFavourite(nextValue);
    setIsFavouritePopping(nextValue);
    setIsSaving(true);
    try {
      const payload = await requestJson<{ isFavourite?: boolean }>(`/api/v1/games/${game.slug}/favourite`, { method: nextValue ? "POST" : "DELETE" });
      const savedValue = Boolean(payload.isFavourite);
      setIsFavourite(savedValue);
      setIsFavouritePopping(savedValue);
      window.dispatchEvent(new CustomEvent("veltrix:favourite-changed", { detail: { slug: game.slug, isFavourite: savedValue } }));
      showToast(savedValue ? "Added to favourites" : "Removed from favourites", "success");
    } catch (error) {
      setIsFavourite(previousValue);
      setIsFavouritePopping(false);
      if (error instanceof Error && "appError" in error && (error as { appError?: { code?: string } }).appError?.code === "SESSION_EXPIRED") {
        beginRouteTransition("/login");
        router.push(`/login?next=${encodeURIComponent(`/casino/${game.slug}`)}`);
        return;
      }
      showToast(errorMessage(error, "CONFLICT"), "error");
    } finally { setIsSaving(false); }
  }

  return (
    <article className={cn("group min-w-0", compact && "max-w-[208px]")}>
      <div className="relative overflow-hidden rounded-[18px]">
        <Link aria-label={`Open ${game.name}`} className="focus-ring block rounded-[18px]" href={`/casino/${game.slug}`}>
          <GameArtwork game={game} compact={compact} />
        </Link>
        <Link aria-label={`Play ${game.name}`} className="pointer-events-none absolute inset-0 grid place-items-center rounded-[18px] bg-black/0 transition-colors duration-300 group-hover:pointer-events-auto group-hover:bg-black/35 group-focus-within:pointer-events-auto group-focus-within:bg-black/30" href={`/casino/${game.slug}/play`}><span className="translate-y-2 scale-90 rounded-full border border-white/25 bg-white/95 px-3.5 py-2 text-xs font-bold text-slate-900 opacity-0 shadow-xl transition-all duration-300 group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:opacity-100">Play</span></Link>
        <button aria-label={isSaving ? "Saving favourite" : isFavourite ? `Remove ${game.name} from favourites` : `Add ${game.name} to favourites`} aria-pressed={isFavourite} className={cn("focus-ring absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border-strong bg-surface/85 text-foreground-muted backdrop-blur-md hover:bg-surface hover:text-foreground", isFavourite && "border-favorite/65 bg-favorite/15 text-favorite hover:border-favorite/80 hover:text-favorite")} disabled={isSaving} onClick={toggleFavourite} title={isSaving ? "Saving favourite" : isFavourite ? `Remove ${game.name} from favourites` : `Add ${game.name} to favourites`} type="button">{isSaving ? <LoaderCircle aria-hidden="true" className="animate-spin" size={17} /> : <Heart className={cn(isFavourite ? "text-favorite" : "text-foreground-muted", isFavouritePopping && "favorite-heart-pop")} fill={isFavourite ? "currentColor" : "none"} size={17} strokeWidth={1.8} />}</button>
        {game.isNew ? <Badge className="absolute left-3 top-3" tone="mint">New</Badge> : null}
      </div>
      <div className="px-0.5 pt-3"><div className="min-w-0"><Link className="display focus-ring block truncate rounded-sm text-base font-medium text-foreground hover:text-primary" href={`/casino/${game.slug}`}>{game.name}</Link><p className="mt-1 truncate text-xs text-foreground-muted">{game.provider}</p></div></div>
    </article>
  );
}
