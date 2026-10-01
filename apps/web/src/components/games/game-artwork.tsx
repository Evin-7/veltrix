import type { CSSProperties } from "react";
import type { Game } from "@/features/games/types";
import { cn } from "@/lib/cn";

type GameArtworkProps = {
  game: Game;
  className?: string;
  compact?: boolean;
};

export function GameArtwork({ game, className, compact = false }: GameArtworkProps) {
  const artStyle = {
    "--art-start": game.palette[0],
    "--art-end": game.palette[1],
    "--art-accent": game.accent,
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className={cn("group/art relative isolate aspect-[1.32/1] overflow-hidden rounded-[18px] border border-white/10 bg-[radial-gradient(circle_at_78%_20%,var(--art-accent)_0%,transparent_23%),linear-gradient(135deg,var(--art-start),var(--art-end))]", className)}
      style={artStyle}
    >
      <div className="absolute -right-7 -top-10 h-32 w-32 rounded-full border border-white/10 opacity-60 transition-transform duration-500 group-hover/art:translate-x-2 group-hover/art:-translate-y-1" />
      <div className="absolute -bottom-16 -left-8 h-32 w-32 rounded-full border border-white/10 opacity-45 transition-transform duration-500 group-hover/art:-translate-x-2" />
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.14] to-transparent" />
      <div className={cn("absolute inset-0 flex items-center justify-center", compact ? "pb-4" : "pb-7")}>
        <span className="display text-[5rem] leading-none text-white/90 drop-shadow-[0_12px_22px_rgba(0,0,0,0.35)] transition-transform duration-500 group-hover/art:scale-110 sm:text-[6rem]">{game.symbol}</span>
      </div>
      {!compact ? (
        <div className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-3">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/65">{game.category}</span>
          <span className="rounded-full bg-black/20 px-2 py-1 text-[9px] font-semibold text-white/70 backdrop-blur-sm">{game.demoRtp} RTP</span>
        </div>
      ) : null}
    </div>
  );
}
