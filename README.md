# STEADD — AI agents as a service

Multi-tenant platform: an **omnichannel chatbot**, **automated B2B lead generation**
and **content generation** for SMB clients. Polish + English.

## Architecture (MVP v2)

```
GitHub Pages (React SPA)  ──►  Supabase  ◄── OpenClaw bridge (office Mac = the "brain")
  landing + panel              DB + Auth + RLS         polls jobs, runs autonomous work,
  (HashRouter, relative base)  + Realtime + Edge       sends Meta replies, finds leads
                               + jobs queue
```

- **Frontend** — React + Vite, static, hosted on **GitHub Pages**. HashRouter + relative
  `base` so it runs on any Pages path or a custom domain (drop a `CNAME`).
- **Backend** — **Supabase** project `STEADD` (`iwmrjewqxmtczuktbkpr`, eu-north-1).
  Postgres + RLS multi-tenancy, Auth, Realtime, pgvector knowledge base, a `jobs` queue,
  and Edge Functions.
- **Brain** — **OpenClaw** on the office Mac (reached over Tailscale). The platform never
  depends on the Mac being online: jobs queue in Supabase and run when it's up. See
  [`bridge/`](./bridge).

## Roles
- **admin** — creates clients & projects, links a client to one or more projects (M:N),
  manages fellow admins, edits any client's config/knowledge base, and **"views as client"**
  via the top-right project switcher.
- **client** — sees their project's panel: **Overview · Chatbot · Leads · Content ·
  Business & knowledge · Settings**. No project linked → "project is being connected".

Seeded first admin: **office@barabashflow.pl** (password set at provisioning). Add more
admins/clients from the **Administration** tab.

## The three functions
1. **Chatbot** — embeddable website widget (works out of the box) + Instagram / WhatsApp /
   Messenger (ready to connect; needs Meta business verification + App Review). Communication
   archetypes, custom instructions, customer-base import, conversation history with source &
   archetype.
2. **Lead generation** — write a goal prompt → the agent finds B2B companies (Google Maps +
   email; LinkedIn from the client's own account), writes an offer, waits for a reply and
   classifies it. After the first reply the lead is marked done and you take over. Everything
   visible in the panel.
3. **Content** — describe a topic → AI generates posts/articles/emails in the right format,
   knowing the business from the knowledge base.

## Edge Functions (deployed)
| Function | JWT | Purpose |
|---|---|---|
| `process-jobs` | no (own auth) | runs edge jobs via the brain: content, web chat replies, lead classify, embeddings |
| `widget-chat` | no (public) | website widget endpoint (synchronous bot reply) |
| `admin-users` | yes (admin) | create/delete clients & admins, reset passwords |
| `meta-webhook` | no (public) | IG/WA/FB ingress (verification + incoming → queue) |

## Secrets to set (Supabase → Project Settings → Edge Functions → Secrets)
```
BRAIN_URL   = https://barabash-ai.tailcd3444.ts.net/v1   # OpenAI-compatible (Barabash AI / OpenClaw)
BRAIN_KEY   = bai-sk-...                                   # bearer key
BRAIN_MODEL = qwen3.5:9b                                   # optional
EMBED_URL / EMBED_KEY / EMBED_MODEL                        # optional (defaults to BRAIN_*, nomic-embed-text)
CRON_SECRET = <random>                                     # to let pg_cron call process-jobs
META_VERIFY_TOKEN = <random>                               # Meta webhook verification
```
Without `BRAIN_*` the panel still works: chat/content jobs queue and the OpenClaw bridge
processes them; the widget returns a graceful "passed to support" message.

The **OpenClaw bridge** uses the Supabase **service_role** key — see `bridge/.env.example`.

## Deploy (GitHub Pages)
1. Create a repo, push this folder.
2. Repo **Settings → Pages → Source = GitHub Actions**.
3. The included `.github/workflows/deploy.yml` builds and deploys on every push to `main`.
4. Custom domain: add a `CNAME` file (the build uses relative paths, so no rebuild needed).

> Note: a `.gitignore` is intentionally **not** included (per project rule). Add
> `node_modules/` and `dist/` to your own `.gitignore` before committing.

## Local dev
```
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
```

## Embed the chatbot on a client's site
```html
<script src="https://YOUR-SITE/widget.js" data-steadd="PROJECT_ID"></script>
```
(Optional: `data-color`, `data-lang="pl|en"`, `data-title`.)

## Security notes
- RLS isolates tenants on every table; `match_knowledge` and trigger functions are not
  callable via the public API.
- Enable **Leaked Password Protection** in Supabase Auth (Dashboard) — recommended.
- LinkedIn forbids automation regardless of whose account is used; keep volumes low and
  human-paced, prefer email + Maps as the primary lead channel. See `bridge/README.md`.
