"use client";

import { CircleDot, Coins, Crown, Diamond, Gem, LoaderCircle, RefreshCw, Star, Volume2, VolumeX, Zap, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const wagers = [10, 25, 50, 100, 250, 500] as const;
type Wager = (typeof wagers)[number];
type SlotSymbol = "crystal" | "crown" | "orb" | "star" | "lightning" | "diamond";

type SlotResult = {
  roundId: string;
  reels: SlotSymbol[][];
  winningLines: { line: number; symbol: SlotSymbol; count: number; multiplier: number; payout: number }[];
  wager: number;
  payout: number;
  netResult: number;
  newBalance: number;
};

const symbolArt: Record<SlotSymbol, { Icon: LucideIcon; label: string; tone: string; tile: string }> = {
  crystal: { Icon: Gem, label: "Crystal", tone: "text-cyan-200", tile: "bg-cyan-300/10 border-cyan-200/25" },
  crown: { Icon: Crown, label: "Crown", tone: "text-amber-200", tile: "bg-amber-300/10 border-amber-200/25" },
  orb: { Icon: CircleDot, label: "Orb", tone: "text-fuchsia-200", tile: "bg-fuchsia-300/10 border-fuchsia-200/25" },
  star: { Icon: Star, label: "Star", tone: "text-yellow-100", tile: "bg-yellow-300/10 border-yellow-200/25" },
  lightning: { Icon: Zap, label: "Lightning", tone: "text-lime-200", tile: "bg-lime-300/10 border-lime-200/25" },
  diamond: { Icon: Diamond, label: "Diamond", tone: "text-sky-200", tile: "bg-sky-300/10 border-sky-200/25" },
};

// Mirrors the implemented server paytable in server/gameplay/slots.ts.
const implementedPaytable: Record<SlotSymbol, { 3: number; 4: number; 5: number }> = {
  crystal: { 3: 8, 4: 30, 5: 150 },
  crown: { 3: 6, 4: 20, 5: 100 },
  orb: { 3: 5, 4: 15, 5: 75 },
  star: { 3: 4, 4: 12, 5: 60 },
  lightning: { 3: 3, 4: 10, 5: 40 },
  diamond: { 3: 2, 4: 8, 5: 25 },
};

const paylineRows: Record<number, number[]> = { 1: [0, 0, 0, 0, 0], 2: [1, 1, 1, 1, 1], 3: [2, 2, 2, 2, 2], 4: [0, 1, 2, 1, 0], 5: [2, 1, 0, 1, 2] };
const paylinePaths: Record<number, string> = { 1: "M 8 16 L 92 16", 2: "M 8 50 L 92 50", 3: "M 8 84 L 92 84", 4: "M 8 16 L 29 50 L 50 84 L 71 50 L 92 16", 5: "M 8 84 L 29 50 L 50 16 L 71 50 L 92 84" };

function formatVc(value: number) { return `${value.toLocaleString("en-US")} VC`; }
function idempotencyKey(scope: string) { return `${scope}:${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now()}`; }

async function requestJson<T>(url: string, options: RequestInit = {}) {
  const response = await fetch(url, { ...options, headers: { "content-type": "application/json", ...(options.headers ?? {}) } });
  const payload = (await response.json().catch(() => ({}))) as { data?: T; error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message ?? "The spin could not be completed.");
  return payload.data as T;
}

function RelicSymbol({ symbol, highlighted = false }: { symbol: SlotSymbol; highlighted?: boolean }) {
  const art = symbolArt[symbol];
  const Icon = art.Icon;
  return <div aria-label={art.label} className={`slot-symbol-tile ${art.tile} ${highlighted ? "slot-symbol-highlight" : ""}`}><Icon aria-hidden="true" className={art.tone} size={44} strokeWidth={1.45} /><span className={`slot-symbol-label ${art.tone}`}>{art.label}</span></div>;
}

function WagerChips({ value, onChange }: { value: Wager; onChange: (value: Wager) => void }) {
  return <div className="slot-wager-control"><div className="mb-2 flex items-center justify-between gap-3"><span className="slot-control-label">Wager</span><span className="text-[10px] font-semibold text-foreground-muted">Demo VC only</span></div><div className="slot-wager-chips">{wagers.map((item) => <button aria-pressed={value === item} className={value === item ? "slot-wager-chip slot-wager-chip-active" : "slot-wager-chip"} key={item} onClick={() => onChange(item)} type="button">{item}</button>)}</div></div>;
}

function BalancePill({ balance, onRefresh }: { balance: number; onRefresh: () => void }) {
  return <div className="flex items-center gap-2"><div className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-2 text-xs font-bold text-success"><Coins size={14} /> {formatVc(balance)}</div><button aria-label="Refresh wallet balance" className="focus-ring rounded-full border border-border p-2 text-foreground-muted hover:bg-surface-hover hover:text-foreground" onClick={onRefresh} type="button"><RefreshCw size={14} /></button></div>;
}

export function NeonRelicsPanel({ initialBalance }: { initialBalance: number }) {
  const [balance, setBalance] = useState(initialBalance);
  const [wager, setWager] = useState<Wager>(100);
  const [reels, setReels] = useState<SlotSymbol[][]>(Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => "diamond" as SlotSymbol)));
  const [result, setResult] = useState<SlotResult | null>(null);
  const [history, setHistory] = useState<SlotResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [sound, setSound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function spin() {
    if (isSubmitting) return;
    setError(null); setIsSubmitting(true); setIsAnimating(true);
    try {
      const next = await requestJson<SlotResult>("/api/v1/games/neon-relics/spin", { method: "POST", headers: { "Idempotency-Key": idempotencyKey("slots-spin") }, body: JSON.stringify({ wager }) });
      setResult(next); setReels(next.reels); setBalance(next.newBalance); setHistory((current) => [next, ...current].slice(0, 5));
      window.setTimeout(() => setIsAnimating(false), 720);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The spin could not be completed."); setIsAnimating(false); } finally { setIsSubmitting(false); }
  }

  const highlighted = (reelIndex: number, rowIndex: number) => Boolean(result?.winningLines.some((line) => paylineRows[line.line]?.[reelIndex] === rowIndex));
  const activePaths = [...new Set(result?.winningLines.map((line) => paylinePaths[line.line]).filter(Boolean))];

  return <section className="slot-game-shell">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5"><div><p className="eyebrow">Neon Relics</p><p className="mt-2 text-sm text-foreground-muted">Demo play · VC has no monetary value</p></div><BalancePill balance={balance} onRefresh={() => setBalance(balance)} /></div>
    <div className="slot-stage mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="slot-stage-kicker">Relic chamber</p><p className="mt-1 text-xs text-white/55">Five reels · three rows · five paylines</p></div><button aria-pressed={sound} aria-label={sound ? "Turn sound off" : "Turn sound on"} className="focus-ring slot-sound-button" onClick={() => setSound((value) => !value)} type="button">{sound ? <Volume2 size={15} /> : <VolumeX size={15} />}<span className="hidden sm:inline">{sound ? "Sound on" : "Sound off"}</span></button></div>
      <div aria-label="Five reel three row slot machine" className={`slot-machine mt-5 ${isAnimating ? "slot-machine-spinning" : ""}`}>
        <div className="slot-machine-mark"><span className="slot-machine-gem"><Gem size={14} /></span><span>NEON RELICS</span><span className="slot-machine-divider" /><span className="text-[9px] tracking-[0.16em] text-white/45">V · 05</span></div>
        <div className="slot-reel-grid">
          {reels.map((reel, reelIndex) => <div className="slot-reel-column" key={`reel-${reelIndex}`}>{reel.map((symbol, rowIndex) => <RelicSymbol highlighted={highlighted(reelIndex, rowIndex)} key={`${reelIndex}-${rowIndex}`} symbol={symbol} />)}</div>)}
          {activePaths.length > 0 ? <svg aria-hidden="true" className="slot-payline-overlay" preserveAspectRatio="none" viewBox="0 0 100 100"><title>Winning paylines</title>{activePaths.map((path) => <path className="slot-winning-line" d={path} key={path} />)}</svg> : null}
        </div>
      </div>
      <div className="slot-status-strip"><div><span>Balance</span><strong>{formatVc(balance)}</strong></div><div><span>Wager</span><strong>{formatVc(wager)}</strong></div><div><span>Last win</span><strong className={result?.payout ? "text-success" : ""}>{result ? result.payout > 0 ? `+${formatVc(result.payout)}` : "No win" : "—"}</strong></div></div>
      <div className="slot-control-bar"><WagerChips onChange={setWager} value={wager} /><Button className="slot-spin-button" disabled={isSubmitting} onClick={spin} size="lg" variant="primary">{isSubmitting ? <LoaderCircle className="animate-spin" size={19} /> : <Gem size={19} />} {isSubmitting ? "Spinning…" : "Spin"}</Button></div>
      <div aria-live="polite" className={`slot-result-callout ${result ? result.payout > 0 ? "slot-result-win" : "slot-result-neutral" : "slot-result-ready"}`}><div><span className="slot-result-kicker">{result ? result.payout > 0 ? "Win" : "Round complete" : "Ready"}</span><strong>{result ? result.payout > 0 ? `+${formatVc(result.payout)}` : "No win this round" : "Choose a wager to begin"}</strong></div>{result ? <span className="text-xs text-white/55">{result.winningLines.length ? `${result.winningLines.length} winning line${result.winningLines.length === 1 ? "" : "s"}` : "Five reels settled"}</span> : null}</div>
      {error ? <p aria-live="assertive" className="mt-3 text-xs font-semibold text-danger">{error}</p> : null}
    </div>
    <div className="slot-support-grid">
      <section className="slot-support-panel" aria-labelledby="neon-paytable"><div className="flex items-end justify-between gap-3"><div><p className="slot-section-kicker">Five fixed paylines</p><h2 className="mt-1 text-lg font-bold text-foreground" id="neon-paytable">Paytable</h2></div><span className="text-[10px] font-semibold text-foreground-muted">Multiplier × wager</span></div><div className="mt-4 slot-paytable"><div className="slot-paytable-head"><span>Symbol</span><span>3×</span><span>4×</span><span>5×</span></div>{Object.entries(symbolArt).map(([key, art]) => { const symbol = key as SlotSymbol; const Icon = art.Icon; const values = implementedPaytable[symbol]; return <div className="slot-paytable-row" key={key}><span className={`flex items-center gap-2 font-semibold ${art.tone}`}><Icon size={18} strokeWidth={1.6} />{art.label}</span><span>{values[3]}×</span><span>{values[4]}×</span><span>{values[5]}×</span></div>; })}</div></section>
      <section className="slot-support-panel" aria-labelledby="neon-rounds"><div className="flex items-end justify-between gap-3"><div><p className="slot-section-kicker">Settled play</p><h2 className="mt-1 text-lg font-bold text-foreground" id="neon-rounds">Recent rounds</h2></div><span className="text-[10px] font-semibold text-foreground-muted">Latest first</span></div><div className="mt-4 slot-round-list">{history.length ? history.map((round) => <div className="slot-round-row" key={round.roundId}><div><strong>{formatVc(round.wager)}</strong><span>{round.winningLines.length ? `${round.winningLines.length} line win` : "No line win"}</span></div><b className={round.netResult >= 0 ? "text-success" : "text-danger"}>{round.netResult >= 0 ? "+" : ""}{formatVc(round.netResult)}</b></div>) : <p className="py-8 text-center text-xs text-foreground-muted">Your settled spins will appear here.</p>}</div></section>
    </div>
  </section>;
}
