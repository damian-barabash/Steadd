// STEADD — process-jobs
// Claims queued jobs and executes the ones that can run on the edge brain:
//   content_generate, chat_reply, lead_classify, embed_doc
// Heavy autonomous jobs (lead_find, lead_outreach over LinkedIn/Maps/email) are
// LEFT for the OpenClaw bridge on the office Mac (same jobs table contract).
//
// Triggered by: pg_cron (every minute, x-steadd-secret), the panel (after creating
// a job, with the user's JWT), or manually.
//
// Auth: header `x-steadd-secret` == CRON_SECRET  OR  a valid Supabase JWT.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---- inlined shared brain helpers (kept in repo at _shared/brain.ts) ----
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-steadd-secret",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status, headers: { "content-type": "application/json", ...corsHeaders, ...extra },
  });
}
type Msg = { role: "system" | "user" | "assistant"; content: string };
async function brainComplete(messages: Msg[], opts: { json?: boolean; temperature?: number; model?: string } = {}): Promise<string> {
  const url = Deno.env.get("BRAIN_URL"); const key = Deno.env.get("BRAIN_KEY");
  const model = opts.model || Deno.env.get("BRAIN_MODEL") || "qwen3.5:9b";
  if (!url || !key) throw new Error("BRAIN_NOT_CONFIGURED");
  const r = await fetch(url.replace(/\/$/, "") + "/chat/completions", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ model, messages, stream: false, temperature: opts.temperature ?? 0.7, ...(opts.json ? { response_format: { type: "json_object" } } : {}) }),
  });
  if (!r.ok) throw new Error(`BRAIN_HTTP_${r.status}: ${(await r.text()).slice(0, 400)}`);
  const d = await r.json();
  return d?.choices?.[0]?.message?.content ?? "";
}
async function embed(text: string): Promise<number[] | null> {
  const url = Deno.env.get("EMBED_URL") || Deno.env.get("BRAIN_URL");
  const key = Deno.env.get("EMBED_KEY") || Deno.env.get("BRAIN_KEY");
  const model = Deno.env.get("EMBED_MODEL") || "nomic-embed-text:latest";
  if (!url || !key) return null;
  try {
    const r = await fetch(url.replace(/\/$/, "") + "/embeddings", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ model, input: text.slice(0, 8000) }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d?.data?.[0]?.embedding ?? null;
  } catch { return null; }
}
function bizContext(p: Record<string, unknown>): string {
  return [
    `Firma / Business: ${p.business_name || p.name || "-"}`,
    `Branża / Industry: ${p.industry || "-"}`,
    `Opis / Description: ${p.description || "-"}`,
    `Ton komunikacji / Brand tone: ${p.brand_tone || "-"}`,
    `Grupa docelowa / Audience: ${p.audience || "-"}`,
    `WWW: ${p.website || "-"}`,
  ].join("\n");
}
// ------------------------------------------------------------------------

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";

const EDGE_TYPES = ["content_generate", "chat_reply", "lead_classify", "embed_doc"];

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function authorize(req: Request): Promise<boolean> {
  if (CRON_SECRET && req.headers.get("x-steadd-secret") === CRON_SECRET) return true;
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return false;
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data } = await userClient.auth.getUser();
  return !!data?.user;
}

async function log(job_id: string, project_id: string, message: string, data: unknown = {}, level = "info") {
  await admin.from("agent_events").insert({ job_id, project_id, message, data, level });
}

const FORMAT_HINTS: Record<string, string> = {
  instagram_post: "Krótki post na Instagram: hak w 1. zdaniu, 3-6 zdań, emoji z umiarem, 5-10 hashtagów na końcu.",
  facebook_post: "Post na Facebook: konwersacyjny, 4-8 zdań, 1 pytanie do odbiorcy, 2-3 hashtagi.",
  linkedin_post: "Post na LinkedIn: profesjonalny, wartość merytoryczna, akapity, 1 CTA, 3-5 hashtagów.",
  blog_article: "Artykuł blogowy: tytuł + nagłówki H2, 400-700 słów, akapity, wstęp i podsumowanie.",
  email: "E-mail marketingowy: temat (subject) + treść, personalny ton, jasne CTA.",
  x_tweet: "Wątek na X: 3-6 krótkich tweetów ponumerowanych, mocne, zwięzłe.",
  story: "Scenariusz Story (3-5 klatek): krótkie hasła na każdą klatkę + sugestia wizualna.",
  ad_copy: "Tekst reklamowy: nagłówek, 2 warianty opisu, CTA.",
};

async function ragContext(project_id: string, query: string): Promise<string> {
  const e = await embed(query);
  if (e) {
    const { data } = await admin.rpc("match_knowledge", {
      p_project_id: project_id,
      query_embedding: e,
      match_count: 5,
    });
    if (data?.length) return data.map((d: any) => `- ${d.title}: ${d.content}`).join("\n").slice(0, 4000);
  }
  // fallback: latest docs
  const { data } = await admin
    .from("knowledge_docs")
    .select("title,content")
    .eq("project_id", project_id)
    .order("created_at", { ascending: false })
    .limit(5);
  return (data || []).map((d: any) => `- ${d.title}: ${d.content}`).join("\n").slice(0, 4000);
}

async function getProject(project_id: string) {
  const { data } = await admin.from("projects").select("*").eq("id", project_id).single();
  return data;
}

async function runContentGenerate(job: any) {
  const { topic, brief, format, content_piece_id } = job.payload || {};
  const project = await getProject(job.project_id);
  const rag = await ragContext(job.project_id, topic || "");
  const sys = [
    "Jesteś ekspertem od marketingu treści. Tworzysz wysokiej jakości treści dla konkretnej firmy.",
    "Piszesz w języku polskim, chyba że temat wskazuje inaczej.",
    "Znasz firmę klienta:",
    bizContext(project),
    rag ? "Baza wiedzy o firmie:\n" + rag : "",
    "Zwróć WYŁĄCZNIE obiekt JSON: {\"title\": \"...\", \"body\": \"...\"}.",
  ].filter(Boolean).join("\n\n");
  const user = [
    `Format: ${format} — ${FORMAT_HINTS[format] || ""}`,
    `Temat: ${topic}`,
    brief ? `Dodatkowe wskazówki: ${brief}` : "",
  ].filter(Boolean).join("\n");
  await log(job.id, job.project_id, "Generuję treść…", { format, topic });
  const out = await brainComplete(
    [{ role: "system", content: sys }, { role: "user", content: user }],
    { json: true, temperature: 0.8 },
  );
  let title = topic, body = out;
  try {
    const parsed = JSON.parse(out);
    title = parsed.title || topic;
    body = parsed.body || out;
  } catch { /* keep raw */ }
  if (content_piece_id) {
    await admin.from("content_pieces").update({ title, body, status: "draft" }).eq("id", content_piece_id);
  }
  return { title, body };
}

async function runChatReply(job: any) {
  const { conversation_id, archetype_id } = job.payload || {};
  const project = await getProject(job.project_id);
  const { data: conv } = await admin.from("conversations").select("*").eq("id", conversation_id).single();
  const { data: msgs } = await admin
    .from("messages").select("role,content").eq("conversation_id", conversation_id)
    .order("created_at", { ascending: true }).limit(30);
  let archetype: any = null;
  const aid = archetype_id || conv?.archetype_id;
  if (aid) archetype = (await admin.from("chat_archetypes").select("*").eq("id", aid).single()).data;
  const lastUser = [...(msgs || [])].reverse().find((m: any) => m.role === "visitor")?.content || "";
  const rag = await ragContext(job.project_id, lastUser);
  const sys = [
    "Jesteś asystentem-chatbotem reprezentującym firmę. Odpowiadasz pomocnie i zwięźle.",
    bizContext(project),
    archetype ? `Archetyp komunikacji: ${archetype.name}\n${archetype.system_instructions}` : "",
    rag ? "Baza wiedzy:\n" + rag : "",
  ].filter(Boolean).join("\n\n");
  const history = (msgs || []).map((m: any) => ({
    role: m.role === "visitor" ? "user" : "assistant",
    content: m.content,
  }));
  await log(job.id, job.project_id, "Generuję odpowiedź chatbota…");
  const reply = await brainComplete([{ role: "system", content: sys }, ...history], { temperature: 0.6 });
  await admin.from("messages").insert({
    conversation_id, project_id: job.project_id, role: "bot", content: reply,
    meta: { archetype_id: aid || null },
  });
  return { reply };
}

async function runLeadClassify(job: any) {
  const { lead_id, reply_text } = job.payload || {};
  const sys = "Klasyfikujesz odpowiedź na zimną wiadomość B2B. Zwróć JSON: {\"sentiment\":\"positive|negative|neutral\",\"reason\":\"...\"}. positive = zainteresowany/chce rozmawiać.";
  const out = await brainComplete(
    [{ role: "system", content: sys }, { role: "user", content: reply_text || "" }],
    { json: true, temperature: 0 },
  );
  let sentiment = "neutral";
  try { sentiment = JSON.parse(out).sentiment || "neutral"; } catch { /* */ }
  const status = sentiment === "positive" ? "replied_positive"
    : sentiment === "negative" ? "replied_negative" : "awaiting_reply";
  if (lead_id) await admin.from("leads").update({ status }).eq("id", lead_id);
  await log(job.id, job.project_id, `Sklasyfikowano odpowiedź: ${sentiment}`, { lead_id });
  return { sentiment, status };
}

async function runEmbedDoc(job: any) {
  const { doc_id } = job.payload || {};
  const { data: doc } = await admin.from("knowledge_docs").select("*").eq("id", doc_id).single();
  if (!doc) return { skipped: true };
  const e = await embed(`${doc.title}\n${doc.content}`);
  if (e) await admin.from("knowledge_docs").update({ embedding: e }).eq("id", doc_id);
  return { embedded: !!e };
}

async function execute(job: any) {
  switch (job.type) {
    case "content_generate": return runContentGenerate(job);
    case "chat_reply": return runChatReply(job);
    case "lead_classify": return runLeadClassify(job);
    case "embed_doc": return runEmbedDoc(job);
    default: throw new Error("UNSUPPORTED_ON_EDGE: " + job.type);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!(await authorize(req))) return json({ error: "unauthorized" }, 401);

  // optional: a single job id, else claim a batch of queued edge-jobs
  let body: any = {};
  try { body = await req.json(); } catch { /* */ }

  let jobs: any[] = [];
  if (body.job_id) {
    const { data } = await admin.from("jobs").select("*").eq("id", body.job_id).limit(1);
    jobs = data || [];
  } else {
    const { data } = await admin.from("jobs").select("*")
      .eq("status", "queued").in("type", EDGE_TYPES)
      .order("created_at", { ascending: true }).limit(5);
    jobs = data || [];
  }

  const results: any[] = [];
  for (const job of jobs) {
    // claim
    const { data: claimed } = await admin.from("jobs")
      .update({ status: "running", started_at: new Date().toISOString(), attempts: (job.attempts || 0) + 1 })
      .eq("id", job.id).eq("status", "queued").select().single();
    if (!claimed) continue; // someone else took it
    try {
      const result = await execute(job);
      await admin.from("jobs").update({
        status: "done", result, finished_at: new Date().toISOString(),
      }).eq("id", job.id);
      await log(job.id, job.project_id, "Zadanie zakończone", { type: job.type }, "success");
      results.push({ id: job.id, ok: true });
    } catch (e) {
      const msg = String(e?.message || e);
      await admin.from("jobs").update({
        status: "error", error: msg, finished_at: new Date().toISOString(),
      }).eq("id", job.id);
      await log(job.id, job.project_id, "Błąd zadania: " + msg, { type: job.type }, "error");
      results.push({ id: job.id, ok: false, error: msg });
    }
  }
  return json({ processed: results.length, results });
});
