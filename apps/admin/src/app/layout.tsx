import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { cookies, headers } from "next/headers";
import "./globals.css";
import {
  AdminThemeProvider,
  type AdminTheme,
} from "@/components/theme-provider";
import { AdminToastProvider } from "@/components/admin-toast";

export const metadata: Metadata = {
  title: "Veltrix Admin",
  description: "Veltrix back-office administration",
};
const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700", "800"],
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

function getThemePreference(value?: string): AdminTheme {
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "system";
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
      <body className={montserrat.variable}>
        <AdminThemeProvider initialTheme={initialTheme}>
          <AdminToastProvider>{children}</AdminToastProvider>
        </AdminThemeProvider>
      </body>
    </html>
  );
}
