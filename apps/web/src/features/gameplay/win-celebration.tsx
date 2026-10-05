"use client";

import { useEffect, useId, useRef } from "react";
import { Trophy, X } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { explainWin } from "./win-explanation";

type Outcome = {
  roundId: string;
  payout: number;
  netResult: number;
  status?: string;
};
type Props = {
  result: Outcome | null;
  kind: Parameters<typeof explainWin>[0];
  gameSlug: string;
  ready?: boolean;
};

export function WinCelebration({
  result,
  kind,
  gameSlug,
  ready = true,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const shownRound = useRef<string | null>(null);
  const titleId = useId();
  const reasonId = useId();
  const roundId = result?.roundId;
  const profitable = Boolean(
    result && result.netResult > 0 && result.status !== "ACTIVE",
  );

  useEffect(() => {
    if (!ready || !profitable || !roundId || shownRound.current === roundId)
      return;
    const timer = window.setTimeout(() => {
      const element = dialog.current;
      if (!element || !element.isConnected) return;
      shownRound.current = roundId;
      element.showModal();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [profitable, ready, roundId]);

  useEffect(() => {
    if (!roundId || !profitable) dialog.current?.close();
  }, [roundId, profitable]);

  if (!result || !profitable) return null;
  const wager = result.payout - result.netResult;
  const reasons = explainWin(kind, result, gameSlug);
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={reasonId}
      className="win-celebration"
      onClick={(event) => {
        if (event.target === event.currentTarget) dialog.current?.close();
      }}
    >
      <div className="win-celebration-content">
        <div aria-hidden="true" className="win-confetti">
          {Array.from({ length: 18 }, (_, index) => (
            <i
              key={index}
              style={{
                left: `${5 + ((index * 37) % 90)}%`,
                animationDelay: `${(index % 6) * 90}ms`,
                transform: `rotate(${index * 23}deg)`,
              }}
            />
          ))}
        </div>
        <button
          autoFocus
          aria-label="Close win celebration"
          className="focus-ring win-close"
          onClick={() => dialog.current?.close()}
          type="button"
        >
          <X size={19} />
        </button>
        <div className="win-trophy">
          <Trophy size={32} strokeWidth={1.5} />
        </div>
        <p className="eyebrow mt-5 flex items-center justify-center gap-2">
          Winning round
        </p>
        <h2 id={titleId} className="display mt-2 text-3xl text-foreground">
          A moment to celebrate
        </h2>
        <p className="win-amount">{formatCurrency(result.payout)}</p>
        <p className="text-sm text-foreground-muted">
          Total returned to your wallet
        </p>
        <div id={reasonId} className="win-reasons">
          <p className="eyebrow mb-3">Why you won</p>
          <ul className="grid gap-2">
            {reasons.map((reason, index) => (
              <li key={index} className="text-sm leading-6 text-foreground">
                {reason}
              </li>
            ))}
          </ul>
        </div>
        <dl className="win-breakdown">
          <div>
            <dt>Wager</dt>
            <dd>{formatCurrency(wager)}</dd>
          </div>
          <div>
            <dt>Net profit</dt>
            <dd className="text-success">
              {formatCurrency(result.netResult, { sign: "always" })}
            </dd>
          </div>
        </dl>
        <button
          className="button-primary focus-ring mt-6 min-h-12 w-full rounded-xl text-sm font-semibold"
          onClick={() => dialog.current?.close()}
          type="button"
        >
          Continue playing
        </button>
      </div>
    </dialog>
  );
}
