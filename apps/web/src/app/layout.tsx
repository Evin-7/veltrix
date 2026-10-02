import type { Metadata } from "next";
import { Oswald, Roboto } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { GameAudioProvider } from "@/features/gameplay/game-audio";

const roboto = Roboto({ subsets: ["latin"], display: "swap", variable: "--font-roboto", weight: ["400", "500", "600", "700"] });
const oswald = Oswald({ subsets: ["latin"], display: "swap", variable: "--font-oswald", weight: ["400", "500", "600", "700"] });
const themeScript = `(() => { try { const saved = localStorage.getItem('veltrix-theme'); const preference = saved === 'light' || saved === 'dark' ? saved : 'system'; const dark = preference === 'dark' || (preference === 'system' && matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.dataset.theme = dark ? 'dark' : 'light'; document.documentElement.style.colorScheme = dark ? 'dark' : 'light'; } catch (_) { document.documentElement.dataset.theme = 'dark'; } })()`;

export const metadata: Metadata = {
  title: {
    default: "Veltrix — Play the atmosphere",
    template: "%s — Veltrix",
  },
  description: "A premium gaming collection built around Veltrix Credits.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><Script id="veltrix-theme" strategy="beforeInteractive">{themeScript}</Script></head>
      <body className={`${roboto.variable} ${oswald.variable}`}>
        <ThemeProvider>
          <GameAudioProvider>
            <ToastProvider>{children}</ToastProvider>
          </GameAudioProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
