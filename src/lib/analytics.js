// Lightweight, privacy-light visit tracking for the PUBLIC site (steadd.pl).
// One anonymous session id per browser (localStorage). We send a "pageview" on each route and
// periodic "heartbeat"s so the admin Analytics tab can measure time-on-site. All writes land in
// Supabase through the public `analytics-track` edge function (service role) — no PII, no cookies
// beyond the random id. The panel (/panel/*) is never tracked.
import { FUNCTIONS_URL, SUPABASE_ANON } from "./supabase";

const SID_KEY = "steadd_sid";
const URL = `${FUNCTIONS_URL}/analytics-track`;

function sid() {
  let s = null;
  try { s = localStorage.getItem(SID_KEY); } catch { /* private mode */ }
  if (!s) {
    s = (crypto?.randomUUID?.() || (Math.random().toString(36).slice(2) + Date.now().toString(36)));
    try { localStorage.setItem(SID_KEY, s); } catch { /* ignore */ }
  }
  return s;
}

function device() {
  const mobile = (typeof matchMedia === "function" && matchMedia("(max-width: 760px)").matches) ||
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  return mobile ? "mobile" : "desktop";
}

function refHost() {
  try {
    const u = new window.URL(document.referrer);
    return u.host && u.host !== location.host ? u.host : "";
  } catch { return ""; }
}

function lang() {
  try { return (localStorage.getItem("steadd_lang") || navigator.language || "").slice(0, 12); }
  catch { return (navigator.language || "").slice(0, 12); }
}

function send(type, path) {
  let body;
  try {
    body = JSON.stringify({
      type, sid: sid(), path,
      ...(type === "pageview" ? {
        ref: refHost(), device: device(), lang: lang(),
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      } : {}),
    });
  } catch { return; }

  // sendBeacon survives tab close — ideal for heartbeats fired on pagehide/visibilitychange.
  if (type === "heartbeat" && navigator.sendBeacon) {
    try { navigator.sendBeacon(URL, new Blob([body], { type: "application/json" })); return; } catch { /* fall through */ }
  }
  fetch(URL, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: SUPABASE_ANON },
    body, keepalive: true,
  }).catch(() => {});
}

export function trackPageview(path) { send("pageview", path); }
export function trackHeartbeat(path) { send("heartbeat", path); }
