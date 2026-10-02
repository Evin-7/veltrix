"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";

export type ThemePreference = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";
const STORAGE_KEY = "veltrix-theme";
const themeListeners = new Set<() => void>();

type ThemeContextValue = { theme: ThemePreference; resolvedTheme: ResolvedTheme; setTheme: (theme: ThemePreference) => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveTheme(theme: ThemePreference): ResolvedTheme {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: ThemePreference) {
  const resolved = resolveTheme(theme);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

function getStoredPreference(): ThemePreference {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

function subscribeToTheme(listener: () => void) {
  themeListeners.add(listener);
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    themeListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeToTheme, getStoredPreference, (): ThemePreference => "system");
  const [systemTick, setSystemTick] = useState(0);
  const resolvedTheme = useMemo(() => {
    if (theme !== "system") return theme;
    if (systemTick < 0) return "light";
    return typeof window !== "undefined" ? resolveTheme("system") : "light";
  }, [systemTick, theme]);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (theme === "system" && stored && stored !== "system" && (stored === "light" || stored === "dark")) {
      themeListeners.forEach((listener) => listener());
      return;
    }

    applyTheme(theme);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = () => {
      if (theme === "system") {
        setSystemTick((value) => value + 1);
        applyTheme("system");
      }
    };
    media.addEventListener("change", handleSystemChange);
    return () => media.removeEventListener("change", handleSystemChange);
  }, [theme]);

  function setTheme(nextTheme: ThemePreference) {
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    themeListeners.forEach((listener) => listener());
    applyTheme(nextTheme);
  }

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}
