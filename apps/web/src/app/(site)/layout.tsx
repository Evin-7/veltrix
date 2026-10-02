import type { ReactNode } from "react";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { RealtimeProvider } from "@/components/realtime/realtime-provider";
import { getCurrentUser } from "@/server/auth/session";
import { getWalletSummary, type WalletSummary } from "@/server/wallet/service";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: Readonly<{ children: ReactNode }>) {
  const currentUser = await getCurrentUser();
  const wallet: WalletSummary | null = currentUser?.role === "PLAYER" ? await getWalletSummary(currentUser.id).catch(() => null) : null;

  return (
    <RealtimeProvider enabled={currentUser?.role === "PLAYER"} initialBalance={wallet?.balance}>
      <a className="sr-only focus:not-sr-only focus-ring fixed left-4 top-4 z-[100] rounded-lg bg-amber px-4 py-3 text-xs font-bold text-[#17110a]" href="#main-content">Skip to content</a>
      <Header initialUser={currentUser} initialWallet={wallet} />
      <div id="main-content">{children}</div>
      <Footer />
    </RealtimeProvider>
  );
}
