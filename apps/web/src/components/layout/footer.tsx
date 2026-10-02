import Link from "next/link";
import { VeltrixLogo } from "@/components/ui/veltrix-logo";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-surface/70">
      <div className="page-shell grid gap-10 py-12 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <Link aria-label="Veltrix home" className="focus-ring inline-flex items-center rounded-lg" href="/">
            <VeltrixLogo className="w-[156px]" />
          </Link>
          <p className="mt-4 max-w-md text-sm leading-6 text-muted">A considered collection of atmospheric games and polished product craft.</p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs font-semibold text-muted">
          <Link className="focus-ring rounded-sm hover:text-ink" href="/promotions">Promotions</Link>
          <Link className="focus-ring rounded-sm hover:text-ink" href="/rewards">Rewards</Link>
          <Link className="focus-ring rounded-sm hover:text-ink" href="/casino">Casino</Link>
          <Link className="focus-ring rounded-sm hover:text-ink" href="/terms">Terms</Link>
          <Link className="focus-ring rounded-sm hover:text-ink" href="/privacy">Privacy</Link>
          <Link className="focus-ring rounded-sm hover:text-ink" href="/cookies">Cookies</Link>
          <Link className="focus-ring rounded-sm hover:text-ink" href="/responsible-gaming">Responsible gaming</Link>
        </div>
      </div>
      <div className="border-t border-border px-6 py-4 text-center text-xs leading-5 text-muted">Displayed balances are virtual play currency used within Veltrix. They have no cash value and cannot be purchased, withdrawn, redeemed, or exchanged for money.</div>
    </footer>
  );
}
