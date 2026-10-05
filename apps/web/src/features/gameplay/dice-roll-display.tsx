"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { resultToDice } from "./dice-result";

const ROLL_PREVIEW_COUNT = 12;
const PIP_POSITIONS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function DiceFace({
  value,
  index,
  rolling,
  accented = false,
}: {
  value: number;
  index: number;
  rolling: boolean;
  accented?: boolean;
}) {
  const rotation = ((index * 37) % 9) - 4;
  const offset = ((index * 13) % 5) - 2;
  const style = {
    "--die-rotation": `${rotation}deg`,
    "--die-offset": `${offset}px`,
    animationDelay: `-${(index % 5) * 0.12}s`,
  } as CSSProperties;
  const pips = PIP_POSITIONS[value];

  return (
    <span
      aria-hidden={rolling || undefined}
      aria-label={`Die showing ${value}`}
      className={`gilded-d6 ${rolling ? "gilded-d6--rolling" : ""} ${accented ? "gilded-d6--accented" : ""}`}
      role="img"
      style={style}
    >
      {Array.from({ length: 9 }, (_, position) => (
        <span
          aria-hidden="true"
          className={`gilded-d6-pip ${pips.includes(position) ? "gilded-d6-pip--visible" : ""}`}
          key={position}
        />
      ))}
    </span>
  );
}

export function DiceRollDisplay({
  rolling,
  roll,
}: {
  rolling: boolean;
  roll?: number;
}) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!rolling) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const interval = window.setInterval(
      () => setFrame((current) => current + 1),
      90,
    );
    return () => window.clearInterval(interval);
  }, [rolling]);

  const hasValidResult =
    roll !== undefined &&
    Number.isSafeInteger(roll) &&
    roll >= 1 &&
    roll <= 100;
  const settledDice = hasValidResult ? resultToDice(roll) : [];
  const displayedTotal = settledDice.reduce((sum, face) => sum + face, 0);
  const faces = rolling
    ? Array.from(
        { length: ROLL_PREVIEW_COUNT },
        (_, index) => ((frame * 3 + index * 5) % 6) + 1,
      )
    : settledDice;
  const resultLabel = rolling
    ? "Dice are rolling"
    : hasValidResult
      ? `${settledDice.length} dice with a total result of ${displayedTotal}`
      : roll === undefined
        ? "Dice tray"
        : "Dice result unavailable";

  return (
    <div
      className={`gilded-roll ${rolling ? "gilded-roll--rolling" : hasValidResult ? "gilded-roll--settled" : ""}`}
    >
      <div className="gilded-roll-stage">
        <div aria-hidden="true" className="gilded-roll-ring" />
        <div
          aria-busy={rolling || undefined}
          aria-label={resultLabel}
          className="gilded-dice-tray"
          data-dice-count={
            hasValidResult && !rolling ? settledDice.length : undefined
          }
          data-dice-total={
            hasValidResult && !rolling ? displayedTotal : undefined
          }
          role="group"
        >
          {faces.map((face, index) => (
            <span className="gilded-dice-slot" key={index}>
              <DiceFace
                accented={
                  !rolling &&
                  settledDice.length > 1 &&
                  index === settledDice.length - 1 &&
                  settledDice[index] !== 6
                }
                index={index}
                rolling={rolling}
                value={face}
              />
            </span>
          ))}
          {!rolling && !hasValidResult ? (
            <p className="gilded-dice-empty">
              {roll === undefined
                ? "Roll to see your D6 result"
                : "Dice result unavailable"}
            </p>
          ) : null}
        </div>
      </div>
      <div aria-atomic="true" aria-live="polite" className="gilded-roll-result">
        <p className="gilded-roll-kicker">
          {rolling
            ? "Dice in motion"
            : hasValidResult
              ? "Roll result"
              : roll === undefined
                ? "Ready to roll"
                : "Result unavailable"}
        </p>
        <p className="gilded-roll-number">
          {rolling ? (
            <span className="gilded-roll-ellipsis">•••</span>
          ) : hasValidResult ? (
            String(roll)
          ) : (
            "—"
          )}
        </p>
      </div>
      <p className="gilded-roll-caption">
        {rolling
          ? ""
          : hasValidResult
            ? `${settledDice.length} dice · Total ${roll}`
            : roll === undefined
              ? "Standard six-sided dice"
              : "The server result could not be displayed."}
      </p>
    </div>
  );
}

/** A cancellable minimum roll duration; reduced motion reveals as soon as ready. */
export function waitForDiceRoll(
  signal: AbortSignal,
  duration: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Roll cancelled", "AbortError"));
      return;
    }
    function abort() {
      window.clearTimeout(timer);
      reject(new DOMException("Roll cancelled", "AbortError"));
    }
    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, duration);
    signal.addEventListener("abort", abort, { once: true });
  });
}
