"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useRef } from "react";
import { VeltrixLogo } from "@/components/ui/veltrix-logo";

const cards = [
  { rank: "A", suit: "♠", className: "hero-card--ace" },
  { rank: "K", suit: "♥", className: "hero-card--king hero-card--red" },
  { rank: "Q", suit: "♦", className: "hero-card--queen hero-card--red" },
  { rank: "J", suit: "♣", className: "hero-card--jack" },
];

export function CasinoComposition() {
  const stageRef = useRef<HTMLDivElement>(null);

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || !stageRef.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(
      -0.5,
      Math.min(0.5, (event.clientX - bounds.left) / bounds.width - 0.5),
    );
    const y = Math.max(
      -0.5,
      Math.min(0.5, (event.clientY - bounds.top) / bounds.height - 0.5),
    );
    stageRef.current.style.setProperty("--hero-tilt-x", `${y * -2}deg`);
    stageRef.current.style.setProperty("--hero-tilt-y", `${x * 2}deg`);
  }

  function resetPointerTilt(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || !stageRef.current) return;
    stageRef.current.style.setProperty("--hero-tilt-x", "0deg");
    stageRef.current.style.setProperty("--hero-tilt-y", "0deg");
  }

  return (
    <div
      aria-hidden="true"
      className="hero-composition"
      onPointerLeave={resetPointerTilt}
      onPointerMove={handlePointerMove}
    >
      <div className="hero-composition-atmosphere" />
      <div className="hero-composition-shadow" />
      <div className="hero-composition-stage" ref={stageRef}>
        <div className="hero-wheel">
          <div className="hero-wheel-core">
            <VeltrixLogo alt="" className="hero-wheel-logo" surface="dark" />
            <span className="hero-wheel-subtitle">ORIGINAL COLLECTION</span>
          </div>
        </div>

        {cards.map((card) => (
          <div className={`hero-card ${card.className}`} key={card.rank}>
            <span className="hero-card-corner">
              {card.rank}
              <small>{card.suit}</small>
            </span>
            <span className="hero-card-suit">{card.suit}</span>
            <span className="hero-card-watermark">V</span>
            <span className="hero-card-corner hero-card-corner--bottom">
              {card.rank}
              <small>{card.suit}</small>
            </span>
          </div>
        ))}

        <div className="hero-chip hero-chip--main">
          <div className="hero-chip-inner">
            <span>VC</span>
            <small>VELTRIX</small>
          </div>
        </div>
        <div className="hero-chip hero-chip--small">
          <div className="hero-chip-inner">
            <span>V</span>
          </div>
        </div>

        <div className="hero-die hero-die--left">
          <span className="hero-die-pips">
            • •{`\n`} •{`\n`}• •
          </span>
        </div>
        <div className="hero-die hero-die--right">
          <span className="hero-die-pips">
            •{`\n`}• •{`\n`} •
          </span>
        </div>
      </div>
    </div>
  );
}
