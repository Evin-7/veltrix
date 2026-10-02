"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useState } from "react";
import type { Game } from "@/features/games/types";
import { cn } from "@/lib/cn";

type GameArtworkProps = { game: Game; className?: string; compact?: boolean; priority?: boolean };

export function GameArtwork({ game, className, compact = false, priority = false }: GameArtworkProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const artStyle = { "--art-start": game.palette[0], "--art-end": game.palette[1], "--art-accent": game.accent } as CSSProperties;
  const imagePath = game.thumbnail || `/games/${game.slug}/cover.jpg`;
  const isExternalThumbnail = Boolean(game.thumbnail);

  return (
    <div className={cn("game-card-art group/art relative isolate overflow-hidden rounded-[18px] border border-border bg-[radial-gradient(circle_at_78%_20%,var(--art-accent)_0%,transparent_23%),linear-gradient(135deg,var(--art-start),var(--art-end))]", className)} style={artStyle}>
      {imageFailed ? <div aria-hidden="true" className="absolute inset-0 grid place-items-center bg-black/10"><span className="display text-5xl text-white/75">{game.symbol}</span></div> : <Image alt={`${game.name} cover art`} className="object-cover transition-transform duration-500 group-hover/art:scale-[1.06]" fill onError={() => setImageFailed(true)} priority={priority} sizes="(min-width: 1500px) 16vw, (min-width: 850px) 22vw, 45vw" src={imagePath} unoptimized={isExternalThumbnail} />}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-black/10" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/15 to-transparent" />
      {!compact ? <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 sm:inset-x-4"><span className="rounded-full border border-white/15 bg-black/25 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/80 backdrop-blur-sm">{game.category}</span>{game.category !== "Arcade" ? <span className="rounded-full border border-white/15 bg-black/25 px-2 py-1 text-[9px] font-semibold text-white/80 backdrop-blur-sm">{game.rtp} RTP</span> : null}</div> : null}
    </div>
  );
}
