"use client";

import { Clock3, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useRealtime } from "@/components/realtime/realtime-provider";

export function SessionReminderNotice() {
  const { activeSession } = useRealtime();
  const [minutes, setMinutes] = useState(30);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [dismissedAt, setDismissedAt] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    fetch("/api/v1/responsible-gaming/status").then((response) => response.ok ? response.json() : null).then((payload: { data?: { settings?: { sessionReminderMinutes?: number } } } | null) => { if (active && payload?.data?.settings?.sessionReminderMinutes) setMinutes(payload.data.settings.sessionReminderMinutes); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!activeSession) return;
    const update = () => setElapsedMinutes(Math.max(1, Math.floor((Date.now() - new Date(activeSession.startedAt).getTime()) / 60_000)));
    const firstUpdate = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 60_000);
    return () => { window.clearTimeout(firstUpdate); window.clearInterval(timer); };
  }, [activeSession]);
  if (!activeSession || activeSession.gameSlug === "" || elapsedMinutes < minutes || dismissedAt === activeSession.id) return null;
  const elapsed = elapsedMinutes;
  return <aside className="mt-4 flex items-start justify-between gap-4 rounded-2xl border border-amber/25 bg-amber/[0.07] px-4 py-3 text-xs text-muted" role="status"><div className="flex items-start gap-3"><Clock3 className="mt-0.5 shrink-0 text-amber" size={15} /><span><strong className="font-semibold text-ink">You’ve been playing for {elapsed} minutes.</strong><span className="mt-1 block">Take a pause if that feels right. This reminder is informational; your play controls are always available.</span></span></div><button aria-label="Dismiss session reminder" className="shrink-0 text-muted hover:text-ink" onClick={() => setDismissedAt(activeSession.id)}><X size={15} /></button></aside>;
}
