import { createContext, useContext, useState, useCallback } from "react";

/* ---------------- Icons (lucide-style inline SVG) ---------------- */
const S = (p) => ({ width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", ...p });
export const Icon = {
  dashboard: (p) => <svg {...S(p)}><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>,
  chat: (p) => <svg {...S(p)}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  leads: (p) => <svg {...S(p)}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>,
  content: (p) => <svg {...S(p)}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>,
  knowledge: (p) => <svg {...S(p)}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  settings: (p) => <svg {...S(p)}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  admin: (p) => <svg {...S(p)}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  logout: (p) => <svg {...S(p)}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  plus: (p) => <svg {...S(p)}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  menu: (p) => <svg {...S(p)}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  trash: (p) => <svg {...S(p)}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  bolt: (p) => <svg {...S(p)}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  send: (p) => <svg {...S(p)}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  globe: (p) => <svg {...S(p)}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  sun: (p) => <svg {...S(p)}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>,
  moon: (p) => <svg {...S(p)}><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>,
  mail: (p) => <svg {...S(p)}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>,
  upload: (p) => <svg {...S(p)}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  users: (p) => <svg {...S(p)}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  history: (p) => <svg {...S(p)}><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>,
  image: (p) => <svg {...S(p)}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>,
  x: (p) => <svg {...S(p)}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  up: (p) => <svg {...S(p)}><polyline points="18 15 12 9 6 15"/></svg>,
  down: (p) => <svg {...S(p)}><polyline points="6 9 12 15 18 9"/></svg>,
  pause: (p) => <svg {...S(p)}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
  check: (p) => <svg {...S(p)}><polyline points="20 6 9 17 4 12"/></svg>,
  type: (p) => <svg {...S(p)}><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>,
  code: (p) => <svg {...S(p)}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  inbox: (p) => <svg {...S(p)}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
  calendar: (p) => <svg {...S(p)}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  phone: (p) => <svg {...S(p)}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
};

import { useTheme } from "../lib/theme";
export function Logo({ height = 30, style }) {
  const { theme } = useTheme();
  const src = theme === "light" ? "./LOGO_STEAD_light.png" : "./LOGO_STEAD.png";
  return <img src={src} alt="STEADD" style={{ height, ...style }} />;
}
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button className="theme-toggle" onClick={toggle} aria-label="Toggle theme" title={theme === "dark" ? "Light" : "Dark"}>
      {theme === "dark" ? <Icon.sun /> : <Icon.moon />}
    </button>
  );
}

/* ---------------- Spinner ---------------- */
export const Spinner = () => <span className="spin" />;

/* ---------------- Skeletons ---------------- */
export function Skeleton({ w = "100%", h = 14, r = 8, style }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}
export function SkeletonStats({ n = 4 }) {
  return (
    <div className="stats">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="stat"><Skeleton w="46%" h={28} /><Skeleton w="68%" h={12} style={{ marginTop: 12 }} /></div>
      ))}
    </div>
  );
}
export function SkeletonList({ n = 4, h = 66 }) {
  return <div className="grid">{Array.from({ length: n }).map((_, i) => <Skeleton key={i} h={h} r={12} />)}</div>;
}
export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="card">
      <Skeleton w="40%" h={16} />
      {Array.from({ length: lines }).map((_, i) => <Skeleton key={i} h={12} style={{ marginTop: 10 }} />)}
    </div>
  );
}

/* ---------------- Field ---------------- */
export function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label>{label}</label>}
      {children}
      {hint && <div className="small muted" style={{ marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

/* ---------------- Modal ---------------- */
export function Modal({ title, onClose, children, width }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={width ? { width } : null} onClick={(e) => e.stopPropagation()}>
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </div>
  );
}

/* ---------------- Toast ---------------- */
const ToastCtx = createContext(null);
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, kind = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => <div key={t.id} className={`toast ${t.kind === "err" ? "err" : t.kind === "ok" ? "ok" : ""}`}>{t.msg}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx) || (() => {});

export function copyText(text) {
  navigator.clipboard?.writeText(text);
}
