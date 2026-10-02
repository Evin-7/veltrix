import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AdminThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = { title: "Veltrix Control Room", description: "Veltrix back-office administration" };
const roboto = Roboto({ subsets: ["latin"], display: "swap", variable: "--font-roboto", weight: ["400", "500", "600", "700"] });
const themeScript = `(() => { try { const saved = localStorage.getItem('veltrix-theme'); const preference = saved === 'light' || saved === 'dark' ? saved : 'system'; const dark = preference === 'dark' || (preference === 'system' && matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.dataset.theme = dark ? 'dark' : 'light'; document.documentElement.style.colorScheme = dark ? 'dark' : 'light'; } catch (_) { document.documentElement.dataset.theme = 'dark'; } })()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><Script id="veltrix-admin-theme" strategy="beforeInteractive">{themeScript}</Script></head><body className={roboto.variable}><AdminThemeProvider>{children}</AdminThemeProvider></body></html>;
}
