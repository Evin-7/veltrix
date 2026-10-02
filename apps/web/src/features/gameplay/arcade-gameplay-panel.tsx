"use client";

import { Car, ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Game } from "@/features/games/types";
import { requestJson } from "@/lib/api-client";
import { errorMessage } from "@/lib/app-error";
import { formatCurrency } from "@/lib/currency";
import { emitWalletUpdate } from "@/lib/wallet-sync";
import {
  Header,
  History,
  Wager,
  gameplayIdempotencyKey,
  type HistoryItem,
  type Wager as WagerValue,
} from "./gameplay-common";
import { useGameAudio } from "./game-audio";

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
type ArcadeEvent = { obstacleLane: 0 | 1 | 2; tokenLane: 0 | 1 | 2 };

const arcadePattern: readonly ArcadeEvent[] = [
  { obstacleLane: 1, tokenLane: 2 },
  { obstacleLane: 0, tokenLane: 1 },
  { obstacleLane: 2, tokenLane: 0 },
  { obstacleLane: 1, tokenLane: 0 },
  { obstacleLane: 2, tokenLane: 1 },
  { obstacleLane: 0, tokenLane: 2 },
  { obstacleLane: 1, tokenLane: 2 },
  { obstacleLane: 0, tokenLane: 1 },
  { obstacleLane: 2, tokenLane: 0 },
  { obstacleLane: 1, tokenLane: 0 },
  { obstacleLane: 2, tokenLane: 1 },
  { obstacleLane: 0, tokenLane: 2 },
] as const;

export function ArcadeGameplayPanel({
  game,
  initialBalance,
}: {
  game: Game;
  initialBalance: number;
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [wager, setWager] = useState<WagerValue>(100);
  const [lane, setLane] = useState<0 | 1 | 2>(1);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [runTick, setRunTick] = useState(0);
  const [runTokens, setRunTokens] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<ArcadeResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const laneRef = useRef(lane);
  const tickRef = useRef(0);
  const settlingRef = useRef(false);
  const bestScore = useRef(0);
  const { play, startAmbient, stopAmbient } = useGameAudio();

  useEffect(() => {
    laneRef.current = lane;
  }, [lane]);
  useEffect(() => {
    if (running) startAmbient("arcade");
    else stopAmbient();
    return stopAmbient;
  }, [running, startAmbient, stopAmbient]);

  const settleRun = useCallback(async () => {
    if (settlingRef.current) return;
    settlingRef.current = true;
    setRunning(false);
    setBusy(true);
    try {
      const next = await requestJson<ArcadeResult>(
        `/api/v1/games/${game.slug}/spin`,
        {
          method: "POST",
          headers: {
            "Idempotency-Key": gameplayIdempotencyKey(`arcade-${game.slug}`),
          },
          body: JSON.stringify({ wager }),
        },
      );
      setResult(next);
      setBalance(next.newBalance);
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
      setError(errorMessage(caught, "INVALID_WAGER"));
    } finally {
      setBusy(false);
      settlingRef.current = false;
    }
  }, [game.slug, play, wager]);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      const nextTick = tickRef.current + 1;
      const event = arcadePattern[tickRef.current % arcadePattern.length];
      tickRef.current = nextTick;
      setRunTick(nextTick);
      if (laneRef.current === event.obstacleLane) {
        setGameOver(true);
        void settleRun();
        return;
      }
      if (laneRef.current === event.tokenLane) {
        setRunTokens((current) => current + 1);
        play("arcade-token");
      }
      if (nextTick >= arcadePattern.length) void settleRun();
    }, 220);
    return () => window.clearInterval(interval);
  }, [play, running, settleRun]);

  useEffect(() => {
    if (!running) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a")
        setLane((value) => Math.max(0, value - 1) as 0 | 1 | 2);
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d")
        setLane((value) => Math.min(2, value + 1) as 0 | 1 | 2);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running]);

  function run() {
    if (running || busy) return;
    tickRef.current = 0;
    setRunTick(0);
    setRunTokens(0);
    setGameOver(false);
    setError(null);
    setResult(null);
    setRunning(true);
    play("arcade-start");
  }

  const event = arcadePattern[runTick % arcadePattern.length];
  const progress = Math.min(
    100,
    Math.round((runTick / arcadePattern.length) * 100),
  );
  const message = gameOver
    ? "Collision — restart the run when you are ready."
    : running
      ? "Avoid the traffic and collect the next token."
      : result
        ? `${result.payout ? `Returned ${formatCurrency(result.payout)}` : "Run complete · no payout"}.`
        : "Steer through three lanes, collect tokens and chase a higher score.";

  return (
    <section className="gameplay-layout p-5 sm:p-8">
      <Header balance={balance} gameName={game.name} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_270px]">
        <div>
          <div
            aria-label={`${game.name} arcade board`}
            className="relative grid min-h-[360px] grid-cols-3 gap-2 overflow-hidden game-board game-board--arcade rounded-[24px] p-4"
          >
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
                onClick={() => running && setLane(track as 0 | 1 | 2)}
                type="button"
              >
                <span
                  className="absolute left-1/2 top-8 -translate-x-1/2 text-xl"
                  aria-hidden="true"
                >
                  {running && event.obstacleLane === track ? "◆" : ""}
                </span>
                <span
                  className="absolute left-1/2 top-16 -translate-x-1/2 text-xl text-amber-200"
                  aria-hidden="true"
                >
                  {running && event.tokenLane === track ? "✦" : ""}
                </span>
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
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">
              {running
                ? "Drive: use A/D or the arrow keys, or tap a lane."
                : message}
            </p>
            <div className="flex gap-2">
              <button
                aria-label="Move left"
                className="focus-ring grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-muted hover:text-ink"
                disabled={!running}
                onClick={() =>
                  setLane((value) => Math.max(0, value - 1) as 0 | 1 | 2)
                }
                type="button"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                aria-label="Move right"
                className="focus-ring grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-muted hover:text-ink"
                disabled={!running}
                onClick={() =>
                  setLane((value) => Math.min(2, value + 1) as 0 | 1 | 2)
                }
                type="button"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              <span>Run progress</span>
              <span>
                {progress}% · {runTokens} tokens
              </span>
            </div>
            <div
              aria-label={`${progress}% run progress`}
              className="h-1.5 overflow-hidden rounded-full bg-white/10"
            >
              <div
                className="h-full rounded-full bg-cyan-300 transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
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
            {running
              ? "Driving…"
              : busy
                ? "Settling…"
                : gameOver
                  ? "Restart night run"
                  : "Start night run"}
          </Button>
          <p
            aria-live="polite"
            className={`min-h-6 text-xs font-semibold ${error ? "text-rose-300" : "text-mint"}`}
          >
            {error ?? message}
          </p>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-5 text-muted">
            <div className="font-semibold text-ink">Fair run</div>
            <p className="mt-2">
              Traffic and tokens are shown as you drive. The final score and
              returned balance are settled by the server.
            </p>
          </div>
        </aside>
      </div>
      <History items={history} />
    </section>
  );
}
