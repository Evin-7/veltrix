import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { getCurrentUser } from "@/server/auth/session";
import { getWalletSummary, type WalletSummary } from "@/server/wallet/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Veltrix — Play the atmosphere",
    template: "%s — Veltrix",
  },
  description: "A premium virtual-credit gaming demonstration platform.",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const currentUser = await getCurrentUser();
  const wallet: WalletSummary | null = currentUser?.role === "PLAYER" ? await getWalletSummary(currentUser.id).catch(() => null) : null;
  return (
    <html lang="en">
      <body>
        <Header initialUser={currentUser} initialWallet={wallet} />
        {children}
        <Footer />
      </body>
    </html>
  );
}
