// STEADD — analytics-track  (PUBLIC, no JWT)
// Receives visit telemetry from the public site (steadd.pl) and stores it with the service role.
//  - type "pageview"  → upsert the visitor session (++pageviews, refresh last_seen) + insert a pageview row
//  - type "heartbeat" → bump last_seen so we can measure time-on-site (sent every ~15s + on tab close)
// No client ever reads these tables (RLS admin-only); the table writes only happen here.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", ...cors } });

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : null);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method === "GET") return json({ ok: true, service: "steadd-analytics-track" });

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }

  const type = body.type === "heartbeat" ? "heartbeat" : "pageview";
  const sid = typeof body.sid === "string" ? body.sid.trim() : "";
  if (sid.length < 6 || sid.length > 64) return json({ error: "bad_sid" }, 400);

  const path = clip(body.path, 200) || "/";

  if (type === "heartbeat") {
    await admin.from("analytics_sessions").update({ last_seen: new Date().toISOString() }).eq("id", sid);
    return json({ ok: true });
  }

  // pageview — upsert the session, then record the view
  const ref = clip(body.ref, 120);
  const device = body.device === "mobile" ? "mobile" : "desktop";
  const lang = clip(body.lang, 12);
  const tz = clip(body.tz, 60);

  // Atomic upsert: insert a fresh session, or bump an existing one (+1 pageview, refresh last_seen).
  const { error: upErr } = await admin.rpc("analytics_touch_session", {
    p_sid: sid, p_path: path, p_ref: ref, p_device: device, p_lang: lang, p_tz: tz,
  });
  if (upErr) return json({ error: "touch_failed" }, 500);

  await admin.from("analytics_pageviews").insert({ session_id: sid, path });
  return json({ ok: true });
});
