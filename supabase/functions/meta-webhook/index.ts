// STEADD — meta-webhook  (PUBLIC, no JWT)
// Ready-to-connect ingress for Instagram / WhatsApp / Messenger.
// GET  = Meta webhook verification (hub.challenge vs META_VERIFY_TOKEN).
// POST = incoming messages -> normalize -> store conversation+message -> enqueue chat_reply job.
//
// To go live the client must (Meta side): create a Meta app, pass business verification &
// App Review for messaging permissions, subscribe this URL as the webhook, and paste the
// page/IG/WABA id + access token into the channel config. Sending replies back to Meta is
// performed by the OpenClaw bridge (it holds the page access token) — see openclaw-bridge.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const VERIFY_TOKEN = Deno.env.get("META_VERIFY_TOKEN") || "steadd-verify";

async function resolveChannel(type: "instagram" | "whatsapp" | "facebook", idField: string, idValue: string) {
  // channel.config holds {page_id|ig_user_id|phone_number_id}
  const { data } = await admin.from("channels").select("*").eq("type", type).contains("config", { [idField]: idValue }).maybeSingle();
  return data;
}

async function ingest(type: "instagram" | "whatsapp" | "facebook", externalSenderId: string, text: string, channel: any, senderName?: string) {
  if (!channel) return;
  const project_id = channel.project_id;
  const { data: arche } = await admin.from("chat_archetypes").select("id")
    .eq("project_id", project_id).order("is_default", { ascending: false }).limit(1).maybeSingle();
  // find open conversation for this external sender, else create
  let { data: conv } = await admin.from("conversations").select("id")
    .eq("project_id", project_id).eq("channel_id", channel.id).eq("external_id", externalSenderId)
    .eq("status", "open").maybeSingle();
  if (!conv) {
    const { data: nc } = await admin.from("conversations").insert({
      project_id, channel_id: channel.id, channel_type: type, archetype_id: arche?.id ?? null,
      external_id: externalSenderId, visitor_name: senderName || `${type}:${externalSenderId.slice(0, 8)}`,
    }).select("id").single();
    conv = nc;
  }
  await admin.from("messages").insert({ conversation_id: conv!.id, project_id, role: "visitor", content: text, meta: { source: type, external_sender: externalSenderId } });
  // queue a reply (OpenClaw bridge / process-jobs picks it up; bridge sends it back to Meta)
  await admin.from("jobs").insert({
    project_id, type: "chat_reply", status: "queued",
    payload: { conversation_id: conv!.id, archetype_id: arche?.id ?? null, channel: type, deliver_to: externalSenderId, channel_id: channel.id },
    ref_table: "conversations", ref_id: conv!.id,
  });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // ---- Webhook verification handshake (GET) ----
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN) return new Response(challenge ?? "", { status: 200 });
    return new Response("forbidden", { status: 403 });
  }

  if (req.method !== "POST") return new Response("ok");

  let payload: any;
  try { payload = await req.json(); } catch { return new Response("ok"); }

  try {
    const obj = payload.object;
    if (obj === "whatsapp_business_account") {
      for (const entry of payload.entry || []) {
        for (const ch of entry.changes || []) {
          const v = ch.value || {};
          const phoneId = v.metadata?.phone_number_id;
          const channel = await resolveChannel("whatsapp", "phone_number_id", phoneId);
          for (const m of v.messages || []) {
            const text = m.text?.body || m.button?.text || "[non-text message]";
            const name = v.contacts?.[0]?.profile?.name;
            await ingest("whatsapp", m.from, text, channel, name);
          }
        }
      }
    } else if (obj === "instagram" || obj === "page") {
      const type = obj === "instagram" ? "instagram" : "facebook";
      const idField = obj === "instagram" ? "ig_user_id" : "page_id";
      for (const entry of payload.entry || []) {
        const channel = await resolveChannel(type as any, idField, String(entry.id));
        for (const ev of entry.messaging || []) {
          const text = ev.message?.text;
          if (text && !ev.message?.is_echo) await ingest(type as any, ev.sender?.id, text, channel);
        }
      }
    }
  } catch (_e) { /* never fail the webhook — Meta retries on non-200 */ }

  return new Response("EVENT_RECEIVED", { status: 200 });
});
