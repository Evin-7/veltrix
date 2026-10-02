"use client";

import { Check, CircleHelp, Coins, Gem, LoaderCircle, RefreshCw, ShieldCheck, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

const wagers = [10, 25, 50, 100, 250, 500] as const;
type Wager = (typeof wagers)[number];

function idempotencyKey(scope: string) {
  const token = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`;
  return `${scope}:${token}`;
}

async function requestJson<T>(url: string, options: RequestInit = {}) {
  const response = await fetch(url, { ...options, headers: { "content-type": "application/json", ...(options.headers ?? {}) } });
  const payload = (await response.json().catch(() => ({}))) as { data?: T; error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message ?? "The table could not complete that action.");
  return payload.data as T;
}

function formatVc(value: number) {
  return `${value.toLocaleString("en-US")} VC`;
}

function WagerSelector({ value, onChange }: { value: Wager; onChange: (value: Wager) => void }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3"><label className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted" htmlFor="demo-wager">Wager</label><span className="text-[10px] font-semibold text-muted">Demo VC only</span></div>
      <select className="focus-ring min-h-11 w-full rounded-xl border border-white/10 bg-[#0c111a] px-3 text-sm font-semibold text-ink" id="demo-wager" onChange={(event) => onChange(Number(event.target.value) as Wager)} value={value}>
        {wagers.map((wager) => <option key={wager} value={wager}>{formatVc(wager)}</option>)}
      </select>
    </div>
  );
}

function TableHeader({ balance, label, onRefresh }: { balance: number; label: string; onRefresh?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
      <div><p className="eyebrow">{label}</p><p className="mt-2 text-sm text-muted">Demo play · VC has no monetary value</p></div>
      <div className="flex items-center gap-2"><div className="inline-flex items-center gap-2 rounded-full border border-mint/25 bg-mint/10 px-3 py-2 text-xs font-bold text-mint"><Coins size={14} /> {formatVc(balance)}</div>{onRefresh ? <button aria-label="Refresh wallet balance" className="focus-ring rounded-full border border-white/10 p-2 text-muted hover:text-ink" onClick={onRefresh} type="button"><RefreshCw size={14} /></button> : null}</div>
    </div>
  );
}

function TableNote({ error, message }: { error: string | null; message: string | null }) {
  return <p aria-live="polite" className={`min-h-6 text-xs font-semibold ${error ? "text-rose-300" : "text-mint"}`}>{error ?? message}</p>;
}

type SlotSymbol = "crystal" | "crown" | "orb" | "star" | "lightning" | "diamond";
const slotSymbolArt: Record<SlotSymbol, { glyph: string; label: string; tone: string }> = {
  crystal: { glyph: "✦", label: "Crystal", tone: "text-cyan-200" },
  crown: { glyph: "♛", label: "Crown", tone: "text-amber-200" },
  orb: { glyph: "◉", label: "Orb", tone: "text-fuchsia-200" },
  star: { glyph: "✧", label: "Star", tone: "text-yellow-100" },
  lightning: { glyph: "ϟ", label: "Lightning", tone: "text-lime-200" },
  diamond: { glyph: "◇", label: "Diamond", tone: "text-sky-200" },
};
type SlotResult = { roundId: string; reels: SlotSymbol[][]; winningLines: { line: number; symbol: SlotSymbol; count: number; multiplier: number; payout: number }[]; wager: number; payout: number; netResult: number; newBalance: number };

export function SlotsPanel({ initialBalance }: { initialBalance: number }) {
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
      setResult(next); setReels(next.reels); setBalance(next.newBalance); setHistory((current) => [next, ...current].slice(0, 4));
      window.setTimeout(() => setIsAnimating(false), 760);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The spin could not be completed."); setIsAnimating(false); }
    finally { setIsSubmitting(false); }
  }

  return (
    <section className="surface rounded-[28px] p-5 sm:p-8">
      <TableHeader balance={balance} label="Neon Relics · server-authoritative" onRefresh={() => setBalance(balance)} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_260px]">
        <div>
          <div className={`grid grid-cols-5 gap-2 rounded-[24px] border border-cyan-100/10 bg-[#091521] p-3 shadow-[inset_0_0_50px_rgba(28,168,192,0.12)] sm:gap-3 sm:p-5 ${isAnimating ? "animate-pulse" : ""}`} aria-label="Five reel three row slot result">
            {reels.map((reel, reelIndex) => <div className="grid gap-2" key={`reel-${reelIndex}`}>{reel.map((symbol, rowIndex) => { const art = slotSymbolArt[symbol]; return <div aria-label={art.label} className="grid aspect-square place-items-center rounded-xl border border-white/10 bg-white/[0.055] text-3xl shadow-[0_8px_18px_rgba(0,0,0,0.2)] sm:text-5xl" key={`${reelIndex}-${rowIndex}`}><span className={`${art.tone} drop-shadow-[0_0_14px_currentColor]`}>{art.glyph}</span></div>; })}</div>)}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted">Five reels · three rows · five fixed paylines</p><button aria-pressed={sound} className="focus-ring inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-muted hover:text-ink" onClick={() => setSound((value) => !value)} type="button">{sound ? <Volume2 size={14} /> : <VolumeX size={14} />} Sound {sound ? "on" : "off"}</button></div>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center gap-2 text-sm font-semibold text-ink"><Sparkles className="text-amber" size={16} />{result?.payout ? `Win ${formatVc(result.payout)}` : result ? "No line win this round" : "Ready when you are"}</div><p className="mt-2 text-xs leading-5 text-muted">{result ? `${result.winningLines.length} winning line${result.winningLines.length === 1 ? "" : "s"} · net ${result.netResult >= 0 ? "+" : ""}${formatVc(result.netResult)}` : "The server generates the reels and settles the wager before this display animates."}</p></div>
        </div>
        <aside className="grid content-start gap-4"><WagerSelector value={wager} onChange={setWager} /><Button disabled={isSubmitting} onClick={spin} size="lg" variant="primary">{isSubmitting ? <LoaderCircle className="animate-spin" size={17} /> : <Gem size={17} />} {isSubmitting ? "Spinning…" : "Spin reels"}</Button><TableNote error={error} message={result ? `${result.payout > 0 ? "A line connected." : "Round settled."} Balance updated server-side.` : null} /><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Paytable</p><div className="mt-3 grid gap-2 text-xs">{Object.entries(slotSymbolArt).map(([key, art]) => <div className="flex items-center justify-between gap-3" key={key}><span className={`flex items-center gap-2 ${art.tone}`}><span className="text-lg">{art.glyph}</span>{art.label}</span><span className="text-muted">3× {({ crystal: 8, crown: 6, orb: 5, star: 4, lightning: 3, diamond: 2 } as Record<string, number>)[key]}</span></div>)}</div></div></aside>
      </div>
      <div className="mt-7 border-t border-white/10 pt-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Recent rounds</p><div className="mt-3 grid gap-2 sm:grid-cols-4">{history.length ? history.map((round) => <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3" key={round.roundId}><div className="flex items-center justify-between gap-2 text-xs"><span className="text-muted">{formatVc(round.wager)}</span><span className={round.netResult >= 0 ? "text-mint" : "text-rose-300"}>{round.netResult >= 0 ? "+" : ""}{round.netResult} VC</span></div><p className="mt-2 text-[10px] text-muted">{round.winningLines.length ? `${round.winningLines.length} line win` : "No line win"}</p></div>) : <p className="text-xs text-muted">Your settled spins will appear here.</p>}</div></div>
    </section>
  );
}

type RouletteBetType = "RED" | "BLACK" | "ODD" | "EVEN" | "SINGLE_NUMBER";
type RouletteResult = { roundId: string; winningNumber: number; winningColor: "GREEN" | "RED" | "BLACK"; bet: { type: RouletteBetType; number?: number }; wager: number; payout: number; netResult: number; newBalance: number };
const redNumbers = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export function RoulettePanel({ initialBalance }: { initialBalance: number }) {
  const [balance, setBalance] = useState(initialBalance); const [wager, setWager] = useState<Wager>(100); const [betType, setBetType] = useState<RouletteBetType>("RED"); const [number, setNumber] = useState(7); const [result, setResult] = useState<RouletteResult | null>(null); const [history, setHistory] = useState<RouletteResult[]>([]); const [isSubmitting, setIsSubmitting] = useState(false); const [isAnimating, setIsAnimating] = useState(false); const [error, setError] = useState<string | null>(null);
  const selectedBet = useMemo(() => betType === "SINGLE_NUMBER" ? { type: betType, number } : { type: betType }, [betType, number]);

  async function spin() {
    if (isSubmitting) return; setError(null); setIsSubmitting(true); setIsAnimating(true);
    try { const next = await requestJson<RouletteResult>("/api/v1/games/european-roulette/spin", { method: "POST", headers: { "Idempotency-Key": idempotencyKey("roulette-spin") }, body: JSON.stringify({ wager, bet: selectedBet }) }); setResult(next); setBalance(next.newBalance); setHistory((current) => [next, ...current].slice(0, 5)); window.setTimeout(() => setIsAnimating(false), 850); } catch (caught) { setError(caught instanceof Error ? caught.message : "The spin could not be completed."); setIsAnimating(false); } finally { setIsSubmitting(false); }
  }

  const betButtons: { type: RouletteBetType; label: string; detail: string }[] = [{ type: "RED", label: "Red", detail: "1:1" }, { type: "BLACK", label: "Black", detail: "1:1" }, { type: "ODD", label: "Odd", detail: "1:1" }, { type: "EVEN", label: "Even", detail: "1:1" }, { type: "SINGLE_NUMBER", label: "Single number", detail: "35:1" }];
  return <section className="surface rounded-[28px] p-5 sm:p-8"><TableHeader balance={balance} label="European Roulette · single zero" onRefresh={() => setBalance(balance)} /><div className="mt-6 grid gap-6 lg:grid-cols-[1fr_270px]"><div><div className={`mx-auto grid h-64 w-64 place-items-center rounded-full border-[14px] border-[#bd3e55]/80 bg-[conic-gradient(#171b2e_0_12deg,#bd3e55_12deg_24deg,#171b2e_24deg_36deg,#bd3e55_36deg_48deg,#171b2e_48deg_60deg,#bd3e55_60deg_72deg,#171b2e_72deg_84deg,#bd3e55_84deg_96deg,#171b2e_96deg_108deg,#bd3e55_108deg_120deg,#171b2e_120deg_132deg,#bd3e55_132deg_144deg,#171b2e_144deg_156deg,#bd3e55_156deg_168deg,#171b2e_168deg_180deg,#bd3e55_180deg_192deg,#171b2e_192deg_204deg,#bd3e55_204deg_216deg,#171b2e_216deg_228deg,#bd3e55_228deg_240deg,#171b2e_240deg_252deg,#bd3e55_252deg_264deg,#171b2e_264deg_276deg,#bd3e55_276deg_288deg,#171b2e_288deg_300deg,#bd3e55_300deg_312deg,#171b2e_312deg_324deg,#bd3e55_324deg_336deg,#171b2e_336deg_348deg,#bd3e55_348deg_360deg)] shadow-[0_20px_60px_rgba(0,0,0,0.35)] transition-transform duration-700 ${isAnimating ? "rotate-[360deg]" : ""}`}><div className="grid h-36 w-36 place-items-center rounded-full border border-white/15 bg-[#111827] shadow-inner"><div className="grid h-20 w-20 place-items-center rounded-full border border-amber/25 bg-amber/10 text-center"><span className="display text-3xl text-amber-bright">{result ? result.winningNumber : "0"}</span><span className="text-[8px] font-bold uppercase tracking-[0.14em] text-muted">last result</span></div></div></div><div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-center"><div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"><p className="text-[10px] uppercase tracking-[0.15em] text-muted">Result</p><p className="mt-1 text-xl font-semibold text-ink">{result ? `${result.winningNumber} · ${result.winningColor}` : "—"}</p></div><div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"><p className="text-[10px] uppercase tracking-[0.15em] text-muted">Payout</p><p className="mt-1 text-xl font-semibold text-mint">{result ? formatVc(result.payout) : "—"}</p></div></div><div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Choose a number for a single-number bet</p><div className="mt-3 grid grid-cols-7 gap-1.5">{Array.from({ length: 37 }, (_, value) => <button aria-label={`Bet on ${value}`} aria-pressed={betType === "SINGLE_NUMBER" && number === value} className={`focus-ring min-h-8 rounded-lg border text-[11px] font-bold ${value === 0 ? "border-mint/50 bg-mint/15 text-mint" : redNumbers.has(value) ? "border-rose-300/30 bg-rose-400/15 text-rose-200" : "border-white/10 bg-white/[0.04] text-muted-strong"} ${betType === "SINGLE_NUMBER" && number === value ? "ring-2 ring-amber" : ""}`} key={value} onClick={() => { setBetType("SINGLE_NUMBER"); setNumber(value); }} type="button">{value}</button>)}</div></div></div><aside className="grid content-start gap-4"><WagerSelector value={wager} onChange={setWager} /><div className="grid gap-2">{betButtons.map((bet) => <button aria-pressed={betType === bet.type} className={`focus-ring flex min-h-12 items-center justify-between rounded-xl border px-4 text-left ${betType === bet.type ? "border-amber/60 bg-amber/10 text-ink" : "border-white/10 bg-white/[0.03] text-muted-strong hover:bg-white/[0.06]"}`} key={bet.type} onClick={() => setBetType(bet.type)} type="button"><span className="text-sm font-semibold">{bet.label}</span><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{bet.detail}</span></button>)}</div><Button disabled={isSubmitting} onClick={spin} size="lg" variant="primary">{isSubmitting ? <LoaderCircle className="animate-spin" size={17} /> : <Sparkles size={17} />} {isSubmitting ? "Spinning…" : "Spin wheel"}</Button><TableNote error={error} message={result ? `${result.bet.type === "SINGLE_NUMBER" ? `Number ${result.bet.number}` : result.bet.type} bet settled.` : "Select a bet, then spin."} /><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-5 text-muted"><div className="flex items-center gap-2 font-semibold text-ink"><CircleHelp size={14} className="text-amber" /> European rules</div><p className="mt-2">0 is green. Red/black and odd/even return 2× the wager; a matching number returns 36× the wager.</p></div></aside></div><div className="mt-7 border-t border-white/10 pt-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Result history</p><div className="mt-3 flex flex-wrap gap-2">{history.length ? history.map((round) => <span className={`rounded-full border px-3 py-2 text-xs font-semibold ${round.winningColor === "RED" ? "border-rose-300/30 bg-rose-400/15 text-rose-200" : round.winningColor === "BLACK" ? "border-white/15 bg-white/[0.05] text-muted-strong" : "border-mint/30 bg-mint/10 text-mint"}`} key={round.roundId}>{round.winningNumber} · {round.winningColor}</span>) : <span className="text-xs text-muted">Settled results will appear here.</span>}</div></div></section>;
}

type Card = { rank: string; suit: "clubs" | "diamonds" | "hearts" | "spades" };
type BlackjackHand = { roundId: string; status: "ACTIVE" | "SETTLED"; playerCards: Card[]; dealerCards: Card[]; playerValue: number; dealerValue: number; phase: string; wager: number; payout: number; netResult: number; newBalance: number; canHit: boolean; canStand: boolean; canDouble: boolean; doubled: boolean };
const suitMark: Record<Card["suit"], string> = { clubs: "♣", diamonds: "♦", hearts: "♥", spades: "♠" };

function PlayingCard({ card, hidden = false }: { card: Card; hidden?: boolean }) {
  if (hidden) return <div aria-label="Hidden dealer card" className="grid aspect-[0.7] min-h-28 place-items-center rounded-xl border border-amber/30 bg-[#1a253a] text-3xl text-amber shadow-lg">✦</div>;
  const red = card.suit === "diamonds" || card.suit === "hearts";
  return <div aria-label={`${card.rank} of ${card.suit}`} className={`flex aspect-[0.7] min-h-28 flex-col justify-between rounded-xl border border-white/15 bg-[#f8f4e9] p-3 text-[#121827] shadow-lg ${red ? "text-rose-700" : ""}`}><span className="text-lg font-bold">{card.rank}</span><span className="self-center text-3xl">{suitMark[card.suit]}</span><span className="rotate-180 self-end text-lg font-bold">{card.rank}</span></div>;
}

export function BlackjackPanel({ initialBalance }: { initialBalance: number }) {
  const [balance, setBalance] = useState(initialBalance); const [wager, setWager] = useState<Wager>(100); const [hand, setHand] = useState<BlackjackHand | null>(null); const [isSubmitting, setIsSubmitting] = useState(false); const [error, setError] = useState<string | null>(null); const [recovered, setRecovered] = useState(false);
  useEffect(() => { let active = true; requestJson<BlackjackHand | null>("/api/v1/games/veltrix-blackjack/recover").then((next) => { if (active && next) { setHand(next); setBalance(next.newBalance); setRecovered(true); } }).catch(() => undefined); return () => { active = false; }; }, []);

  async function deal() { if (isSubmitting) return; setError(null); setIsSubmitting(true); try { const next = await requestJson<BlackjackHand>("/api/v1/games/veltrix-blackjack/deal", { method: "POST", headers: { "Idempotency-Key": idempotencyKey("blackjack-deal") }, body: JSON.stringify({ wager }) }); setHand(next); setBalance(next.newBalance); } catch (caught) { setError(caught instanceof Error ? caught.message : "The deal could not be completed."); } finally { setIsSubmitting(false); } }
  async function action(actionName: "hit" | "stand" | "double") { if (!hand || isSubmitting) return; setError(null); setIsSubmitting(true); try { const next = await requestJson<BlackjackHand>(`/api/v1/games/veltrix-blackjack/${hand.roundId}/${actionName}`, { method: "POST", headers: { "Idempotency-Key": idempotencyKey(`blackjack-${actionName}`) } }); setHand(next); setBalance(next.newBalance); } catch (caught) { setError(caught instanceof Error ? caught.message : "That table action could not be completed."); } finally { setIsSubmitting(false); } }
  const active = hand?.status === "ACTIVE";
  const phaseLabel = hand?.phase?.replaceAll("_", " ") ?? "Awaiting deal";
  return <section className="surface rounded-[28px] p-5 sm:p-8"><TableHeader balance={balance} label="Veltrix Blackjack · dealer stands on soft 17" onRefresh={() => setBalance(balance)} /><div className="mt-6 grid gap-6 lg:grid-cols-[1fr_270px]"><div className="rounded-[24px] border border-emerald-200/10 bg-[radial-gradient(circle_at_50%_0%,rgba(90,184,143,0.2),transparent_48%),#102d29] p-5 sm:p-8"><div className="flex items-center justify-between gap-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100/70">Dealer · {active ? "one card showing" : hand ? phaseLabel : "ready"}</p><span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs font-semibold text-emerald-100/80">{hand ? `${hand.dealerValue} value` : "—"}</span></div><div className="mt-4 grid max-w-sm grid-cols-3 gap-2">{hand ? hand.dealerCards.map((card, index) => <PlayingCard card={card} hidden={active && index === 1} key={`${card.rank}-${card.suit}-${index}`} />) : <div className="col-span-3 rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-emerald-100/60">Deal a hand to take a seat.</div>}</div><div className="my-7 h-px bg-white/10" /><div className="flex items-center justify-between gap-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100/70">You · {hand ? phaseLabel : "player hand"}</p><span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs font-semibold text-emerald-100/80">{hand ? `${hand.playerValue} value` : "—"}</span></div><div className="mt-4 grid max-w-lg grid-cols-4 gap-2">{hand ? hand.playerCards.map((card, index) => <PlayingCard card={card} key={`${card.rank}-${card.suit}-${index}`} />) : null}</div></div><aside className="grid content-start gap-4"><WagerSelector value={wager} onChange={setWager} /><Button disabled={isSubmitting || Boolean(active)} onClick={deal} size="lg" variant="primary">{isSubmitting && !active ? <LoaderCircle className="animate-spin" size={17} /> : <Sparkles size={17} />} {recovered && active ? "Hand recovered" : active ? "Hand in play" : "Deal hand"}</Button>{active ? <div className="grid grid-cols-3 gap-2"><Button disabled={isSubmitting || !hand.canHit} onClick={() => action("hit")} size="sm">Hit</Button><Button disabled={isSubmitting || !hand.canStand} onClick={() => action("stand")} size="sm">Stand</Button><Button disabled={isSubmitting || !hand.canDouble} onClick={() => action("double")} size="sm">Double</Button></div> : null}<TableNote error={error} message={hand ? `${phaseLabel}${hand.payout ? ` · returned ${formatVc(hand.payout)}` : ""}` : "Blackjack pays 3:2; pushes return the wager."} /><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-5 text-muted"><div className="flex items-center gap-2 font-semibold text-ink"><ShieldCheck size={14} className="text-mint" /> Table rules</div><ul className="mt-2 grid gap-1.5"><li>Dealer stands on soft 17.</li><li>Blackjack pays 3:2.</li><li>Double on the initial two cards.</li><li>No split, insurance, or surrender.</li></ul></div></aside></div><div className="mt-7 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-3"><div className="flex items-start gap-3 text-xs text-muted"><Check className="mt-0.5 shrink-0 text-mint" size={15} /><span>Cards and dealer decisions are generated on the server.</span></div><div className="flex items-start gap-3 text-xs text-muted"><Check className="mt-0.5 shrink-0 text-mint" size={15} /><span>Refresh safely recovers an active hand without another wager.</span></div><div className="flex items-start gap-3 text-xs text-muted"><Check className="mt-0.5 shrink-0 text-mint" size={15} /><span>Every action is idempotent and wallet-settled atomically.</span></div></div></section>;
}
