#!/usr/bin/env node
/**
 * STEADD ⇄ OpenClaw bridge (runs on the office Mac).
 *
 * Drives the REAL OpenClaw agent (installed at ~/.npm-global/bin/openclaw, model =
 * local Ollama qwen via the `ollama` provider) for the autonomous job types:
 *   lead_find · lead_outreach · chat_reply (Meta delivery)
 *
 * Auth to Supabase: logs in as the admin account (full access via RLS, no
 * service_role needed). Same pattern as steadd-worker.mjs.
 *
 * OpenClaw is invoked via:  openclaw agent --local --json --session-id <id>
 *                           --model ollama/qwen3.5:9b -m <instructions>
 * (OLLAMA_API_KEY=ollama-local must be in env — it is, via ~/.openclaw/.env / launchd).
 *
 * ⚠ For lead_find to return REAL companies (not model guesses), OpenClaw needs a
 * web/search tool configured (e.g. BRAVE_API_KEY / FIRECRAWL_API_KEY) and, for
 * outreach, an email channel (Resend/SMTP) and/or the client's LinkedIn session.
 * Until those are set this bridge stays OFF (don't ship hallucinated leads).
 */
import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);

const URL = process.env.SUPABASE_URL || "https://iwmrjewqxmtczuktbkpr.supabase.co";
const ANON = process.env.SUPABASE_ANON || "sb_publishable_XHBOZXgYYhOJQZQLax2gvg_7cVcyOM-";
const ADMIN_EMAIL = need("ADMIN_EMAIL");
const ADMIN_PASSWORD = need("ADMIN_PASSWORD");
const OPENCLAW_BIN = process.env.OPENCLAW_BIN || `${process.env.HOME}/.npm-global/bin/openclaw`;
const OC_MODEL = process.env.OPENCLAW_MODEL || "ollama/qwen3.5:9b";
const POLL_MS = Number(process.env.POLL_MS || 6000);
const HANDLED = ["lead_find", "lead_outreach", "chat_reply"];

function need(k) { const v = process.env[k]; if (!v) { console.error("missing env", k); process.exit(1); } return v; }
const sb = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: true } });
async function login() {
  const { error } = await sb.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (error) { console.error("admin login failed:", error.message); process.exit(1); }
}
const log = (job_id, project_id, message, data = {}, level = "info") =>
  sb.from("agent_events").insert({ job_id, project_id, message, data, level });

/** Run one OpenClaw agent turn locally and return its text output. */
async function openclaw(instructions, sessionId) {
  const env = { ...process.env, OLLAMA_API_KEY: process.env.OLLAMA_API_KEY || "ollama-local" };
  const { stdout } = await exec(OPENCLAW_BIN, [
    "agent", "--local", "--json", "--session-id", sessionId, "--model", OC_MODEL, "-m", instructions,
  ], { env, timeout: 240000, maxBuffer: 8 * 1024 * 1024 });
  // --json prints a structured result; fall back to raw text.
  try { const j = JSON.parse(stdout); return j.reply || j.text || j.result || stdout; }
  catch { return stdout.trim(); }
}

async function getProject(id) { const { data } = await sb.from("projects").select("*").eq("id", id).single(); return data; }

async function handleLeadFind(job) {
  const { campaign_id, goal_prompt, region, channels = ["maps", "email"], cap = 20 } = job.payload || {};
  const p = await getProject(job.project_id);
  await log(job.id, job.project_id, `OpenClaw szuka leadów: ${goal_prompt}`);
  const instr = `You are a B2B lead researcher for "${p?.business_name || p?.name}". ` +
    `Find up to ${cap} real companies matching: "${goal_prompt}". Region: "${region || "any"}". ` +
    `Channels: ${channels.join(", ")}. Use your web/search tools. ` +
    `Output ONLY a JSON array: [{"name","company","website","email","phone","linkedin_url","source"}].`;
  const out = await openclaw(instr, `steadd-leadfind-${job.id}`);
  let leads = [];
  try { leads = JSON.parse(out.match(/\[[\s\S]*\]/)?.[0] || "[]"); } catch { /* */ }
  for (const l of leads.slice(0, cap)) {
    await sb.from("leads").insert({
      project_id: job.project_id, campaign_id, name: l.name, company: l.company, website: l.website,
      email: l.email, phone: l.phone, linkedin_url: l.linkedin_url, source: l.source || "maps", status: "found", raw: l,
    });
  }
  await log(job.id, job.project_id, `Znaleziono ${leads.length} leadów`, { count: leads.length }, "success");
  return { found: leads.length };
}

async function handleLeadOutreach(job) {
  const { lead_id, template } = job.payload || {};
  const { data: lead } = await sb.from("leads").select("*").eq("id", lead_id).single();
  const p = await getProject(job.project_id);
  if (!lead) return { skipped: true };
  const instr = `Write a concise, personalized cold outreach (channel: ${lead.source}) from "${p?.business_name || p?.name}" ` +
    `to ${lead.company || lead.name}. ${template ? "Base on template:\n" + template : ""} ` +
    `Output JSON {"subject","body"}.`;
  const out = await openclaw(instr, `steadd-outreach-${job.id}`);
  let msg = { subject: null, body: out };
  try { msg = JSON.parse(out.match(/\{[\s\S]*\}/)?.[0] || "{}"); } catch { /* */ }
  // NOTE: actual send (email via Resend / LinkedIn session) goes here once creds are configured.
  await sb.from("lead_messages").insert({ lead_id, project_id: job.project_id, direction: "outbound", channel: lead.source, subject: msg.subject || null, body: msg.body || out });
  await sb.from("leads").update({ status: "awaiting_reply" }).eq("id", lead_id);
  await log(job.id, job.project_id, "Przygotowano wiadomość (wysyłka po konfiguracji kanału)", { lead_id }, "success");
  return { drafted: true };
}

async function handleChatReply(job) {
  const { conversation_id, deliver_to, channel } = job.payload || {};
  if (!deliver_to) return { skipped: "web handled by worker" };
  const p = await getProject(job.project_id);
  const { data: msgs } = await sb.from("messages").select("role,content").eq("conversation_id", conversation_id).order("created_at").limit(20);
  const hist = (msgs || []).map((m) => `${m.role}: ${m.content}`).join("\n");
  const instr = `You are the chatbot for "${p?.business_name || p?.name}" on ${channel}. Reply helpfully and briefly to the last message.\n${hist}`;
  const reply = await openclaw(instr, `steadd-chat-${conversation_id}`);
  await sb.from("messages").insert({ conversation_id, project_id: job.project_id, role: "bot", content: reply, meta: { channel } });
  // NOTE: deliver `reply` to `deliver_to` via Meta Graph API with the channel token here.
  await log(job.id, job.project_id, `Odpowiedź gotowa (${channel})`, { conversation_id }, "success");
  return { replied: true };
}

const RUN = { lead_find: handleLeadFind, lead_outreach: handleLeadOutreach, chat_reply: handleChatReply };

async function tick() {
  const { data: jobs, error } = await sb.from("jobs").select("*").eq("status", "queued").in("type", HANDLED).order("created_at").limit(3);
  if (error) { if (/jwt|expired/i.test(error.message)) await login(); return; }
  for (const job of jobs || []) {
    const { data: claimed } = await sb.from("jobs").update({ status: "running", started_at: new Date().toISOString(), attempts: (job.attempts || 0) + 1 }).eq("id", job.id).eq("status", "queued").select().single();
    if (!claimed) continue;
    try {
      const result = await RUN[job.type](job);
      await sb.from("jobs").update({ status: "done", result, finished_at: new Date().toISOString() }).eq("id", job.id);
    } catch (e) {
      const m = String(e?.message || e);
      await sb.from("jobs").update({ status: "error", error: m, finished_at: new Date().toISOString() }).eq("id", job.id);
      await log(job.id, job.project_id, "Błąd OpenClaw: " + m, { type: job.type }, "error");
    }
  }
}

await login();
console.log(`STEADD⇄OpenClaw bridge up. bin=${OPENCLAW_BIN} model=${OC_MODEL} types=${HANDLED.join(",")}`);
setInterval(() => tick().catch((e) => console.error("tick", e?.message || e)), POLL_MS);
tick();
