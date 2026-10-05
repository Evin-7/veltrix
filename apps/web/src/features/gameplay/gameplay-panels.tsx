"use client";

import { WinCelebration } from "./win-celebration";

import { LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { VeltrixSelect } from "@/components/ui/veltrix-select";
import { isAbortError, requestJson } from "@/lib/api-client";
import { errorMessage } from "@/lib/app-error";
import { formatCurrency } from "@/lib/currency";
import { emitWalletUpdate } from "@/lib/wallet-sync";
import { slotCatalogForSlug, type SlotPayouts } from "@/shared/slot-catalog";
import { useGameAudio, type GameSound } from "./game-audio";
import {
  getSlotDisplaySymbol,
  getSlotDisplaySymbols,
  InvalidSlotOutcomeError,
  validateSlotReels,
} from "./slot-symbols";

const wagers = [10, 25, 50, 100, 250, 500] as const;
type Wager = (typeof wagers)[number];

function idempotencyKey(scope: string) {
  const token =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}`;
  return `${scope}:${token}`;
}

const wagerOptions = wagers.map((wager) => ({
  label: formatCurrency(wager),
  value: String(wager),
}));

function WagerSelector({
  value,
  onChange,
}: {
  value: Wager;
  onChange: (value: Wager) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
        <span>Wager</span>
        <span>€</span>
      </span>
      <VeltrixSelect
        ariaLabel="Wager amount"
        className="w-full"
        onValueChange={(nextWager) => onChange(Number(nextWager) as Wager)}
        options={wagerOptions}
        value={String(value)}
      />
    </label>
  );
}

function TableNote({ message }: { message: string | null }) {
  return (
    <p aria-live="polite" className="game-status-message text-xs font-semibold">
      {message}
    </p>
  );
}

type SlotResult = {
  roundId: string;
  reels: string[][];
  winningLines: {
    line: number;
    symbol: string;
    count: number;
    multiplier: number;
    payout: number;
  }[];
  wager: number;
  payout: number;
  netResult: number;
  newBalance: number;
};

function parseSlotResult(gameSlug: string, result: SlotResult): SlotResult {
  const reels = validateSlotReels(gameSlug, result.reels);
  for (const line of result.winningLines)
    getSlotDisplaySymbol(gameSlug, line.symbol);
  return { ...result, reels };
}

export function SlotsPanel({
  gameSlug,
}: {
  gameSlug: string;
}) {
  const art = getSlotDisplaySymbols(gameSlug);
  const paytable = slotCatalogForSlug(gameSlug)?.paytable as
    Readonly<Record<string, SlotPayouts>> | undefined;
  const { play } = useGameAudio();
  const [wager, setWager] = useState<Wager>(100);
  const [reels, setReels] = useState<string[][]>(
    Array.from({ length: 5 }, () =>
      Array.from({ length: 3 }, () => art[art.length - 1].id),
    ),
  );
  const [result, setResult] = useState<SlotResult | null>(null);
  const [history, setHistory] = useState<SlotResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const { showToast } = useToast();
  const animationTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (animationTimer.current !== null)
        window.clearTimeout(animationTimer.current);
    },
    [],
  );

  async function spin() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setIsAnimating(true);
    play("slot-spin-start");
    try {
      const next = parseSlotResult(
        gameSlug,
        await requestJson<SlotResult>(`/api/v1/games/${gameSlug}/spin`, {
          method: "POST",
          headers: { "Idempotency-Key": idempotencyKey(`slot-${gameSlug}`) },
          body: JSON.stringify({ wager }),
        }),
      );
      setResult(next);
      setReels(next.reels);
      emitWalletUpdate(next.newBalance);
      setHistory((current) => [next, ...current].slice(0, 4));
      next.reels.forEach((_, reelIndex) =>
        play("slot-reel-stop", { delayMs: reelIndex * 110 }),
      );
      play(
        next.payout >= next.wager * 8
          ? "slot-big-win"
          : next.payout > 0
            ? "slot-win"
            : "slot-no-win",
        { delayMs: 620 },
      );
      animationTimer.current = window.setTimeout(
        () => setIsAnimating(false),
        650,
      );
    } catch (caught) {
      if (caught instanceof InvalidSlotOutcomeError)
        console.error("[Veltrix] Invalid slot outcome", {
          gameSlug,
          error: caught.message,
        });
      showToast(
        errorMessage(
          caught,
          caught instanceof InvalidSlotOutcomeError
            ? "INTERNAL_ERROR"
            : "INVALID_WAGER",
        ),
        "error",
      );
      setIsAnimating(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="gameplay-layout p-5 sm:p-8">
      <WinCelebration kind="slots" result={result} gameSlug={gameSlug} ready={!isAnimating && !isSubmitting} />
      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div>
          <div
            className={`grid grid-cols-5 gap-2 game-reels-stage rounded-[24px] border p-3 shadow-[inset_0_0_50px_rgba(28,168,192,0.12)] sm:gap-3 sm:p-5 ${isAnimating ? "animate-pulse" : ""}`}
            aria-label="Five reel three row slot result"
          >
            {reels.map((reel, reelIndex) => (
              <div className="grid gap-2" key={`reel-${reelIndex}`}>
                {reel.map((symbol, rowIndex) => {
                  const symbolArt = getSlotDisplaySymbol(gameSlug, symbol);
                  return (
                    <div
                      aria-label={symbolArt.label}
                      className="grid aspect-square place-items-center rounded-xl border border-white/10 bg-white/[0.055] text-3xl shadow-[0_8px_18px_rgba(0,0,0,0.2)] sm:text-5xl"
                      key={`${reelIndex}-${rowIndex}`}
                    >
                      <span
                        className={`slot-tone-board ${symbolArt.tone} drop-shadow-[0_0_14px_currentColor]`}
                      >
                        {symbolArt.glyph}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">
              Five reels · three rows · five fixed paylines
            </p>
          </div>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-semibold text-ink">
              {result?.payout
                ? `Win ${formatCurrency(result.payout)}`
                : result
                  ? "No line win this round"
                  : "Ready when you are"}
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">
              {result
                ? `${result.winningLines.length} winning line${result.winningLines.length === 1 ? "" : "s"} · net ${formatCurrency(result.netResult, { sign: "always" })}`
                : "Your result is ready when the reels stop."}
            </p>
          </div>
        </div>
        <aside className="grid content-start gap-4">
          <WagerSelector value={wager} onChange={setWager} />
          <Button
            disabled={isSubmitting}
            onClick={spin}
            size="lg"
            variant="primary"
          >
            {isSubmitting ? (
              <LoaderCircle className="animate-spin" size={17} />
            ) : null}{" "}
            {isSubmitting ? "Spinning…" : "Spin reels"}
          </Button>
          <TableNote
            message={result ? "Round settled and wallet updated." : null}
          />
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              Paytable · 3-symbol returns
            </p>
            <div className="slot-paytable-list mt-3 grid gap-2 text-xs">
              {art.map((symbol) => (
                <div
                  className="flex items-center justify-between gap-3"
                  key={symbol.id}
                >
                  <span className={`flex items-center gap-2 ${symbol.tone}`}>
                    <span className="text-lg">{symbol.glyph}</span>
                    {symbol.label}
                  </span>
                  <span className="text-muted">
                    {paytable?.[symbol.id]?.[3] ?? "—"}×
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
      <div className="mt-7 border-t border-white/10 pt-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
          Recent rounds
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {history.length ? (
            history.map((round) => (
              <div
                className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                key={round.roundId}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted">{formatCurrency(round.wager)}</span>
                  <span
                    className={
                      round.netResult >= 0 ? "text-mint" : "text-rose-300"
                    }
                  >
                    {formatCurrency(round.netResult, { sign: "always" })}
                  </span>
                </div>
                <p className="mt-2 text-[10px] text-muted">
                  {round.winningLines.length
                    ? `${round.winningLines.length} line win`
                    : "No line win"}
                </p>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted">
              Your settled spins will appear here.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

type RouletteBetType =
  | "RED"
  | "BLACK"
  | "ODD"
  | "EVEN"
  | "LOW_18"
  | "HIGH_19"
  | "DOZEN_1_12"
  | "DOZEN_13_24"
  | "DOZEN_25_36"
  | "COLUMN_1"
  | "COLUMN_2"
  | "COLUMN_3"
  | "SINGLE_NUMBER";
type RouletteResult = {
  roundId: string;
  winningNumber: number;
  winningColor: "GREEN" | "RED" | "BLACK";
  bet: { type: RouletteBetType; number?: number };
  wager: number;
  payout: number;
  netResult: number;
  newBalance: number;
};
type RouletteHistoryItem = Pick<
  RouletteResult,
  "roundId" | "winningNumber" | "winningColor" | "wager" | "payout" | "netResult"
>;
const redNumbers = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export function RoulettePanel({
  gameSlug,
}: {
  gameSlug: string;
}) {
  const [wager, setWager] = useState<Wager>(100);
  const [betType, setBetType] = useState<RouletteBetType>("RED");
  const [number, setNumber] = useState(7);
  const [result, setResult] = useState<RouletteResult | null>(null);
  const [history, setHistory] = useState<RouletteHistoryItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const { showToast } = useToast();
  const animationTimer = useRef<number | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function loadRecentResults() {
      try {
        const recent = await requestJson<RouletteHistoryItem[]>(
          `/api/v1/games/${gameSlug}/rounds/recent`,
          { signal: controller.signal },
        );
        setHistory((current) => {
          const seen = new Set(current.map((round) => round.roundId));
          return [
            ...current,
            ...recent.filter((round) => !seen.has(round.roundId)),
          ].slice(0, 5);
        });
      } catch (caught) {
        if (!isAbortError(caught)) {
          console.error(
            "[Veltrix] Could not load recent roulette results",
            caught,
          );
        }
      }
    }
    void loadRecentResults();
    return () => controller.abort();
  }, [gameSlug]);
  useEffect(
    () => () => {
      if (animationTimer.current !== null)
        window.clearTimeout(animationTimer.current);
    },
    [],
  );
  const { play } = useGameAudio();
  async function spin() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setIsAnimating(true);
    play("roulette-spin");
    play("chip-place", { delayMs: 40 });
    const bet =
      betType === "SINGLE_NUMBER"
        ? { type: betType, number }
        : { type: betType };
    try {
      const next = await requestJson<RouletteResult>(
        `/api/v1/games/${gameSlug}/spin`,
        {
          method: "POST",
          headers: {
            "Idempotency-Key": idempotencyKey(`roulette-${gameSlug}`),
          },
          body: JSON.stringify({ wager, bet }),
        },
      );
      setResult(next);
      emitWalletUpdate(next.newBalance);
      setHistory((current) => [next, ...current].slice(0, 5));
      play("roulette-settle", { delayMs: 420 });
      play("roulette-result", { delayMs: 560 });
      play(next.payout > 0 ? "win" : "loss", { delayMs: 690 });
      animationTimer.current = window.setTimeout(
        () => setIsAnimating(false),
        700,
      );
    } catch (caught) {
      showToast(errorMessage(caught, "INVALID_WAGER"), "error");
      setIsAnimating(false);
    } finally {
      setIsSubmitting(false);
    }
  }
  const betButtons: { type: RouletteBetType; label: string; detail: string }[] =
    [
      { type: "RED", label: "Red", detail: "1:1" },
      { type: "BLACK", label: "Black", detail: "1:1" },
      { type: "ODD", label: "Odd", detail: "1:1" },
      { type: "EVEN", label: "Even", detail: "1:1" },
      { type: "LOW_18", label: "1–18", detail: "1:1" },
      { type: "HIGH_19", label: "19–36", detail: "1:1" },
      { type: "DOZEN_1_12", label: "1st dozen", detail: "2:1" },
      { type: "DOZEN_13_24", label: "2nd dozen", detail: "2:1" },
      { type: "DOZEN_25_36", label: "3rd dozen", detail: "2:1" },
      { type: "COLUMN_1", label: "Column 1", detail: "2:1" },
      { type: "COLUMN_2", label: "Column 2", detail: "2:1" },
      { type: "COLUMN_3", label: "Column 3", detail: "2:1" },
      { type: "SINGLE_NUMBER", label: "Single number", detail: "35:1" },
    ];
  const lastResult = history[0] ?? result;
  return (
    <section className="gameplay-layout p-5 sm:p-8">
      <WinCelebration kind="roulette" result={result} gameSlug={gameSlug} ready={!isAnimating && !isSubmitting} />
      <div className="grid gap-6 lg:grid-cols-[1fr_270px]">
        <div>
          <div
            className={`mx-auto grid h-64 w-64 place-items-center rounded-full border-[14px] border-[#bd3e55]/80 bg-[conic-gradient(#171b2e_0_12deg,#bd3e55_12deg_24deg,#171b2e_24deg_36deg,#bd3e55_36deg_48deg,#171b2e_48deg_60deg,#bd3e55_60deg_72deg,#171b2e_72deg_84deg,#bd3e55_84deg_96deg,#171b2e_96deg_108deg,#bd3e55_108deg_120deg,#171b2e_120deg_132deg,#bd3e55_132deg_144deg,#171b2e_144deg_156deg,#bd3e55_156deg_168deg,#171b2e_168deg_180deg,#bd3e55_180deg_192deg,#171b2e_192deg_204deg,#bd3e55_204deg_216deg,#171b2e_216deg_228deg,#bd3e55_228deg_240deg,#171b2e_240deg_252deg,#bd3e55_252deg_264deg,#171b2e_264deg_276deg,#bd3e55_276deg_288deg,#171b2e_288deg_300deg,#bd3e55_300deg_312deg,#171b2e_312deg_324deg,#bd3e55_324deg_336deg,#171b2e_336deg_348deg,#bd3e55_348deg_360deg)] shadow-[0_20px_60px_rgba(0,0,0,0.35)] transition-transform duration-700 ${isAnimating ? "rotate-[360deg]" : ""}`}
          >
            <div className="grid h-36 w-36 place-items-center rounded-full border border-white/15 bg-[#111827] shadow-inner">
              <div
                aria-label={
                  lastResult
                    ? `Last result ${lastResult.winningNumber}, ${lastResult.winningColor.toLowerCase()}`
                    : "No roulette result yet"
                }
                aria-live="polite"
                className="grid h-20 w-20 place-items-center gap-1 rounded-full border border-amber/25 bg-amber/10 px-2 text-center"
              >
                <span className="roulette-last-result-value tabular-nums">
                  {lastResult ? lastResult.winningNumber : "—"}
                </span>
                <span className="roulette-last-result-label">
                  last result
                </span>
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-center">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted">
                Result
              </p>
              <p className="mt-1 text-lg font-semibold text-ink tabular-nums">
                {lastResult
                  ? `${lastResult.winningNumber} · ${lastResult.winningColor}`
                  : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted">
                Payout
              </p>
              <p className="mt-1 text-lg font-semibold text-mint tabular-nums">
                {lastResult ? formatCurrency(lastResult.payout) : "—"}
              </p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              Choose a number for a single-number bet
            </p>
            <div className="mt-3 grid grid-cols-7 gap-1.5">
              {Array.from({ length: 37 }, (_, value) => (
                <button
                  aria-label={`Bet on ${value}`}
                  aria-pressed={betType === "SINGLE_NUMBER" && number === value}
                  className={`focus-ring min-h-8 rounded-lg border text-[11px] font-bold ${value === 0 ? "border-mint/50 bg-mint/15 text-mint" : redNumbers.has(value) ? "roulette-red-foreground border-rose-300/30 bg-rose-400/15" : "border-white/10 bg-white/[0.04] text-muted-strong"} ${betType === "SINGLE_NUMBER" && number === value ? "ring-2 ring-amber" : ""}`}
                  key={value}
                  onClick={() => {
                    setBetType("SINGLE_NUMBER");
                    setNumber(value);
                  }}
                  type="button"
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>
        <aside className="grid content-start gap-4">
          <WagerSelector value={wager} onChange={setWager} />
          <div className="grid grid-cols-2 gap-2">
            {betButtons.map((bet) => (
              <button
                aria-pressed={betType === bet.type}
                className={`focus-ring flex min-h-12 items-center justify-between rounded-xl border px-3 text-left ${betType === bet.type ? "border-amber/60 bg-amber/10 text-ink" : "border-white/10 bg-white/[0.03] text-muted-strong hover:bg-white/[0.06]"}`}
                key={bet.type}
                onClick={() => setBetType(bet.type)}
                type="button"
              >
                <span className="text-sm font-semibold">{bet.label}</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                  {bet.detail}
                </span>
              </button>
            ))}
          </div>
          <Button
            disabled={isSubmitting}
            onClick={spin}
            size="lg"
            variant="primary"
          >
            {isSubmitting ? (
              <LoaderCircle className="animate-spin" size={17} />
            ) : null}{" "}
            {isSubmitting ? "Spinning…" : "Spin wheel"}
          </Button>
          <TableNote
            message={
              result
                ? "Bet settled and wallet updated."
                : "Select a bet, then spin."
            }
          />
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-5 text-muted">
            <div className="font-semibold text-ink">European rules</div>
            <p className="mt-2">
              0 is green. 1–18, 19–36, red/black and odd/even return 2×; dozens
              and columns return 3×; a matching number returns 36×.
            </p>
          </div>
        </aside>
      </div>
      <div className="mt-7 border-t border-white/10 pt-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
          Result history
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {history.length ? (
            history.map((round) => (
              <span
                className={`rounded-full border px-3 py-2 text-xs font-semibold ${round.winningColor === "RED" ? "roulette-red-foreground border-rose-300/30 bg-rose-400/15" : round.winningColor === "BLACK" ? "border-white/15 bg-white/[0.05] text-muted-strong" : "border-mint/30 bg-mint/10 text-mint"}`}
                key={round.roundId}
              >
                {round.winningNumber} · {round.winningColor}
              </span>
            ))
          ) : (
            <span className="text-xs text-muted">
              Settled results will appear here.
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

type Card = { rank: string; suit: "clubs" | "diamonds" | "hearts" | "spades" };
type BlackjackHand = {
  roundId: string;
  status: "ACTIVE" | "SETTLED";
  playerCards: Card[];
  dealerCards: Card[];
  playerValue: number;
  dealerValue: number;
  phase: string;
  wager: number;
  payout: number;
  netResult: number;
  newBalance: number;
  canHit: boolean;
  canStand: boolean;
  canDouble: boolean;
  doubled: boolean;
};
const suitMark: Record<Card["suit"], string> = {
  clubs: "♣",
  diamonds: "♦",
  hearts: "♥",
  spades: "♠",
};

function PlayingCard({
  card,
  hidden = false,
}: {
  card: Card;
  hidden?: boolean;
}) {
  if (hidden)
    return (
      <div
        aria-label="Hidden dealer card"
        className="grid aspect-[0.7] min-h-28 place-items-center rounded-xl border border-amber/30 bg-[#1a253a] text-[10px] font-bold uppercase tracking-[0.16em] text-amber shadow-lg"
      >
        Hidden
      </div>
    );
  const red = card.suit === "diamonds" || card.suit === "hearts";
  return (
    <div
      aria-label={`${card.rank} of ${card.suit}`}
      className={`flex aspect-[0.7] min-h-28 flex-col justify-between rounded-xl border border-white/15 bg-[#f8f4e9] p-3 text-[#121827] shadow-lg ${red ? "text-rose-700" : ""}`}
    >
      <span className="text-lg font-bold">{card.rank}</span>
      <span className="self-center text-3xl">{suitMark[card.suit]}</span>
      <span className="rotate-180 self-end text-lg font-bold">{card.rank}</span>
    </div>
  );
}

export function BlackjackPanel({
  gameSlug,
}: {
  gameSlug: string;
}) {
  const [wager, setWager] = useState<Wager>(100);
  const [hand, setHand] = useState<BlackjackHand | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const { showToast } = useToast();
  const { play } = useGameAudio();
  const playCards = (count: number, delay = 0) => {
    for (let index = 0; index < count; index += 1)
      play("card-deal", { delayMs: delay + index * 110 });
  };
  const playOutcome = (next: BlackjackHand, delay: number) => {
    if (next.status !== "SETTLED") return;
    const sound: GameSound =
      next.phase === "PLAYER_BLACKJACK"
        ? "blackjack"
        : next.phase === "PUSH"
          ? "push"
          : next.payout > 0
            ? "win"
            : "loss";
    play(sound, { delayMs: delay });
  };
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    requestJson<BlackjackHand | null>(`/api/v1/games/${gameSlug}/recover`, {
      signal: controller.signal,
    })
      .then((next) => {
        if (active && next) {
          setHand(next);
          emitWalletUpdate(next.newBalance);
          setRecovered(true);
        }
      })
      .catch((caught) => {
        if (active && !isAbortError(caught))
          showToast(errorMessage(caught, "NETWORK_ERROR"), "error");
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [gameSlug, showToast]);
  async function deal() {
    if (isSubmitting) return;
    setRecovered(false);
    setIsSubmitting(true);
    play("chip-place");
    try {
      const next = await requestJson<BlackjackHand>(
        `/api/v1/games/${gameSlug}/deal`,
        {
          method: "POST",
          headers: {
            "Idempotency-Key": idempotencyKey(`blackjack-deal-${gameSlug}`),
          },
          body: JSON.stringify({ wager }),
        },
      );
      setHand(next);
      emitWalletUpdate(next.newBalance);
      playCards(next.playerCards.length + next.dealerCards.length);
      playOutcome(
        next,
        (next.playerCards.length + next.dealerCards.length) * 110 + 120,
      );
    } catch (caught) {
      showToast(errorMessage(caught, "INVALID_WAGER"), "error");
    } finally {
      setIsSubmitting(false);
    }
  }
  async function action(actionName: "hit" | "stand" | "double") {
    if (!hand || isSubmitting) return;
    setRecovered(false);
    setIsSubmitting(true);
    play(
      actionName === "hit"
        ? "blackjack-hit"
        : actionName === "stand"
          ? "blackjack-stand"
          : "blackjack-double",
    );
    try {
      const next = await requestJson<BlackjackHand>(
        `/api/v1/games/${gameSlug}/${hand.roundId}/${actionName}`,
        {
          method: "POST",
          headers: {
            "Idempotency-Key": idempotencyKey(
              `blackjack-${gameSlug}-${actionName}`,
            ),
          },
        },
      );
      setHand(next);
      emitWalletUpdate(next.newBalance);
      playCards(
        Math.max(
          1,
          next.playerCards.length -
            hand.playerCards.length +
            next.dealerCards.length -
            hand.dealerCards.length,
        ),
        60,
      );
      playOutcome(next, 250);
    } catch (caught) {
      showToast(errorMessage(caught, "ROUND_ALREADY_SETTLED"), "error");
    } finally {
      setIsSubmitting(false);
    }
  }
  const active = hand?.status === "ACTIVE";
  const phaseLabel = hand?.phase?.replaceAll("_", " ") ?? "Awaiting deal";
  return (
    <section className="gameplay-layout p-5 sm:p-8">
      <WinCelebration kind="blackjack" result={hand} gameSlug={gameSlug} ready={!isSubmitting && !recovered} />
      <div className="grid gap-6 lg:grid-cols-[1fr_270px]">
        <div className="game-board game-board--blackjack rounded-[24px] p-5 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] game-board-label">
              Dealer ·{" "}
              {active ? "one card showing" : hand ? phaseLabel : "ready"}
            </p>
            <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs font-semibold game-board-value">
              {hand ? `${hand.dealerValue} value` : "—"}
            </span>
          </div>
          <div className="mt-4 grid max-w-sm grid-cols-3 gap-2">
            {hand ? (
              hand.dealerCards.map((card, index) => (
                <PlayingCard
                  card={card}
                  hidden={active && index === 1}
                  key={`${card.rank}-${card.suit}-${index}`}
                />
              ))
            ) : (
              <div className="col-span-3 rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm game-board-muted">
                Deal a hand to take a seat.
              </div>
            )}
          </div>
          <div className="my-7 h-px game-board-divider" />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] game-board-label">
              You · {hand ? phaseLabel : "player hand"}
            </p>
            <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs font-semibold game-board-value">
              {hand ? `${hand.playerValue} value` : "—"}
            </span>
          </div>
          <div className="mt-4 grid max-w-lg grid-cols-4 gap-2">
            {hand?.playerCards.map((card, index) => (
              <PlayingCard
                card={card}
                key={`${card.rank}-${card.suit}-${index}`}
              />
            ))}
          </div>
        </div>
        <aside className="grid content-start gap-4">
          <WagerSelector value={wager} onChange={setWager} />
          <Button
            disabled={isSubmitting || Boolean(active)}
            onClick={deal}
            size="lg"
            variant="primary"
          >
            {isSubmitting && !active ? (
              <LoaderCircle className="animate-spin" size={17} />
            ) : null}{" "}
            {active ? "Hand in play" : "Deal hand"}
          </Button>
          {recovered && active ? (
            <p className="game-status-message">Hand recovered</p>
          ) : null}
          {active ? (
            <div className="grid grid-cols-3 gap-2">
              <Button
                disabled={isSubmitting || !hand.canHit}
                onClick={() => action("hit")}
                size="sm"
              >
                Hit
              </Button>
              <Button
                disabled={isSubmitting || !hand.canStand}
                onClick={() => action("stand")}
                size="sm"
              >
                Stand
              </Button>
              <Button
                disabled={isSubmitting || !hand.canDouble}
                onClick={() => action("double")}
                size="sm"
              >
                Double
              </Button>
            </div>
          ) : null}
          <TableNote
            message={
              hand
                ? `${phaseLabel}${hand.payout ? ` · returned ${formatCurrency(hand.payout)}` : ""}`
                : "Blackjack pays 3:2; pushes return the wager."
            }
          />
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-5 text-muted">
            <div className="font-semibold text-ink">Table rules</div>
            <ul className="mt-2 grid gap-1.5">
              <li>Dealer stands on soft 17.</li>
              <li>Blackjack pays 3:2.</li>
              <li>Double on the initial two cards.</li>
              <li>No split, insurance, or surrender.</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
