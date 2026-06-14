import { createContext, useContext, useState, useCallback, useEffect } from "react";

const KEY = "steadd_theme";
const ThemeCtx = createContext(null);

export function getStoredTheme() {
  return localStorage.getItem(KEY) || "dark"; // dark is the default
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getStoredTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f6f7fc" : "#06060d");
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
