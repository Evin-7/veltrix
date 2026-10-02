"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type AdminTheme = "system" | "light" | "dark";
const ThemeContext = createContext<{ theme: AdminTheme; setTheme: (theme: AdminTheme) => void } | null>(null);

function applyTheme(theme: AdminTheme) {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AdminTheme>(() => { if (typeof window === "undefined") return "system"; const saved = window.localStorage.getItem("veltrix-theme"); return saved === "light" || saved === "dark" || saved === "system" ? saved : "system"; });
  useEffect(() => { applyTheme(theme); }, [theme]);
  function setTheme(next: AdminTheme) { setThemeState(next); window.localStorage.setItem("veltrix-theme", next); applyTheme(next); }
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useAdminTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useAdminTheme must be used within AdminThemeProvider");
  return value;
}
