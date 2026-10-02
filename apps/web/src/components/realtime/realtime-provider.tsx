"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { WALLET_UPDATED_EVENT } from "@/lib/wallet-sync";
import { requestJson } from "@/lib/api-client";

type RealtimeSnapshot = {
  walletBalance: number | null;
  unreadNotifications: number;
  activeSession: {
    id: string;
    gameSlug: string;
    gameName: string;
    startedAt: string;
  } | null;
};
type RealtimeContextValue = RealtimeSnapshot & {
  walletAvailable: boolean;
  refreshWallet: () => Promise<void>;
};

const RealtimeContext = createContext<RealtimeContextValue>({
  walletBalance: null,
  unreadNotifications: 0,
  activeSession: null,
  walletAvailable: false,
  refreshWallet: async () => undefined,
});

export function RealtimeProvider({
  children,
  enabled,
  initialBalance,
}: {
  children: ReactNode;
  enabled: boolean;
  initialBalance?: number;
}) {
  const [snapshot, setSnapshot] = useState<RealtimeSnapshot>({
    walletBalance: initialBalance ?? null,
    unreadNotifications: 0,
    activeSession: null,
  });
  const [walletAvailable, setWalletAvailable] = useState(
    initialBalance !== undefined,
  );

  const refreshWallet = useCallback(async () => {
    if (!enabled) return;
    try {
      const payload = await requestJson<{ balance?: number }>(
        "/api/v1/wallet",
        { cache: "no-store" },
      );
      if (typeof payload.balance !== "number") return;
      setSnapshot((current) => ({
        ...current,
        walletBalance: payload.balance ?? current.walletBalance,
      }));
      setWalletAvailable(true);
    } catch {
      // Keep the last known balance. A failed refresh must never turn it into zero.
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const events = new EventSource("/api/v1/realtime");
    const onSnapshot = (event: MessageEvent<string>) => {
      try {
        const next = JSON.parse(event.data) as RealtimeSnapshot;
        setSnapshot((current) => ({
          ...current,
          ...next,
          walletBalance:
            typeof next.walletBalance === "number"
              ? next.walletBalance
              : current.walletBalance,
        }));
        if (typeof next.walletBalance === "number") setWalletAvailable(true);
      } catch {
        // A malformed event is ignored; REST remains authoritative.
      }
    };
    events.addEventListener("snapshot", onSnapshot);
    events.onerror = () => events.close();
    return () => {
      events.removeEventListener("snapshot", onSnapshot);
      events.close();
    };
  }, [enabled]);

  useEffect(() => {
    function handleWalletUpdate(event: Event) {
      const balance = (event as CustomEvent<{ balance?: number }>).detail
        ?.balance;
      if (typeof balance !== "number") return;
      setSnapshot((current) => ({ ...current, walletBalance: balance }));
      setWalletAvailable(true);
    }
    window.addEventListener(WALLET_UPDATED_EVENT, handleWalletUpdate);
    return () =>
      window.removeEventListener(WALLET_UPDATED_EVENT, handleWalletUpdate);
  }, []);

  const value = useMemo(
    () => ({ ...snapshot, walletAvailable, refreshWallet }),
    [snapshot, walletAvailable, refreshWallet],
  );
  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
