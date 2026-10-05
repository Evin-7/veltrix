"use client";

import { useEffect, useId, useState } from "react";

function PercentileDie({
  value,
  units = false,
}: {
  value: string;
  units?: boolean;
}) {
  const id = useId().replaceAll(":", "");
  return (
    <svg
      aria-hidden="true"
      className={`gilded-die-art ${units ? "gilded-die-art--ivory" : ""}`}
      viewBox="0 0 120 144"
    >
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={units ? "#fffdf3" : "#ffe4a1"} />
          <stop offset=".5" stopColor={units ? "#eae0c7" : "#c18a34"} />
          <stop offset="1" stopColor={units ? "#9b8c6d" : "#6d421b"} />
        </linearGradient>
        <linearGradient id={`${id}-face`} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={units ? "#fffef9" : "#fff0bd"} />
          <stop offset="1" stopColor={units ? "#e9dfc5" : "#daa647"} />
        </linearGradient>
      </defs>
      <path
        d="M60 5 108 41 113 94 60 138 7 94 12 41Z"
        fill={`url(#${id}-body)`}
        stroke="#f5d58e"
        strokeWidth="1.2"
      />
      <path d="M60 5 87 53 60 106 33 53Z" fill={`url(#${id}-face)`} />
      <path d="M12 41 33 53 60 5Z" fill="#fff8df" opacity=".6" />
      <path d="M60 5 87 53 108 41Z" fill="#fff4d0" opacity=".25" />
      <path d="M7 94 33 53 60 106 60 138Z" fill="#37220f" opacity=".2" />
      <path d="M60 106 87 53 113 94 60 138Z" fill="#fff3c7" opacity=".13" />
      <path
        d="M12 41 33 53 7 94M60 5 33 53 60 106 87 53 60 5M87 53 108 41M60 106 60 138"
        fill="none"
        stroke={units ? "#b5a781" : "#896025"}
        strokeWidth=".9"
        opacity=".55"
      />
      <path
        d="M60 8 34 53 59 102"
        fill="none"
        stroke="#fff9e8"
        strokeWidth="1.5"
        opacity=".65"
      />
      <text
        x="60"
        y="65"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#473014"
        fontSize={units ? "31" : "26"}
        fontWeight="600"
        fontFamily="Georgia, serif"
      >
        {value}
      </text>
    </svg>
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
    if (
      !rolling ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const interval = window.setInterval(
      () => setFrame((current) => current + 1),
      90,
    );
    return () => window.clearInterval(interval);
  }, [rolling]);
  const tens = rolling
    ? (frame * 7) % 10
    : roll === undefined
      ? undefined
      : Math.floor((roll % 100) / 10);
  const units = rolling
    ? (frame * 3 + 5) % 10
    : roll === undefined
      ? undefined
      : roll % 10;
  return (
    <div
      className={`gilded-roll ${rolling ? "gilded-roll--rolling" : roll !== undefined ? "gilded-roll--settled" : ""}`}
      aria-busy={rolling}
    >
      <div aria-hidden="true" className="gilded-roll-stage">
        <div className="gilded-roll-ring" />
        <div className="gilded-die gilded-die--tens">
          <PercentileDie value={tens === undefined ? "—" : `${tens}0`} />
        </div>
        <div className="gilded-die gilded-die--units">
          <PercentileDie
            value={units === undefined ? "—" : String(units)}
            units
          />
        </div>
        <span className="gilded-die-label gilded-die-label--tens">Tens</span>
        <span className="gilded-die-label gilded-die-label--units">Units</span>
      </div>
      <div aria-live="polite" aria-atomic="true" className="gilded-roll-result">
        <p className="gilded-roll-kicker">
          {rolling
            ? "Dice in motion"
            : roll === undefined
              ? "Ready to roll"
              : "Roll result"}
        </p>
        <p className="gilded-roll-number">
          {rolling ? (
            <span className="gilded-roll-ellipsis">•••</span>
          ) : roll === undefined ? (
            "—"
          ) : (
            String(roll).padStart(2, "0")
          )}
        </p>
      </div>
      <p className="gilded-roll-caption">
        Percentile dice · 01–100
        {roll === 100 && !rolling ? " · 00 + 0 = 100" : ""}
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
