// STEADD — admin-users  (admin only)
// Create clients / fellow admins, delete users, reset passwords.
// verify_jwt = true (Supabase validates the caller's JWT); we additionally check role=admin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", ...cors } });

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return json({ error: "no token" }, 401);

  // who is calling?
  const caller = createClient(URL, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: u } = await caller.auth.getUser();
  if (!u?.user) return json({ error: "unauthorized" }, 401);
  const { data: me } = await admin.from("profiles").select("role").eq("id", u.user.id).single();
  if (me?.role !== "admin") return json({ error: "forbidden: admin only" }, 403);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const action = body.action;

  try {
    if (action === "create") {
      const { email, password, full_name, role } = body;
      if (!email || !password) return json({ error: "email & password required" }, 400);
      const r = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name: full_name || "", role: role === "admin" ? "admin" : "client" },
      });
      if (r.error) return json({ error: r.error.message }, 400);
      // ensure profile role (trigger already set it from metadata, enforce anyway)
      await admin.from("profiles").update({ role: role === "admin" ? "admin" : "client", full_name: full_name || "" }).eq("id", r.data.user!.id);
      return json({ ok: true, user_id: r.data.user!.id });
    }

    if (action === "delete") {
      const { user_id } = body;
      if (!user_id) return json({ error: "user_id required" }, 400);
      if (user_id === u.user.id) return json({ error: "cannot delete yourself" }, 400);
      const r = await admin.auth.admin.deleteUser(user_id);
      if (r.error) return json({ error: r.error.message }, 400);
      return json({ ok: true });
    }

    if (action === "reset_password") {
      const { user_id, password } = body;
      if (!user_id || !password) return json({ error: "user_id & password required" }, 400);
      const r = await admin.auth.admin.updateUserById(user_id, { password });
      if (r.error) return json({ error: r.error.message }, 400);
      return json({ ok: true });
    }

    if (action === "set_role") {
      const { user_id, role } = body;
      if (!user_id || !["admin", "client"].includes(role)) return json({ error: "user_id & valid role required" }, 400);
      if (user_id === u.user.id && role !== "admin") return json({ error: "cannot demote yourself" }, 400);
      await admin.from("profiles").update({ role }).eq("id", user_id);
      await admin.auth.admin.updateUserById(user_id, { user_metadata: { role } });
      return json({ ok: true });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String((e as any)?.message || e) }, 500);
  }
});
