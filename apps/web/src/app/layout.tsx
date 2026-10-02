import type { Metadata } from "next";
import { Montserrat, Oswald } from "next/font/google";
import { headers } from "next/headers";
import Script from "next/script";
import type { ReactNode } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { RouteTransitionOverlay } from "@/components/navigation/route-transition-overlay";
import { SessionExpiryHandler } from "@/components/navigation/session-expiry-handler";
import { ToastProvider } from "@/components/ui/toast";
import { GameAudioProvider } from "@/features/gameplay/game-audio";

const montserrat = Montserrat({ display: "swap", subsets: ["latin"], variable: "--font-montserrat", weight: ["400", "500", "600", "700", "800"] });
const oswald = Oswald({ display: "swap", subsets: ["latin"], variable: "--font-oswald", weight: ["400", "500", "600", "700"] });
const themeScript = `(() => { try { const saved = localStorage.getItem('veltrix-theme'); const preference = saved === 'light' || saved === 'dark' ? saved : 'system'; const dark = preference === 'dark' || (preference === 'system' && matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.dataset.theme = dark ? 'dark' : 'light'; document.documentElement.style.colorScheme = dark ? 'dark' : 'light'; } catch (_) { document.documentElement.dataset.theme = 'dark'; } })()`;

export const metadata: Metadata = {
  title: {
    default: "Veltrix — Play the atmosphere",
    template: "%s — Veltrix",
  },
    description: "A premium gaming collection built around virtual play currency.",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head><Script id="veltrix-theme" nonce={nonce} strategy="beforeInteractive">{themeScript}</Script></head>
      <body className={`${montserrat.variable} ${oswald.variable}`}>
        <ThemeProvider>
          <GameAudioProvider>
            <ToastProvider>
              <SessionExpiryHandler />
              <RouteTransitionOverlay />
              {children}
            </ToastProvider>
          </GameAudioProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
