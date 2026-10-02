"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";
const STORAGE_KEY = "veltrix-theme";

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

function getInitialPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(getInitialPreference);
  const [systemTick, setSystemTick] = useState(0);
  const resolvedTheme = useMemo(() => {
    if (theme !== "system") return theme;
    if (systemTick < 0) return "light";
    return typeof window !== "undefined" ? resolveTheme("system") : "light";
  }, [systemTick, theme]);

  useEffect(() => {
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
    setThemeState(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
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
