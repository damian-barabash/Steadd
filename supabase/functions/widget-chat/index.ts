// STEADD — widget-chat  (PUBLIC, no JWT)
// Endpoint that the embeddable website chat widget talks to.
// Stores the visitor message, generates a bot reply via the brain, stores it, returns it.
// Works out-of-the-box for the "web" channel. CORS open (embedded on client sites).
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

async function brain(messages: any[]): Promise<string | null> {
  const url = Deno.env.get("BRAIN_URL"), key = Deno.env.get("BRAIN_KEY");
  const model = Deno.env.get("BRAIN_MODEL") || "qwen3.5:9b";
  if (!url || !key) return null;
  try {
    const r = await fetch(url.replace(/\/$/, "") + "/chat/completions", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ model, messages, stream: false, temperature: 0.6 }),
    });
    if (!r.ok) return null;
    return (await r.json())?.choices?.[0]?.message?.content ?? null;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method === "GET") return json({ ok: true, service: "steadd-widget-chat" });
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const { project_id, message, visitor_name } = body;
  let conversation_id = body.conversation_id;
  if (!project_id || !message) return json({ error: "project_id and message required" }, 400);

  const { data: project } = await admin.from("projects").select("*").eq("id", project_id).single();
  if (!project) return json({ error: "unknown project" }, 404);

  // make sure the web channel is enabled
  const { data: ch } = await admin.from("channels").select("*").eq("project_id", project_id).eq("type", "web").maybeSingle();
  if (ch && ch.status === "disconnected") return json({ error: "channel disabled" }, 403);

  const { data: arche } = await admin.from("chat_archetypes").select("*")
    .eq("project_id", project_id).order("is_default", { ascending: false }).limit(1).maybeSingle();

  // find or create conversation
  if (conversation_id) {
    const { data: c } = await admin.from("conversations").select("id").eq("id", conversation_id).eq("project_id", project_id).maybeSingle();
    if (!c) conversation_id = null;
  }
  if (!conversation_id) {
    const { data: nc } = await admin.from("conversations").insert({
      project_id, channel_id: ch?.id ?? null, channel_type: "web",
      archetype_id: arche?.id ?? null, visitor_name: visitor_name || "Gość (web)",
    }).select("id").single();
    conversation_id = nc!.id;
  }

  await admin.from("messages").insert({ conversation_id, project_id, role: "visitor", content: message });

  // history for context
  const { data: msgs } = await admin.from("messages").select("role,content")
    .eq("conversation_id", conversation_id).order("created_at", { ascending: true }).limit(20);

  // light RAG: latest knowledge docs
  const { data: docs } = await admin.from("knowledge_docs").select("title,content")
    .eq("project_id", project_id).order("created_at", { ascending: false }).limit(4);
  const rag = (docs || []).map((d: any) => `- ${d.title}: ${d.content}`).join("\n").slice(0, 3000);

  const sys = [
    "Jesteś chatbotem obsługi klienta reprezentującym firmę. Odpowiadaj pomocnie, krótko, w języku użytkownika (domyślnie polski).",
    `Firma: ${project.business_name || project.name}\nBranża: ${project.industry || "-"}\nOpis: ${project.description || "-"}\nTon: ${project.brand_tone || "-"}`,
    arche ? `Archetyp komunikacji "${arche.name}": ${arche.system_instructions}` : "",
    rag ? "Baza wiedzy:\n" + rag : "",
  ].filter(Boolean).join("\n\n");

  const history = (msgs || []).map((m: any) => ({ role: m.role === "visitor" ? "user" : "assistant", content: m.content }));
  let reply = await brain([{ role: "system", content: sys }, ...history]);

  if (reply == null) {
    // brain not configured / unreachable: enqueue a job so the OpenClaw bridge handles it,
    // and return a graceful holding message.
    await admin.from("jobs").insert({
      project_id, type: "chat_reply", status: "queued",
      payload: { conversation_id, archetype_id: arche?.id ?? null },
      ref_table: "conversations", ref_id: conversation_id,
    });
    reply = "Dziękujemy za wiadomość! Już przekazuję ją do obsługi — odpowiemy za chwilę.";
    await admin.from("messages").insert({ conversation_id, project_id, role: "system", content: "[brain offline → queued chat_reply]", meta: { internal: true } });
    return json({ conversation_id, reply, queued: true });
  }

  await admin.from("messages").insert({ conversation_id, project_id, role: "bot", content: reply, meta: { archetype_id: arche?.id ?? null } });
  return json({ conversation_id, reply });
});
