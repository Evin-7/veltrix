"use client";

import type { PointerEvent, ReactNode } from "react";
import { useState } from "react";
import { VeltrixLogo } from "@/components/ui/veltrix-logo";

type AuthExperienceProps = { children: ReactNode };

export function AuthExperience({ children }: AuthExperienceProps) {
  const [pointerShift, setPointerShift] = useState({ x: 0, y: 0 });

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    setPointerShift({
      x: Math.max(-1, Math.min(1, x)),
      y: Math.max(-1, Math.min(1, y)),
    });
  }

  return (
    <main
      className="auth-page"
      onPointerLeave={() => setPointerShift({ x: 0, y: 0 })}
      onPointerMove={handlePointerMove}
    >
      <div aria-hidden="true" className="auth-page-atmosphere" />
      <div aria-hidden="true" className="auth-page-grid" />
      <div className="page-shell auth-page-inner">
        <section aria-hidden="true" className="auth-casino-scene">
          <div className="auth-scene-spotlight" />
          <div className="auth-scene-table" />
          <div
            className="auth-scene-wheel-layer"
            style={{
              transform: `translate3d(${pointerShift.x * 3}px, ${pointerShift.y * 2}px, 0)`,
            }}
          >
            <div className="auth-scene-wheel">
              <div className="auth-wheel-hub">
                <VeltrixLogo
                  alt=""
                  className="auth-wheel-logo"
                  surface="dark"
                />
              </div>
            </div>
          </div>
          <div
            className="auth-scene-card auth-scene-card--ace"
            style={{
              transform: `translate3d(${pointerShift.x * -5}px, ${pointerShift.y * -4}px, 0) rotate(-16deg)`,
            }}
          >
            <span>A</span>
            <b>♠</b>
          </div>
          <div
            className="auth-scene-card auth-scene-card--queen"
            style={{
              transform: `translate3d(${pointerShift.x * 4}px, ${pointerShift.y * -3}px, 0) rotate(13deg)`,
            }}
          >
            <span>Q</span>
            <b className="auth-card-red">♥</b>
          </div>
          <div
            className="auth-scene-chip"
            style={{
              transform: `translate3d(${pointerShift.x * 4}px, ${pointerShift.y * 3}px, 0) rotate(18deg)`,
            }}
          >
            <span>€</span>
            <b>100</b>
          </div>
          <div className="auth-scene-brand">
            <VeltrixLogo alt="" className="auth-scene-brand-logo" />
            <span>PRIVATE TABLE</span>
          </div>
        </section>
        <section className="auth-panel">{children}</section>
      </div>
    </main>
  );
}
