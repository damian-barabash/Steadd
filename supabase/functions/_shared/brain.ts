// Shared helpers for STEADD edge functions.
// The "brain" is any OpenAI-compatible chat endpoint — by default the Barabash AI
// gateway (Tailscale Funnel) or the OpenClaw runtime on the office Mac.
// Configure via Supabase secrets:
//   BRAIN_URL   e.g. https://barabash-ai.tailcd3444.ts.net/v1
//   BRAIN_KEY   bearer key
//   BRAIN_MODEL default qwen3.5:9b
//   EMBED_URL / EMBED_KEY / EMBED_MODEL (fallback to BRAIN_* ; default nomic-embed-text:latest)

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-steadd-secret",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders, ...extra },
  });
}

type Msg = { role: "system" | "user" | "assistant"; content: string };

export async function brainComplete(
  messages: Msg[],
  opts: { json?: boolean; temperature?: number; model?: string } = {},
): Promise<string> {
  const url = Deno.env.get("BRAIN_URL");
  const key = Deno.env.get("BRAIN_KEY");
  const model = opts.model || Deno.env.get("BRAIN_MODEL") || "qwen3.5:9b";
  if (!url || !key) throw new Error("BRAIN_NOT_CONFIGURED");
  const r = await fetch(url.replace(/\/$/, "") + "/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      temperature: opts.temperature ?? 0.7,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!r.ok) throw new Error(`BRAIN_HTTP_${r.status}: ${(await r.text()).slice(0, 400)}`);
  const d = await r.json();
  return d?.choices?.[0]?.message?.content ?? "";
}

export async function embed(text: string): Promise<number[] | null> {
  const url = Deno.env.get("EMBED_URL") || Deno.env.get("BRAIN_URL");
  const key = Deno.env.get("EMBED_KEY") || Deno.env.get("BRAIN_KEY");
  const model = Deno.env.get("EMBED_MODEL") || "nomic-embed-text:latest";
  if (!url || !key) return null;
  try {
    const r = await fetch(url.replace(/\/$/, "") + "/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ model, input: text.slice(0, 8000) }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d?.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

export function bizContext(p: Record<string, unknown>): string {
  return [
    `Firma / Business: ${p.business_name || p.name || "-"}`,
    `Branża / Industry: ${p.industry || "-"}`,
    `Opis / Description: ${p.description || "-"}`,
    `Ton komunikacji / Brand tone: ${p.brand_tone || "-"}`,
    `Grupa docelowa / Audience: ${p.audience || "-"}`,
    `WWW: ${p.website || "-"}`,
  ].join("\n");
}
