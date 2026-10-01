import { ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-white/[0.07] bg-[#070a10]">
      <div className="page-shell grid gap-10 py-12 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <Link className="focus-ring inline-flex items-center gap-2 rounded-lg text-sm font-bold tracking-[0.16em] text-ink" href="/">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber font-serif text-sm font-bold text-[#17110a]">V</span>
            VELTRIX
          </Link>
          <p className="mt-4 max-w-md text-sm leading-6 text-muted">A considered playground for fictional credits, atmospheric games, and polished product craft.</p>
          <p className="mt-5 flex items-center gap-2 text-[11px] font-semibold text-muted"><ShieldCheck size={14} className="text-mint" /> Built as a portfolio demonstration</p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs font-semibold text-muted">
          <Link className="focus-ring rounded-sm hover:text-ink" href="/#promotions">Promotions</Link>
          <Link className="focus-ring rounded-sm hover:text-ink" href="/#rewards">Rewards</Link>
          <Link className="focus-ring rounded-sm hover:text-ink" href="/casino">Casino</Link>
          <span className="inline-flex items-center gap-1.5 text-amber"><Sparkles size={13} /> 100% virtual credits</span>
        </div>
      </div>
      <div className="border-t border-white/[0.06] py-4 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-muted/70">No deposits · No withdrawals · No real-money wagering</div>
    </footer>
  );
}
