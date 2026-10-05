"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type AdminTheme = "system" | "light" | "dark";
const ThemeContext = createContext<{
  theme: AdminTheme;
  setTheme: (theme: AdminTheme) => void;
} | null>(null);

function readStoredTheme(fallback: AdminTheme): AdminTheme {
  try {
    const stored = window.localStorage.getItem("veltrix-theme");
    if (stored === "light" || stored === "dark" || stored === "system")
      return stored;
  } catch {
    // Fall back to the server-readable cookie when browser storage is unavailable.
  }

  try {
    const stored = document.cookie.match(
      /(?:^|;\s*)veltrix-theme=(light|dark|system)(?:;|$)/,
    )?.[1];
    if (stored === "light" || stored === "dark" || stored === "system")
      return stored;
  } catch {
    // Keep the server-provided preference when cookies are unavailable too.
  }

  return fallback;
}

function persistTheme(theme: AdminTheme) {
  try {
    window.localStorage.setItem("veltrix-theme", theme);
  } catch {
    // The cookie still allows the server to render the selected theme.
  }

  try {
    document.cookie = `veltrix-theme=${theme}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  } catch {
    // Applying the theme for this page still works when persistence is unavailable.
  }
}

function applyTheme(theme: AdminTheme) {
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function AdminThemeProvider({
  children,
  initialTheme = "system",
}: {
  children: React.ReactNode;
  initialTheme?: AdminTheme;
}) {
  const [theme, setThemeState] = useState<AdminTheme>(initialTheme);
  useEffect(() => {
    const syncTheme = () => setThemeState(readStoredTheme(initialTheme));
    syncTheme();
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, [initialTheme]);
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  function setTheme(next: AdminTheme) {
    setThemeState(next);
    persistTheme(next);
    applyTheme(next);
  }
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const value = useContext(ThemeContext);
  if (!value)
    throw new Error("useAdminTheme must be used within AdminThemeProvider");
  return value;
}
