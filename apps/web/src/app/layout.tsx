import type { Metadata, Viewport } from "next";
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
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

const montserrat = Montserrat({ display: "swap", subsets: ["latin"], variable: "--font-montserrat", weight: ["400", "500", "600", "700", "800"] });
const oswald = Oswald({ display: "swap", subsets: ["latin"], variable: "--font-oswald", weight: ["400", "500", "600", "700"] });
const themeScript = `(() => { try { const saved = localStorage.getItem('veltrix-theme'); const preference = saved === 'light' || saved === 'dark' ? saved : 'system'; const dark = preference === 'dark' || (preference === 'system' && matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.dataset.theme = dark ? 'dark' : 'light'; document.documentElement.style.colorScheme = dark ? 'dark' : 'light'; } catch (_) { document.documentElement.dataset.theme = 'dark'; } })()`;

export const metadata: Metadata = {
  title: {
    default: "Veltrix — Play the atmosphere",
    template: "%s — Veltrix",
  },
  description: "A premium gaming collection built around virtual play currency.",
  applicationName: "Veltrix",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Veltrix",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#080b12" },
    { media: "(prefers-color-scheme: light)", color: "#f4f1eb" },
  ],
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
              <ServiceWorkerRegister />
              {children}
            </ToastProvider>
          </GameAudioProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
