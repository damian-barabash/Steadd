#!/usr/bin/env node
/**
 * STEADD brain worker (runs on the office Mac, always-on).
 *
 * Processes the AI jobs that only need an LLM (no external tools):
 *   content_generate · chat_reply · lead_classify · embed_doc
 * via the local Barabash AI gateway (Ollama / Qwen). It authenticates to Supabase
 * as the admin account, so it has full access through RLS (no service_role needed).
 *
 * Heavy autonomous jobs (lead_find / lead_outreach over Maps/email/LinkedIn, and
 * Meta delivery) are left to the OpenClaw bridge — see openclaw-bridge.mjs.
 *
 * Config via env (see steadd-worker.env.example):
 *   SUPABASE_URL, SUPABASE_ANON, ADMIN_EMAIL, ADMIN_PASSWORD,
 *   BRAIN_URL (default local gateway), BRAIN_KEY, BRAIN_MODEL, EMBED_MODEL, POLL_MS
 */
import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
const execFileP = promisify(execFile);

const URL = process.env.SUPABASE_URL || "https://iwmrjewqxmtczuktbkpr.supabase.co";
const ANON = process.env.SUPABASE_ANON || "sb_publishable_XHBOZXgYYhOJQZQLax2gvg_7cVcyOM-";
const ADMIN_EMAIL = need("ADMIN_EMAIL");
const ADMIN_PASSWORD = need("ADMIN_PASSWORD");
const BRAIN_URL = (process.env.BRAIN_URL || "http://127.0.0.1:8080/v1").replace(/\/$/, "");
const BRAIN_KEY = need("BRAIN_KEY");
const BRAIN_MODEL = process.env.BRAIN_MODEL || "qwen3.5:9b";
const EMBED_MODEL = process.env.EMBED_MODEL || "nomic-embed-text:latest";
const POLL_MS = Number(process.env.POLL_MS || 4000);
const TYPES = ["content_generate", "chat_reply", "lead_classify", "embed_doc", "lead_find", "lead_outreach", "image_generate"];
const UA = "steadd-leadfinder/1.0 (contact: office@barabashflow.pl)";
const COMFY_URL = (process.env.COMFY_URL || "http://127.0.0.1:8188").replace(/\/$/, "");
const COMFY_CKPT = process.env.COMFY_CKPT || "sd_xl_turbo.safetensors";

function need(k) { const v = process.env[k]; if (!v) { console.error("missing env", k); process.exit(1); } return v; }

const sb = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: true } });

let ACCESS = null;
async function login() {
  const { data, error } = await sb.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (error) { console.error("admin login failed:", error.message); process.exit(1); }
  ACCESS = data.session?.access_token || null;
  console.log("STEADD worker logged in as", ADMIN_EMAIL);
}

async function brain(messages, { json = false, temperature = 0.7 } = {}) {
  const r = await fetch(BRAIN_URL + "/chat/completions", {
    method: "POST", headers: { Authorization: `Bearer ${BRAIN_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: BRAIN_MODEL, messages, stream: false, temperature, ...(json ? { response_format: { type: "json_object" } } : {}) }),
  });
  if (!r.ok) throw new Error(`BRAIN_HTTP_${r.status}: ${(await r.text()).slice(0, 300)}`);
  return (await r.json())?.choices?.[0]?.message?.content ?? "";
}
async function embed(text) {
  try {
    const r = await fetch(BRAIN_URL + "/embeddings", {
      method: "POST", headers: { Authorization: `Bearer ${BRAIN_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 8000) }),
    });
    if (!r.ok) return null;
    return (await r.json())?.data?.[0]?.embedding ?? null;
  } catch { return null; }
}
const log = (job_id, project_id, message, data = {}, level = "info") =>
  sb.from("agent_events").insert({ job_id, project_id, message, data, level });

function biz(p) {
  return [`Firma: ${p.business_name || p.name || "-"}`, `Branża: ${p.industry || "-"}`, `Opis: ${p.description || "-"}`, `Ton: ${p.brand_tone || "-"}`, `Grupa docelowa: ${p.audience || "-"}`, `WWW: ${p.website || "-"}`].join("\n");
}
const FMT = {
  instagram_post: "Krótki post na Instagram: hak w 1. zdaniu, 3-6 zdań, emoji z umiarem, 5-10 hashtagów.",
  facebook_post: "Post na Facebook: konwersacyjny, 4-8 zdań, 1 pytanie, 2-3 hashtagi.",
  linkedin_post: "Post na LinkedIn: profesjonalny, wartość, akapity, 1 CTA, 3-5 hashtagów.",
  blog_article: "Artykuł blogowy: tytuł + H2, 400-700 słów, wstęp i podsumowanie.",
  email: "E-mail marketingowy: temat + treść, personalny ton, jasne CTA.",
  x_tweet: "Wątek na X: 3-6 krótkich tweetów ponumerowanych.",
  story: "Story (3-5 klatek): krótkie hasła + sugestia wizualna.",
  ad_copy: "Reklama: nagłówek, 2 warianty opisu, CTA.",
};
async function getProject(id) { const { data } = await sb.from("projects").select("*").eq("id", id).single(); return data; }
async function rag(pid, query) {
  const e = await embed(query);
  if (e) {
    const { data } = await sb.rpc("match_knowledge", { p_project_id: pid, query_embedding: e, match_count: 5 });
    if (data?.length) return data.map((d) => `- ${d.title}: ${d.content}`).join("\n").slice(0, 4000);
  }
  const { data } = await sb.from("knowledge_docs").select("title,content").eq("project_id", pid).order("created_at", { ascending: false }).limit(5);
  return (data || []).map((d) => `- ${d.title}: ${d.content}`).join("\n").slice(0, 4000);
}

async function contentGenerate(job) {
  const { topic, brief, format, content_piece_id } = job.payload || {};
  const p = await getProject(job.project_id);
  const ctx = await rag(job.project_id, topic || "");
  const sys = ["Jesteś ekspertem od marketingu treści dla konkretnej firmy. Piszesz po polsku.", "Firma:", biz(p), ctx ? "Baza wiedzy:\n" + ctx : "", 'Zwróć WYŁĄCZNIE JSON: {"title":"...","body":"..."}.'].filter(Boolean).join("\n\n");
  const usr = [`Format: ${format} — ${FMT[format] || ""}`, `Temat: ${topic}`, brief ? `Wskazówki: ${brief}` : ""].filter(Boolean).join("\n");
  await log(job.id, job.project_id, "Generuję treść…", { format, topic });
  const out = await brain([{ role: "system", content: sys }, { role: "user", content: usr }], { json: true, temperature: 0.8 });
  let title = topic, body = out;
  try { const j = JSON.parse(out); title = j.title || topic; body = j.body || out; } catch { /* */ }
  if (content_piece_id) await sb.from("content_pieces").update({ title, body, status: "draft" }).eq("id", content_piece_id);
  return { title };
}
async function chatReply(job) {
  const { conversation_id, archetype_id } = job.payload || {};
  const p = await getProject(job.project_id);
  const { data: conv } = await sb.from("conversations").select("*").eq("id", conversation_id).single();
  const { data: msgs } = await sb.from("messages").select("role,content").eq("conversation_id", conversation_id).order("created_at").limit(30);
  let arche = null; const aid = archetype_id || conv?.archetype_id;
  if (aid) arche = (await sb.from("chat_archetypes").select("*").eq("id", aid).single()).data;
  const lastUser = [...(msgs || [])].reverse().find((m) => m.role === "visitor")?.content || "";
  const ctx = await rag(job.project_id, lastUser);
  const sys = ["Jesteś chatbotem reprezentującym firmę. Odpowiadasz pomocnie i zwięźle.", "Pisz zwykłym tekstem, bez formatowania markdown (bez ** , * , #).", biz(p), arche ? `Archetyp "${arche.name}": ${arche.system_instructions}` : "", ctx ? "Baza wiedzy:\n" + ctx : ""].filter(Boolean).join("\n\n");
  const hist = (msgs || []).filter((m) => m.role !== "system").map((m) => ({ role: m.role === "visitor" ? "user" : "assistant", content: m.content }));
  await log(job.id, job.project_id, "Generuję odpowiedź chatbota…");
  let reply = await brain([{ role: "system", content: sys }, ...hist], { temperature: 0.6 });
  reply = reply.replace(/\*\*/g, "").replace(/^\s*[*#]+\s/gm, "• ");
  await sb.from("messages").insert({ conversation_id, project_id: job.project_id, role: "bot", content: reply, meta: { archetype_id: aid || null, by: "worker" } });
  return { reply: reply.slice(0, 80) };
}
async function leadClassify(job) {
  const { lead_id, reply_text } = job.payload || {};
  const sys = 'Klasyfikujesz odpowiedź na zimną wiadomość B2B. Zwróć JSON {"sentiment":"positive|negative|neutral"}.';
  const out = await brain([{ role: "system", content: sys }, { role: "user", content: reply_text || "" }], { json: true, temperature: 0 });
  let s = "neutral"; try { s = JSON.parse(out).sentiment || "neutral"; } catch { /* */ }
  const status = s === "positive" ? "replied_positive" : s === "negative" ? "replied_negative" : "awaiting_reply";
  if (lead_id) await sb.from("leads").update({ status }).eq("id", lead_id);
  return { sentiment: s };
}
async function embedDoc(job) {
  const { doc_id } = job.payload || {};
  const { data: d } = await sb.from("knowledge_docs").select("*").eq("id", doc_id).single();
  if (!d) return { skipped: true };
  const e = await embed(`${d.title}\n${d.content}`);
  if (e) await sb.from("knowledge_docs").update({ embedding: e }).eq("id", doc_id);
  return { embedded: !!e };
}
// ---- FREE lead finder: OpenStreetMap (Nominatim geocode + Overpass) + website email scrape ----
async function geocodeBBox(region) {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(region)}`, { headers: { "User-Agent": UA } });
  const d = await r.json();
  if (!d?.length) return null;
  const b = d[0].boundingbox.map(Number); // [south, north, west, east]
  return { s: b[0], n: b[1], w: b[2], e: b[3] };
}
async function osmTags(goal) {
  // ask the model to map a free-text niche to OSM key=value tags
  const out = await brain([
    { role: "system", content: 'Map a business niche to OpenStreetMap tags. Return ONLY JSON {"tags":["key=value",...]} max 4, e.g. fryzjer -> ["shop=hairdresser"], kawiarnia -> ["amenity=cafe"], restauracja -> ["amenity=restaurant"], hotel -> ["tourism=hotel"], silownia -> ["leisure=fitness_centre"], warsztat -> ["shop=car_repair"].' },
    { role: "user", content: goal },
  ], { json: true, temperature: 0 });
  try { const t = JSON.parse(out).tags; if (Array.isArray(t) && t.length) return t.slice(0, 4); } catch { /* */ }
  return ["office=company"];
}
async function overpass(bbox, tags, cap) {
  const sel = tags.map((t) => { const [k, v] = t.split("="); return `nwr["${k}"="${v}"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});`; }).join("");
  const q = `[out:json][timeout:25];(${sel});out tags center ${Math.min(cap * 3, 120)};`;
  const r = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "User-Agent": UA }, body: "data=" + encodeURIComponent(q) });
  const d = await r.json();
  return (d.elements || []).map((el) => {
    const tg = el.tags || {};
    return { name: tg.name, website: tg.website || tg["contact:website"], phone: tg.phone || tg["contact:phone"], email: tg.email || tg["contact:email"],
      addr: [tg["addr:street"], tg["addr:housenumber"], tg["addr:city"]].filter(Boolean).join(" ") };
  }).filter((x) => x.name);
}
async function scrapeEmail(url) {
  try {
    const u = url.startsWith("http") ? url : "https://" + url;
    const r = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6000) });
    const html = await r.text();
    const m = html.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    return m ? m[0] : null;
  } catch { return null; }
}
async function leadFind(job) {
  const { campaign_id, goal_prompt, region, cap = 20 } = job.payload || {};
  await log(job.id, job.project_id, `Szukam firm: ${goal_prompt} (${region || "—"})`);
  const bbox = await geocodeBBox(region || "Polska");
  if (!bbox) { await log(job.id, job.project_id, "Nie rozpoznano regionu", { region }, "error"); return { found: 0 }; }
  const tags = await osmTags(goal_prompt);
  await log(job.id, job.project_id, `Tagi OSM: ${tags.join(", ")}`);
  let found = await overpass(bbox, tags, cap);
  // dedup by name
  const seen = new Set(); found = found.filter((x) => { const k = (x.name + (x.website || "")).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, cap);
  // scrape emails for the first few without one
  let scraped = 0;
  for (const l of found) { if (!l.email && l.website && scraped < 12) { scraped++; l.email = await scrapeEmail(l.website); } }
  for (const l of found) {
    await sb.from("leads").insert({ project_id: job.project_id, campaign_id, name: l.name, company: l.name, website: l.website || null, email: l.email || null, phone: l.phone || null, source: "maps", status: "found", raw: l });
  }
  await log(job.id, job.project_id, `Znaleziono ${found.length} firm (${found.filter((x) => x.email).length} z e-mailem)`, { count: found.length }, "success");
  return { found: found.length };
}
async function leadOutreach(job) {
  const { lead_id, template } = job.payload || {};
  const { data: lead } = await sb.from("leads").select("*").eq("id", lead_id).single();
  const p = await getProject(job.project_id);
  if (!lead) return { skipped: true };
  const sys = `Piszesz krótką, spersonalizowaną zimną wiadomość B2B w imieniu firmy "${p?.business_name || p?.name}" (${p?.industry || ""}). Zwróć JSON {"subject","body"}. Profesjonalnie, wartość, 1 CTA.`;
  const usr = `Odbiorca: ${lead.company || lead.name}${lead.website ? " (" + lead.website + ")" : ""}. ${template ? "Bazuj na szablonie:\n" + template : ""}`;
  const out = await brain([{ role: "system", content: sys }, { role: "user", content: usr }], { json: true, temperature: 0.7 });
  let msg = { subject: "Współpraca", body: out };
  try { const j = JSON.parse(out); msg = { subject: j.subject || "Współpraca", body: j.body || out }; } catch { /* */ }
  await sb.from("lead_messages").insert({ lead_id, project_id: job.project_id, direction: "outbound", channel: lead.source, subject: msg.subject, body: msg.body });
  await sb.from("leads").update({ status: "contacted" }).eq("id", lead_id);
  await log(job.id, job.project_id, "Przygotowano wiadomość (wysyłka po podłączeniu Resend)", { lead_id }, "success");
  return { drafted: true };
}

// ---- Image generation via local ComfyUI (SDXL-Turbo on the Mac) ----
function comfyWorkflow(prompt) {
  const seed = Math.floor(Math.random() * 1e15);
  return {
    "3": { class_type: "KSampler", inputs: { seed, steps: 4, cfg: 1, sampler_name: "euler", scheduler: "normal", denoise: 1, model: ["4", 0], positive: ["6", 0], negative: ["7", 0], latent_image: ["5", 0] } },
    "4": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: COMFY_CKPT } },
    "5": { class_type: "EmptyLatentImage", inputs: { width: 768, height: 768, batch_size: 1 } },
    "6": { class_type: "CLIPTextEncode", inputs: { text: prompt, clip: ["4", 1] } },
    "7": { class_type: "CLIPTextEncode", inputs: { text: "blurry, low quality, watermark, text", clip: ["4", 1] } },
    "8": { class_type: "VAEDecode", inputs: { samples: ["3", 0], vae: ["4", 2] } },
    "9": { class_type: "SaveImage", inputs: { filename_prefix: "steadd", images: ["8", 0] } },
  };
}
async function imageGenerate(job) {
  const { prompt, image_id } = job.payload || {};
  // Enhance the prompt with company context (industry, brand tone, knowledge base) so
  // generated images fit the brand.
  const project = await getProject(job.project_id);
  const ctx = await rag(job.project_id, prompt);
  let imgPrompt = prompt;
  try {
    const sys = "You are a prompt engineer for an SDXL text-to-image model. Turn the user's idea into ONE concise, vivid ENGLISH image prompt that fits the brand. Include subject, style, lighting, composition and a tasteful brand-fitting aesthetic. No words/letters/watermark in the image. Output ONLY the prompt, max 55 words.";
    const usr = `Business: ${biz(project)}\n${ctx ? "Brand knowledge: " + ctx.slice(0, 700) : ""}\nUser idea: ${prompt}`;
    const out = await brain([{ role: "system", content: sys }, { role: "user", content: usr }], { temperature: 0.6 });
    if (out && out.trim().length > 5) imgPrompt = out.trim().replace(/^["']|["']$/g, "").slice(0, 600);
  } catch { /* fall back to raw prompt */ }
  await log(job.id, job.project_id, "Generuję obraz (ComfyUI)…", { prompt, imgPrompt });
  const sub = await fetch(COMFY_URL + "/prompt", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: comfyWorkflow(imgPrompt), client_id: "steadd" }) });
  if (!sub.ok) throw new Error("COMFY_HTTP_" + sub.status + ": " + (await sub.text()).slice(0, 200));
  const { prompt_id } = await sub.json();
  let out = null;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const h = await (await fetch(COMFY_URL + "/history/" + prompt_id)).json();
    const rec = h[prompt_id];
    if (rec?.outputs) { for (const k in rec.outputs) { if (rec.outputs[k].images?.length) { out = rec.outputs[k].images[0]; break; } } if (out) break; }
  }
  if (!out) throw new Error("COMFY_TIMEOUT");
  const view = `${COMFY_URL}/view?filename=${encodeURIComponent(out.filename)}&subfolder=${encodeURIComponent(out.subfolder || "")}&type=${out.type || "output"}`;
  const bytes = new Uint8Array(await (await fetch(view)).arrayBuffer());
  const path = `${job.project_id}/${image_id || job.id}.png`;
  const STORAGE_APIKEY = process.env.SUPABASE_ANON_JWT || ANON;
  const tr = await fetch(`${URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: STORAGE_APIKEY, "content-type": "application/json" }, body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }) });
  const tok = (await tr.json()).access_token;
  // Upload via curl: Node/undici fetch is rejected by the Storage gateway (returns 403), curl works.
  const tmp = `${tmpdir()}/steadd-${image_id || job.id}.png`;
  await writeFile(tmp, bytes);
  try {
    const { stdout } = await execFileP("curl", ["-s", "-o", "/dev/null", "-w", "%{http_code}", "-X", "POST",
      `${URL}/storage/v1/object/generated/${path}`, "-H", `apikey: ${STORAGE_APIKEY}`, "-H", `Authorization: Bearer ${tok}`,
      "-H", "content-type: image/png", "--data-binary", `@${tmp}`]);
    if (stdout.trim() !== "200") throw new Error("STORAGE_HTTP_" + stdout.trim());
  } finally { await unlink(tmp).catch(() => {}); }
  const url = `${URL}/storage/v1/object/public/generated/${path}`;
  if (image_id) await sb.from("generated_images").update({ url, status: "done" }).eq("id", image_id);
  await log(job.id, job.project_id, "Obraz gotowy", { url }, "success");
  return { url };
}

const RUN = { content_generate: contentGenerate, chat_reply: chatReply, lead_classify: leadClassify, embed_doc: embedDoc, lead_find: leadFind, lead_outreach: leadOutreach, image_generate: imageGenerate };

// Auto-scheduler: enqueue lead_find for campaigns marked auto_daily, once per 24h.
async function scheduleAuto() {
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data } = await sb.from("lead_campaigns").select("*").eq("auto_daily", true).eq("status", "active");
  for (const c of data || []) {
    if (c.last_run_at && c.last_run_at > cutoff) continue;
    await sb.from("jobs").insert({ project_id: c.project_id, type: "lead_find", status: "queued", payload: { campaign_id: c.id, goal_prompt: c.goal_prompt, region: c.region, channels: c.channels, cap: c.daily_cap }, ref_table: "lead_campaigns", ref_id: c.id });
    await sb.from("lead_campaigns").update({ last_run_at: new Date().toISOString() }).eq("id", c.id);
  }
}

async function tick() {
  const { data: jobs, error } = await sb.from("jobs").select("*").eq("status", "queued").in("type", TYPES).order("created_at").limit(5);
  if (error) { if (/jwt|expired/i.test(error.message)) await login(); return; }
  for (const job of jobs || []) {
    const { data: claimed } = await sb.from("jobs").update({ status: "running", started_at: new Date().toISOString(), attempts: (job.attempts || 0) + 1 }).eq("id", job.id).eq("status", "queued").select().single();
    if (!claimed) continue;
    try {
      const result = await RUN[job.type](job);
      await sb.from("jobs").update({ status: "done", result, finished_at: new Date().toISOString() }).eq("id", job.id);
      await log(job.id, job.project_id, "Zadanie zakończone", { type: job.type }, "success");
    } catch (e) {
      const msg = String(e?.message || e);
      await sb.from("jobs").update({ status: "error", error: msg, finished_at: new Date().toISOString() }).eq("id", job.id);
      await log(job.id, job.project_id, "Błąd: " + msg, { type: job.type }, "error");
    }
  }
}

await login();
console.log(`STEADD worker up. brain=${BRAIN_URL} model=${BRAIN_MODEL} poll=${POLL_MS}ms types=${TYPES.join(",")}`);
setInterval(() => { tick().catch((e) => console.error("tick", e?.message || e)); }, POLL_MS);
setInterval(() => { scheduleAuto().catch((e) => console.error("sched", e?.message || e)); }, 60000);
tick();
scheduleAuto();
