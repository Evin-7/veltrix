"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useState } from "react";

export function FullscreenButton({ targetId }: { targetId: string }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const update = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  return <button aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"} className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-foreground-muted hover:text-foreground" onClick={() => { const target = document.getElementById(targetId); if (document.fullscreenElement) void document.exitFullscreen(); else void target?.requestFullscreen(); }} type="button">{isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>;
}
