import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { Spinner } from "./components/ui";
import NeuroBg from "./components/NeuroBg";
import { trackPageview, trackHeartbeat } from "./lib/analytics";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Dashboard from "./pages/panel/Dashboard";
import Chatbot from "./pages/panel/Chatbot";
import Leads from "./pages/panel/Leads";
import Content from "./pages/panel/Content";
import Knowledge from "./pages/panel/Knowledge";
import Settings from "./pages/panel/Settings";
import Admin from "./pages/panel/Admin";
import Analytics from "./pages/panel/Analytics";

function Protected({ children }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="center-screen"><Spinner /></div>;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

// The neuro background belongs to the public site only — keep the panel clean.
function GlobalBg() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/panel")) return null;
  return <NeuroBg />;
}

// Track visits to the PUBLIC site only (never the logged-in panel). Sends a pageview on each
// route and heartbeats every 15s while the tab is visible, plus one on tab close — that gives the
// admin Analytics tab a real "time on site" figure.
function SiteAnalytics() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname.startsWith("/panel")) return;
    trackPageview(pathname);
    const beat = () => { if (document.visibilityState === "visible") trackHeartbeat(pathname); };
    const iv = setInterval(beat, 15000);
    const onHide = () => trackHeartbeat(pathname);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
    <GlobalBg />
    <SiteAnalytics />
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/panel" element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="chatbot" element={<Chatbot />} />
        <Route path="leads" element={<Leads />} />
        <Route path="content" element={<Content />} />
        <Route path="knowledge" element={<Knowledge />} />
        <Route path="settings" element={<Settings />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="admin" element={<Admin />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
