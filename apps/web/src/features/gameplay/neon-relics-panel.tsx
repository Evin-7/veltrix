"use client";

import { WinCelebration } from "./win-celebration";

import { CircleDot, Crown, Diamond, Gem, LoaderCircle, Star, Zap, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { requestJson } from "@/lib/api-client";
import { errorMessage } from "@/lib/app-error";
import { formatCurrency } from "@/lib/currency";
import { emitWalletUpdate } from "@/lib/wallet-sync";
import { slotGameCatalog } from "@/shared/slot-catalog";
import { useGameAudio } from "./game-audio";
import { InvalidSlotOutcomeError, validateSlotReels } from "./slot-symbols";

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

const symbolArt: Record<SlotSymbol, { Icon: LucideIcon; label: string; tone: string }> = {
  crystal: { Icon: Gem, label: "Crystal", tone: "slot-symbol-crystal" },
  crown: { Icon: Crown, label: "Crown", tone: "slot-symbol-crown" },
  orb: { Icon: CircleDot, label: "Orb", tone: "slot-symbol-orb" },
  star: { Icon: Star, label: "Star", tone: "slot-symbol-star" },
  lightning: { Icon: Zap, label: "Lightning", tone: "slot-symbol-lightning" },
  diamond: { Icon: Diamond, label: "Diamond", tone: "slot-symbol-diamond" },
};

const implementedPaytable = slotGameCatalog["neon-relics"].paytable;

const paylineRows: Record<number, number[]> = { 1: [0, 0, 0, 0, 0], 2: [1, 1, 1, 1, 1], 3: [2, 2, 2, 2, 2], 4: [0, 1, 2, 1, 0], 5: [2, 1, 0, 1, 2] };
const paylinePaths: Record<number, string> = { 1: "M 8 16 L 92 16", 2: "M 8 50 L 92 50", 3: "M 8 84 L 92 84", 4: "M 8 16 L 29 50 L 50 84 L 71 50 L 92 16", 5: "M 8 84 L 29 50 L 50 16 L 71 50 L 92 84" };

function idempotencyKey(scope: string) { return `${scope}:${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now()}`; }

function RelicSymbol({ symbol, highlighted = false }: { symbol: SlotSymbol; highlighted?: boolean }) {
  const art = symbolArt[symbol];
  if (!art) throw new InvalidSlotOutcomeError(`Unknown Neon Relics symbol: ${symbol}.`);
  const Icon = art.Icon;
  return <div aria-label={art.label} className={`slot-symbol-tile ${art.tone} ${highlighted ? "slot-symbol-highlight" : ""}`}><Icon aria-hidden="true" className={art.tone} size={44} strokeWidth={1.45} /><span className={`slot-symbol-label ${art.tone}`}>{art.label}</span></div>;
}

function parseNeonRelicsResult(result: SlotResult): SlotResult {
  const reels = validateSlotReels("neon-relics", result.reels) as SlotSymbol[][];
  for (const line of result.winningLines) {
    if (!symbolArt[line.symbol]) throw new InvalidSlotOutcomeError(`Unknown Neon Relics winning symbol: ${line.symbol}.`);
  }
  return { ...result, reels };
}

function WagerChips({ value, onChange }: { value: Wager; onChange: (value: Wager) => void }) {
  return <div className="slot-wager-control"><div className="mb-2 flex items-center justify-between gap-3"><span className="slot-control-label">Wager</span><span className="text-[10px] font-semibold text-foreground-muted">€</span></div><div className="slot-wager-chips">{wagers.map((item) => <button aria-pressed={value === item} className={value === item ? "slot-wager-chip slot-wager-chip-active" : "slot-wager-chip"} key={item} onClick={() => onChange(item)} type="button">{formatCurrency(item)}</button>)}</div></div>;
}

export function NeonRelicsPanel({ initialBalance }: { initialBalance: number }) {
  const [balance, setBalance] = useState(initialBalance);
  const [wager, setWager] = useState<Wager>(100);
  const [reels, setReels] = useState<SlotSymbol[][]>(Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => "diamond" as SlotSymbol)));
  const [result, setResult] = useState<SlotResult | null>(null);
  const [history, setHistory] = useState<SlotResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimer = useRef<number | null>(null);
  const { play } = useGameAudio();
  const { showToast } = useToast();
  useEffect(() => () => { if (animationTimer.current !== null) window.clearTimeout(animationTimer.current); }, []);

  async function spin() {
    if (isSubmitting) return;
    setIsSubmitting(true); setIsAnimating(true); play("slot-spin-start");
    try {
      const next = parseNeonRelicsResult(await requestJson<SlotResult>("/api/v1/games/neon-relics/spin", { method: "POST", headers: { "Idempotency-Key": idempotencyKey("slots-spin") }, body: JSON.stringify({ wager }) }));
      setResult(next); setReels(next.reels); setBalance(next.newBalance); emitWalletUpdate(next.newBalance); setHistory((current) => [next, ...current].slice(0, 5)); next.reels.forEach((_, reelIndex) => play("slot-reel-stop", { delayMs: reelIndex * 110 })); play(next.payout >= next.wager * 8 ? "slot-big-win" : next.payout > 0 ? "slot-win" : "slot-no-win", { delayMs: 620 });
      animationTimer.current = window.setTimeout(() => setIsAnimating(false), 720);
    } catch (caught) { if (caught instanceof InvalidSlotOutcomeError) console.error("[Veltrix] Invalid slot outcome", { gameSlug: "neon-relics", error: caught.message }); showToast(errorMessage(caught, caught instanceof InvalidSlotOutcomeError ? "INTERNAL_ERROR" : "INVALID_WAGER"), "error"); setIsAnimating(false); } finally { setIsSubmitting(false); }
  }

  const highlighted = (reelIndex: number, rowIndex: number) => Boolean(result?.winningLines.some((line) => paylineRows[line.line]?.[reelIndex] === rowIndex));
  const activePaths = [...new Set(result?.winningLines.map((line) => paylinePaths[line.line]).filter(Boolean))];

  return <section className="slot-game-shell">
      <WinCelebration kind="slots" result={result} gameSlug={"neon-relics"} ready={!isAnimating && !isSubmitting} />
    <div className="slot-stage mt-0">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="slot-stage-kicker">Relic chamber</p><p className="mt-1 text-xs text-white/55">Five reels · three rows · five paylines</p></div></div>
      <div aria-label="Five reel three row slot machine" className={`slot-machine mt-5 ${isAnimating ? "slot-machine-spinning" : ""}`}>
        <div className="slot-machine-mark"><span>NEON RELICS</span><span className="slot-machine-divider" /><span className="text-[9px] tracking-[0.16em] text-white/45">V · 05</span></div>
        <div className="slot-reel-grid">
          {reels.map((reel, reelIndex) => <div className="slot-reel-column" key={`reel-${reelIndex}`}>{reel.map((symbol, rowIndex) => <RelicSymbol highlighted={highlighted(reelIndex, rowIndex)} key={`${reelIndex}-${rowIndex}`} symbol={symbol} />)}</div>)}
          {activePaths.length > 0 ? <svg aria-hidden="true" className="slot-payline-overlay" preserveAspectRatio="none" viewBox="0 0 100 100"><title>Winning paylines</title>{activePaths.map((path) => <path className="slot-winning-line" d={path} key={path} />)}</svg> : null}
        </div>
      </div>
      <div className="slot-status-strip"><div><span>Balance</span><strong>{formatCurrency(balance)}</strong></div><div><span>Wager</span><strong>{formatCurrency(wager)}</strong></div><div><span>Last win</span><strong className={result?.payout ? "text-success" : ""}>{result ? result.payout > 0 ? formatCurrency(result.payout, { sign: "always" }) : "No win" : "—"}</strong></div></div>
      <div className="slot-control-bar"><WagerChips onChange={setWager} value={wager} /><Button className="slot-spin-button" disabled={isSubmitting} onClick={spin} size="lg" variant="primary">{isSubmitting ? <LoaderCircle className="animate-spin" size={19} /> : null} {isSubmitting ? "Spinning…" : "Spin"}</Button></div>
      <div aria-live="polite" className={`slot-result-callout ${result ? result.payout > 0 ? "slot-result-win" : "slot-result-neutral" : "slot-result-ready"}`}><div><span className="slot-result-kicker">{result ? result.payout > 0 ? "Win" : "Round complete" : "Ready"}</span><strong>{result ? result.payout > 0 ? formatCurrency(result.payout, { sign: "always" }) : "No win this round" : "Choose a wager to begin"}</strong></div>{result ? <span className="text-xs text-white/55">{result.winningLines.length ? `${result.winningLines.length} winning line${result.winningLines.length === 1 ? "" : "s"}` : "Five reels settled"}</span> : null}</div>
    </div>
    <div className="slot-support-grid">
      <section className="slot-support-panel" aria-labelledby="neon-paytable"><div className="flex items-end justify-between gap-3"><div><p className="slot-section-kicker">Five fixed paylines</p><h2 className="mt-1 text-lg font-bold text-foreground" id="neon-paytable">Paytable</h2></div><span className="text-[10px] font-semibold text-foreground-muted">Multiplier × wager</span></div><div className="mt-4 slot-paytable"><div className="slot-paytable-head"><span>Symbol</span><span>3×</span><span>4×</span><span>5×</span></div>{Object.entries(symbolArt).map(([key, art]) => { const symbol = key as SlotSymbol; const Icon = art.Icon; const values = implementedPaytable[symbol]; return <div className="slot-paytable-row" key={key}><span className={`flex items-center gap-2 font-semibold ${art.tone}`}><Icon size={18} strokeWidth={1.6} />{art.label}</span><span>{values[3]}×</span><span>{values[4]}×</span><span>{values[5]}×</span></div>; })}</div></section>
      <section className="slot-support-panel" aria-labelledby="neon-rounds"><div className="flex items-end justify-between gap-3"><div><p className="slot-section-kicker">Settled play</p><h2 className="mt-1 text-lg font-bold text-foreground" id="neon-rounds">Recent rounds</h2></div><span className="text-[10px] font-semibold text-foreground-muted">Latest first</span></div><div className="mt-4 slot-round-list">{history.length ? history.map((round) => <div className="slot-round-row" key={round.roundId}><div><strong>{formatCurrency(round.wager)}</strong><span>{round.winningLines.length ? `${round.winningLines.length} line win` : "No line win"}</span></div><b className={round.netResult >= 0 ? "text-success" : "text-danger"}>{formatCurrency(round.netResult, { sign: "always" })}</b></div>) : <p className="py-8 text-center text-xs text-foreground-muted">Your settled spins will appear here.</p>}</div></section>
    </div>
  </section>;
}
