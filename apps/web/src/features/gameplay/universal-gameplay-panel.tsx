"use client";

import { Car, ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Game } from "@/features/games/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { requestJson } from "@/lib/api-client";
import { errorMessage } from "@/lib/app-error";
import { formatCurrency } from "@/lib/currency";
import { emitWalletUpdate } from "@/lib/wallet-sync";
import { useGameAudio } from "./game-audio";
import { ArcadeGameplayPanel } from "./arcade-gameplay-panel";
import {
  History,
  Wager,
  gameplayIdempotencyKey,
  type HistoryItem,
  type Wager as WagerValue,
} from "./gameplay-common";

type BaccaratCard = {
  rank: string;
  suit: "clubs" | "diamonds" | "hearts" | "spades";
};
type BaccaratResult = {
  roundId: string;
  playerCards: BaccaratCard[];
  bankerCards: BaccaratCard[];
  playerTotal: number;
  bankerTotal: number;
  winner: "PLAYER" | "BANKER" | "TIE";
  bet: "PLAYER" | "BANKER" | "TIE";
  payout: number;
  netResult: number;
  newBalance: number;
};
const suitMark: Record<BaccaratCard["suit"], string> = {
  clubs: "♣",
  diamonds: "♦",
  hearts: "♥",
  spades: "♠",
};

function MiniCard({ card }: { card: BaccaratCard }) {
  const red = card.suit === "diamonds" || card.suit === "hearts";
  return (
    <div
      className={`grid aspect-[0.72] min-w-14 place-items-center rounded-lg border border-white/15 bg-[#f8f4e9] p-2 text-center text-[#121827] shadow-lg ${red ? "text-rose-700" : ""}`}
    >
      <span className="text-sm font-bold">{card.rank}</span>
      <span className="text-xl">{suitMark[card.suit]}</span>
    </div>
  );
}

function BaccaratPanel({
  gameSlug,
}: {
  gameSlug: string;
}) {
  const [wager, setWager] = useState<WagerValue>(100);
  const [bet, setBet] = useState<BaccaratResult["bet"]>("PLAYER");
  const [result, setResult] = useState<BaccaratResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  const { play } = useGameAudio();
  async function deal() {
    if (busy) return;
    setBusy(true);
    play("chip-place");
    try {
      const next = await requestJson<BaccaratResult>(
        `/api/v1/games/${gameSlug}/deal`,
        {
          method: "POST",
          headers: {
            "Idempotency-Key": gameplayIdempotencyKey(`baccarat-${gameSlug}`),
          },
          body: JSON.stringify({ wager, bet }),
        },
      );
      setResult(next);
      emitWalletUpdate(next.newBalance);
      setHistory((current) =>
        [
          {
            id: next.roundId,
            label: `${next.winner} · ${next.playerTotal}-${next.bankerTotal}`,
            net: next.netResult,
          },
          ...current,
        ].slice(0, 5),
      );
      const cardCount = next.playerCards.length + next.bankerCards.length;
      for (let index = 0; index < cardCount; index += 1)
        play("card-deal", { delayMs: index * 105 });
      play(
        next.winner === "PLAYER"
          ? "baccarat-player"
          : next.winner === "BANKER"
            ? "baccarat-banker"
            : "baccarat-tie",
        { delayMs: cardCount * 105 + 120 },
      );
    } catch (caught) {
      showToast(errorMessage(caught, "INVALID_WAGER"), "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="gameplay-layout p-5 sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_270px]">
        <div className="game-board game-board--baccarat rounded-[24px] p-5 sm:p-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] game-board-label">
                Player · {result?.playerTotal ?? "—"}
              </p>
              <div className="mt-3 flex gap-2">
                {result?.playerCards.map((card, index) => (
                  <MiniCard
                    card={card}
                    key={`${card.rank}-${card.suit}-${index}`}
                  />
                )) ?? (
                  <p className="rounded-xl border border-dashed border-white/15 p-8 text-sm game-board-muted">
                    Deal to reveal cards.
                  </p>
                )}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] game-board-label">
                Banker · {result?.bankerTotal ?? "—"}
              </p>
              <div className="mt-3 flex gap-2">
                {result?.bankerCards.map((card, index) => (
                  <MiniCard
                    card={card}
                    key={`${card.rank}-${card.suit}-${index}`}
                  />
                )) ?? (
                  <p className="rounded-xl border border-dashed border-white/15 p-8 text-sm game-board-muted">
                    The shoe is ready.
                  </p>
                )}
              </div>
            </div>
          </div>
          {result ? (
            <div className="mt-7 rounded-2xl border border-white/10 bg-black/15 p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.16em] game-board-label">
                {result.winner} wins
              </p>
              <p className="mt-2 text-2xl font-bold game-board-fg">
                {result.payout
                  ? `Returned ${formatCurrency(result.payout)}`
                  : "Bet lost"}
              </p>
            </div>
          ) : null}
        </div>
        <aside className="grid content-start gap-4">
          <Wager value={wager} onChange={setWager} />
          <div className="grid grid-cols-3 gap-2">
            {(["PLAYER", "BANKER", "TIE"] as const).map((item) => (
              <button
                aria-pressed={bet === item}
                className={`focus-ring min-h-12 rounded-xl border text-xs font-bold ${bet === item ? "border-amber/60 bg-amber/10 text-ink" : "border-white/10 bg-white/[0.03] text-muted-strong"}`}
                key={item}
                onClick={() => setBet(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
          <Button disabled={busy} onClick={deal} size="lg" variant="primary">
            {busy ? <LoaderCircle className="animate-spin" size={17} /> : null}{" "}
            {busy ? "Dealing…" : "Deal baccarat"}
          </Button>
          <p aria-live="polite" className="min-h-6 text-xs font-semibold text-mint">
            {result
              ? `Bet ${result.bet} settled server-side.`
              : "Player and banker draw by standard baccarat rules."}
          </p>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-5 text-muted">
            <div className="font-semibold text-ink">Table rules</div>
            <p className="mt-2">
              Player and banker totals use modulo 10. Player bets return 2×,
              banker bets return 1.95×, and ties return 9×.
            </p>
          </div>
        </aside>
      </div>
      <History items={history} />
    </section>
  );
}

type DiceResult = {
  roundId: string;
  roll: number;
  bet: "HIGH" | "LOW";
  payout: number;
  netResult: number;
  newBalance: number;
};
function DicePanel({
  gameSlug,
}: {
  gameSlug: string;
}) {
  const [wager, setWager] = useState<WagerValue>(100);
  const [bet, setBet] = useState<DiceResult["bet"]>("HIGH");
  const [result, setResult] = useState<DiceResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  const { play } = useGameAudio();
  async function roll() {
    if (busy) return;
    setBusy(true);
    play("dice-shake");
    play("dice-roll", { delayMs: 170 });
    try {
      const next = await requestJson<DiceResult>(
        `/api/v1/games/${gameSlug}/spin`,
        {
          method: "POST",
          headers: {
            "Idempotency-Key": gameplayIdempotencyKey(`dice-${gameSlug}`),
          },
          body: JSON.stringify({ wager, bet }),
        },
      );
      setResult(next);
      emitWalletUpdate(next.newBalance);
      setHistory((current) =>
        [
          {
            id: next.roundId,
            label: `Rolled ${next.roll}`,
            net: next.netResult,
          },
          ...current,
        ].slice(0, 5),
      );
      play("dice-land", { delayMs: 350 });
      play(next.payout > 0 ? "win" : "loss", { delayMs: 480 });
    } catch (caught) {
      showToast(errorMessage(caught, "INVALID_WAGER"), "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="gameplay-layout p-5 sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_270px]">
        <div className="game-board game-board--dice rounded-[24px] p-8 text-center sm:p-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] game-board-muted">
            Dice table
          </p>
          <div
            className={`mx-auto mt-5 grid h-36 w-36 place-items-center rounded-[30px] border border-amber-200/20 bg-black/20 shadow-2xl ${busy ? "animate-pulse" : ""}`}
          >
            <span className="display text-7xl game-board-fg">
              {result?.roll ?? "—"}
            </span>
          </div>
          <p className="mt-5 text-sm game-board-muted">
            High is 51–100. Low is 1–49. A roll of 50 loses either bet.
          </p>
        </div>
        <aside className="grid content-start gap-4">
          <Wager value={wager} onChange={setWager} />
          <div className="grid grid-cols-2 gap-2">
            {(["HIGH", "LOW"] as const).map((item) => (
              <button
                aria-pressed={bet === item}
                className={`focus-ring min-h-12 rounded-xl border text-sm font-bold ${bet === item ? "border-amber/60 bg-amber/10 text-ink" : "border-white/10 bg-white/[0.03] text-muted-strong"}`}
                key={item}
                onClick={() => setBet(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
          <Button disabled={busy} onClick={roll} size="lg" variant="primary">
            {busy ? <LoaderCircle className="animate-spin" size={17} /> : null}{" "}
            {busy ? "Rolling…" : "Roll dice"}
          </Button>
          <p aria-live="polite" className="min-h-6 text-xs font-semibold text-mint">
            {result
              ? `${result.bet} settled · ${result.payout ? `returned ${formatCurrency(result.payout)}` : "no payout"}.`
              : "Choose a side and roll."}
          </p>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-5 text-muted">
            <div className="font-semibold text-ink">House rules</div>
            <p className="mt-2">A winning bet returns 2× total.</p>
          </div>
        </aside>
      </div>
      <History items={history} />
    </section>
  );
}

type ArcadeResult = {
  roundId: string;
  distance: number;
  tokens: number;
  boosts: number;
  score: number;
  payout: number;
  netResult: number;
  newBalance: number;
};

export function ArcadePanel({
  gameSlug,
}: {
  gameSlug: string;
}) {
  const [wager, setWager] = useState<WagerValue>(100);
  const [lane, setLane] = useState(1);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ArcadeResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const { showToast } = useToast();
  const { play, startAmbient, stopAmbient } = useGameAudio();
  const bestScore = useRef(0);
  const previousLane = useRef(lane);
  const settleTimer = useRef<number | null>(null);
  useEffect(() => {
    if (running) startAmbient("arcade");
    else stopAmbient();
    return stopAmbient;
  }, [running, startAmbient, stopAmbient]);
  useEffect(() => {
    if (running && previousLane.current !== lane) play("arcade-lane");
    previousLane.current = lane;
  }, [lane, play, running]);
  useEffect(() => {
    if (!running) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a")
        setLane((value) => Math.max(0, value - 1));
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d")
        setLane((value) => Math.min(2, value + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running]);
  useEffect(
    () => () => {
      if (settleTimer.current !== null)
        window.clearTimeout(settleTimer.current);
    },
    [],
  );
  async function settleRun() {
    setRunning(false);
    setBusy(true);
    try {
      const next = await requestJson<ArcadeResult>(
        `/api/v1/games/${gameSlug}/spin`,
        {
          method: "POST",
          headers: {
            "Idempotency-Key": gameplayIdempotencyKey(`arcade-${gameSlug}`),
          },
          body: JSON.stringify({ wager }),
        },
      );
      setResult(next);
      emitWalletUpdate(next.newBalance);
      setHistory((current) =>
        [
          {
            id: next.roundId,
            label: `${next.score.toLocaleString("en-US")} score`,
            net: next.netResult,
          },
          ...current,
        ].slice(0, 5),
      );
      for (let index = 0; index < Math.min(next.tokens, 3); index += 1)
        play("arcade-token", { delayMs: index * 90 });
      const wasHighScore =
        bestScore.current > 0 && next.score > bestScore.current;
      bestScore.current = Math.max(bestScore.current, next.score);
      play("arcade-complete", { delayMs: 250 });
      if (wasHighScore) play("arcade-high-score", { delayMs: 390 });
      else if (next.tokens >= 3) play("arcade-milestone", { delayMs: 390 });
    } catch (caught) {
      showToast(errorMessage(caught, "INVALID_WAGER"), "error");
    } finally {
      setBusy(false);
    }
  }
  function run() {
    if (running || busy) return;
    setResult(null);
    setRunning(true);
    play("arcade-start");
    settleTimer.current = window.setTimeout(() => void settleRun(), 1800);
  }
  return (
    <section className="gameplay-layout p-5 sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_270px]">
        <div>
          <div className="relative grid min-h-[360px] grid-cols-3 gap-2 overflow-hidden game-board game-board--arcade rounded-[24px] p-4">
            <div
              className={`pointer-events-none absolute inset-0 opacity-30 ${running ? "animate-pulse" : ""}`}
              style={{
                backgroundImage:
                  "linear-gradient(90deg,transparent 32%,rgba(140,180,255,.35) 33%,transparent 34%,transparent 65%,rgba(140,180,255,.35) 66%,transparent 67%)",
              }}
            />
            {[0, 1, 2].map((track) => (
              <button
                aria-label={`Move to lane ${track + 1}`}
                className="relative z-10 rounded-2xl border border-white/10 bg-white/[0.025]"
                key={track}
                onClick={() => running && setLane(track)}
                type="button"
              >
                <span
                  className={`absolute bottom-10 left-1/2 -translate-x-1/2 transition-all duration-200 ${lane === track ? "scale-110 opacity-100" : "scale-75 opacity-35"}`}
                >
                  <Car
                    className="text-cyan-200 drop-shadow-[0_0_18px_currentColor]"
                    size={42}
                  />
                </span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-muted">
              {running
                ? "Drive: use A/D or the arrow keys, or tap a lane."
                : "Three lanes · collect tokens · avoid the neon traffic."}
            </p>
            <div className="flex gap-2">
              <button
                aria-label="Move left"
                className="focus-ring grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-muted hover:text-ink"
                disabled={!running}
                onClick={() => setLane((value) => Math.max(0, value - 1))}
                type="button"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                aria-label="Move right"
                className="focus-ring grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-muted hover:text-ink"
                disabled={!running}
                onClick={() => setLane((value) => Math.min(2, value + 1))}
                type="button"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          {result ? (
            <div className="mt-4 rounded-2xl border border-cyan-200/10 bg-cyan-300/5 p-4 text-sm game-board-value">
              {result.score.toLocaleString("en-US")} score · {result.distance}m
              · {result.tokens} tokens · {result.boosts} boosts
            </div>
          ) : null}
        </div>
        <aside className="grid content-start gap-4">
          <Wager value={wager} onChange={setWager} />
          <Button
            disabled={running || busy}
            onClick={run}
            size="lg"
            variant="primary"
          >
            {running || busy ? (
              <LoaderCircle className="animate-spin" size={17} />
            ) : null}{" "}
            {running ? "Driving…" : busy ? "Settling…" : "Start night run"}
          </Button>
          <p aria-live="polite" className="min-h-6 text-xs font-semibold text-mint">
            {result
              ? `${result.payout ? `Returned ${formatCurrency(result.payout)}` : "Run complete · no payout"}.`
              : "Steer through three lanes, collect tokens and chase a higher score."}
          </p>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-5 text-muted">
            <div className="font-semibold text-ink">Fair run</div>
            <p className="mt-2">
              Steer through three lanes, collect tokens and chase a higher
              score.
            </p>
          </div>
        </aside>
      </div>
      <History items={history} />
    </section>
  );
}

export function UniversalGameplayPanel({
  game,
}: {
  game: Game;
}) {
  if (game.slug === "afterglow-baccarat")
    return (
      <BaccaratPanel
        gameSlug={game.slug}
      />
    );
  if (game.slug === "gilded-dice" || game.slug === "cinder-club")
    return (
      <DicePanel
        gameSlug={game.slug}
      />
    );
  return <ArcadeGameplayPanel game={game} />;
}
