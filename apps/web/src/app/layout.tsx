import type { Metadata, Viewport } from "next";
import { Montserrat, Oswald } from "next/font/google";
import { cookies, headers } from "next/headers";
import type { ReactNode } from "react";
import "./globals.css";
import {
  ThemeProvider,
  type ThemePreference,
} from "@/components/theme/theme-provider";
import { RouteTransitionOverlay } from "@/components/navigation/route-transition-overlay";
import { SessionExpiryHandler } from "@/components/navigation/session-expiry-handler";
import { ToastProvider } from "@/components/ui/toast";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

const montserrat = Montserrat({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700", "800"],
});
const oswald = Oswald({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-oswald",
  weight: ["400", "500", "600", "700"],
});
const themeScript = `(() => {
  const root = document.documentElement;
  const isPreference = (value) => value === 'light' || value === 'dark' || value === 'system';
  let preference = isPreference(root.dataset.theme) ? root.dataset.theme : 'system';
  let hasCookiePreference = false;

  try {
    const cookie = document.cookie.match(/(?:^|;\\s*)veltrix-theme=(light|dark|system)(?:;|$)/);
    if (cookie) {
      preference = cookie[1];
      hasCookiePreference = true;
    }
  } catch (_) {}

  if (!hasCookiePreference) {
    try {
      const saved = localStorage.getItem('veltrix-theme');
      if (isPreference(saved)) preference = saved;
    } catch (_) {}
  }

  const dark = preference === 'dark' || (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const resolved = dark ? 'dark' : 'light';
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;

  try {
    document.cookie = 'veltrix-theme=' + preference + '; Path=/; Max-Age=31536000; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
  } catch (_) {}
})();`;

function getThemePreference(value?: string): ThemePreference {
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "system";
}

export const metadata: Metadata = {
  title: {
    default: "Veltrix — Play the atmosphere",
    template: "%s — Veltrix",
  },
  description:
    "A premium gaming collection built around virtual play currency.",
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

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [requestHeaders, cookieStore] = await Promise.all([
    headers(),
    cookies(),
  ]);
  const nonce = requestHeaders.get("x-nonce") ?? undefined;
  const initialTheme = getThemePreference(
    cookieStore.get("veltrix-theme")?.value,
  );
  const resolvedTheme = initialTheme === "system" ? undefined : initialTheme;

  return (
    <html
      lang="en"
      data-theme={resolvedTheme}
      style={resolvedTheme ? { colorScheme: resolvedTheme } : undefined}
      suppressHydrationWarning
    >
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </head>
      <body className={`${montserrat.variable} ${oswald.variable}`}>
        <ThemeProvider initialTheme={initialTheme}>
          <ToastProvider>
            <SessionExpiryHandler />
            <RouteTransitionOverlay />
            <ServiceWorkerRegister />
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
