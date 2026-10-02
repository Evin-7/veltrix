import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { RealtimeProvider } from "@/components/realtime/realtime-provider";
import { getCurrentUser } from "@/server/auth/session";
import { getWalletSummary, type WalletSummary } from "@/server/wallet/service";

export const dynamic = "force-dynamic";

export default async function PlayLayout({ children }: Readonly<{ children: ReactNode }>) {
  const currentUser = await getCurrentUser();
  let wallet: WalletSummary | null = null;
  let walletLoadFailed = false;

  if (currentUser?.role === "PLAYER") {
    try {
      wallet = await getWalletSummary(currentUser.id);
    } catch {
      walletLoadFailed = true;
    }
  }

  return (
    <RealtimeProvider enabled={currentUser?.role === "PLAYER"} initialBalance={wallet?.balance}>
      <a className="button-primary sr-only focus:not-sr-only focus-ring fixed left-4 top-4 z-[100] rounded-lg px-4 py-3 text-xs" href="#main-content">Skip to content</a>
      <Header initialUser={currentUser} initialWallet={wallet} initialWalletError={walletLoadFailed} />
      <div id="main-content">{children}</div>
    </RealtimeProvider>
  );
}
