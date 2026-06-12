import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "portal-theme";

export type PortalTheme = "light" | "dark";

function readTheme(): PortalTheme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: PortalTheme) {
  document.documentElement.dataset.portalTheme = theme;
}

export function usePortalTheme() {
  const [theme, setThemeState] = useState<PortalTheme>(() => readTheme());

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((t) => (t === "light" ? "dark" : "light"));
  }, []);

  const setTheme = useCallback((next: PortalTheme) => {
    setThemeState(next);
  }, []);

  return { theme, isLight: theme === "light", toggleTheme, setTheme };
}

applyTheme(readTheme());
