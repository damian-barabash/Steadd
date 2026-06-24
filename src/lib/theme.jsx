import { createContext, useContext, useState, useCallback, useEffect } from "react";

const KEY = "steadd_theme";
const ThemeCtx = createContext(null);

export function getStoredTheme() {
  return localStorage.getItem(KEY) || "light"; // light matches the mailing/offer look
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getStoredTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#1b2de0" : "#06060d");
  }, [theme]);
  const setTheme = useCallback((t) => { localStorage.setItem(KEY, t); setThemeState(t); }, []);
  const toggle = useCallback(() => setTheme(getStoredTheme() === "dark" ? "light" : "dark"), [setTheme]);
  return <ThemeCtx.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => {
  const c = useContext(ThemeCtx);
  if (!c) throw new Error("useTheme outside ThemeProvider");
  return c;
};
