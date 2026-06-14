# STEADD — OpenClaw bridge (office Mac)

The bridge is the seam between the platform (Supabase) and **OpenClaw**, the
autonomous AI agent running on the office Mac. It polls the `jobs` queue and runs
the heavy work that can't run on the edge.

## What it handles
- `lead_find` — OpenClaw finds B2B leads (Google Maps/Places → website → public email).
- `lead_outreach` — OpenClaw writes & sends cold outreach (email, or LinkedIn from the
  client's own logged-in session with human-like pacing and low daily caps).
- `chat_reply` (Meta delivery only) — generates and delivers replies to Instagram /
  WhatsApp / Messenger via the channel's access token. Web replies are handled on the
  edge (`process-jobs` / `widget-chat`).

The platform never depends on the Mac being online: jobs queue in Supabase and run when
the Mac is up. This removes the "office Mac is a single point of failure" risk.

## Run
```bash
cd bridge
cp .env.example .env      # fill SUPABASE_SERVICE_ROLE_KEY + OPENCLAW_URL
node openclaw-bridge.mjs
```

## The only OpenClaw-specific code
Two functions in `openclaw-bridge.mjs`:
- `callOpenClawAgent(instructions, context)` — open-ended agentic task → JSON.
- `callOpenClawLinkedIn(action, payload)` — operate the client's LinkedIn session.

Wire them to however your OpenClaw instance is invoked (HTTP API / CLI / SDK). Everything
else (claiming jobs, writing leads/messages/events back, status transitions) is done.

## Run forever (launchd)
Create `~/Library/LaunchAgents/pl.steadd.bridge.plist` pointing `ProgramArguments` to
`node /path/to/bridge/openclaw-bridge.mjs`, with `KeepAlive=true` and `RunAtLoad=true`,
then `launchctl load` it. (Same pattern as the Barabash AI gateway plist.)

## ⚠ LinkedIn note
LinkedIn's User Agreement forbids automation regardless of whose account is used.
Operating the **client's own** account with consent removes the "spam from a stranger"
problem but not the detection/ban risk on that account. Keep volumes low, pace like a
human, prefer the official messaging surface, and keep email+Maps as the primary channel.
