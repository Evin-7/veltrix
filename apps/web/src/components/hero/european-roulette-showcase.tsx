import type { CSSProperties } from "react";
import Link from "next/link";
import { FullBleed } from "@/components/ui/layout-primitives";
import { VeltrixLogo } from "@/components/ui/veltrix-logo";
import { formatCurrency } from "@/lib/currency";

const wheelNumbers = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const redNumbers = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const rouletteRows = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
];

function numberTone(number: number) {
  return number === 0 ? "roulette-number-zero" : redNumbers.has(number) ? "roulette-number-red" : "roulette-number-black";
}

export function EuropeanRouletteShowcase() {
  return <section aria-labelledby="roulette-showcase-title" className="roulette-showcase-section">
    <div className="roulette-showcase-stage">
      <div aria-hidden="true" className="roulette-showcase-glow" />
      <div className="roulette-showcase-content page-shell">
        <div className="roulette-showcase-copy flex flex-col gap-7 px-5 py-7 sm:px-9 sm:py-10 lg:flex-row lg:items-start lg:justify-between lg:px-12">
          <div className="max-w-sm">
            <p className="eyebrow text-[#d9b875]/75">The European table</p>
            <h2 className="display mt-3 text-4xl leading-[0.96] text-[#f7edda] sm:text-5xl" id="roulette-showcase-title">One wheel.<br />Your next move.</h2>
            <p className="mt-4 max-w-xs text-sm leading-6 text-[#c8c5b9]/75">A single zero, thirty-seven numbers, and a little more atmosphere.</p>
            <Link className="focus-ring mt-6 inline-flex min-h-11 items-center rounded-full border border-[#e7c47e]/55 bg-[#d7a94f] px-4 text-xs font-bold text-[#1b1710] shadow-[0_8px_24px_rgba(0,0,0,0.28)] hover:bg-[#edc66e]" href="/casino/european-roulette">Play Roulette</Link>
          </div>
          <p className="max-w-[220px] text-xs font-semibold leading-5 text-[#c8c5b9]/55 lg:pt-1 lg:text-right">European Roulette<br />Single zero · 1–36</p>
        </div>

        <div aria-hidden="true" className="roulette-wheel-wrap">
          <div className="roulette-wheel-shadow" />
          <div className="roulette-wheel">
            <div className="roulette-wheel-rim"><div className="roulette-wheel-track">{wheelNumbers.map((number, index) => <span className={`roulette-pocket ${numberTone(number)}`} key={number} style={{ "--pocket-angle": `${(index * 360) / wheelNumbers.length}deg` } as CSSProperties}>{number}</span>)}</div><div className="roulette-wheel-inner"><VeltrixLogo alt="" className="roulette-wheel-wordmark" surface="dark" /><span className="roulette-wheel-pin" /></div></div>
          </div>
        </div>
      </div>

      <FullBleed className="roulette-table-bleed">
        <div className="roulette-felt-wrap">
          <div className="roulette-felt">
            <div className="roulette-table-mark">VELTRIX <span /> EUROPEAN ROULETTE</div>
            <div className="roulette-number-board">
              <div className="roulette-zero-column"><span className="roulette-table-number roulette-number-zero">0</span></div>
              <div className="roulette-grid">
                {rouletteRows.map((row) => <div className="roulette-number-row" key={row[0]}>{row.map((number) => <span className={`roulette-table-number ${numberTone(number)}`} key={number}>{number}</span>)}<span className="roulette-row-label">2 to 1</span></div>)}
                <div className="roulette-dozens"><span>1st 12</span><span>2nd 12</span><span>3rd 12</span></div>
                <div className="roulette-even-money"><span>1–18</span><span>Even</span><span className="roulette-bet-red">Red</span><span className="roulette-bet-black">Black</span><span>Odd</span><span>19–36</span></div>
              </div>
            </div>
            <div className="roulette-chips"><span className="roulette-chip roulette-chip-gold">{formatCurrency(100)}</span><span className="roulette-chip roulette-chip-ivory">{formatCurrency(250)}</span><span className="roulette-chip roulette-chip-red">{formatCurrency(50)}</span></div>
          </div>
        </div>
      </FullBleed>
    </div>
  </section>;
}
