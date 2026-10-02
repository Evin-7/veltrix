"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type RealtimeSnapshot = { walletBalance: number; unreadNotifications: number; activeSession: { id: string; gameSlug: string; gameName: string; startedAt: string } | null };
type RealtimeContextValue = RealtimeSnapshot;

const RealtimeContext = createContext<RealtimeContextValue>({ walletBalance: 0, unreadNotifications: 0, activeSession: null });

export function RealtimeProvider({ children, enabled, initialBalance = 0 }: { children: ReactNode; enabled: boolean; initialBalance?: number }) {
  const [snapshot, setSnapshot] = useState<RealtimeSnapshot>({ walletBalance: initialBalance, unreadNotifications: 0, activeSession: null });

  useEffect(() => {
    if (!enabled) return;
    const events = new EventSource("/api/v1/realtime");
    const onSnapshot = (event: MessageEvent<string>) => {
      try {
        const next = JSON.parse(event.data) as RealtimeSnapshot;
        setSnapshot(next);
      } catch {
        // A malformed event is ignored; REST remains authoritative.
      }
    };
    events.addEventListener("snapshot", onSnapshot);
    return () => {
      events.removeEventListener("snapshot", onSnapshot);
      events.close();
    };
  }, [enabled]);

  const value = useMemo(() => snapshot, [snapshot]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() { return useContext(RealtimeContext); }
