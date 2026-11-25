# ShepherdFlow

Sermon follow-up assistant for small churches — built for the **AI for Church Hackathon 2026**.

Turn a sermon transcript into a summary, small-group discussion questions, Mon–Fri
daily devotions, and caring follow-up drafts for congregants — with the pastor
always in charge. Every output is labelled **“AI draft. Pastor review required.”**

## What it does

1. **Input** — paste a sermon transcript (up to 8,000 words), pick tradition,
   tone and output language, and list congregants to care for (initials only).
   A sample sermon and sample congregants are built in.
2. **Sermon results** — 3–4 sentence summary, 5 discussion questions, Mon–Fri
   devotions. Every point carries a verbatim quote from the transcript
   (sermon trace); quotes are verified server-side against the transcript, and
   any Bible verse not in the sermon is flagged.
3. **Care triage** — each person is routed to “Send a message” or
   “Contact / visit in person”. Hard rules in code (not just the prompt):
   sick, grieving, or crisis-keyword notes **always** go to in-person contact
   and **never** get an AI message draft. Drafts can be edited, approved, and
   copied. Nothing is ever sent automatically.
4. **Downloads** — .txt (Markdown) and PDF, generated entirely in the browser.
   Only initials appear in files; unapproved drafts are marked NOT APPROVED.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in LLM_* to use live AI; leave empty for demo mode
npm run dev                   # http://localhost:3000
npm run build                 # production build check
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `LLM_BASE_URL` | No | OpenAI-compatible chat-completions base URL (default `https://code.verboo.ai/router/v1`) |
| `LLM_API_KEY` | No | API key. **Leave empty for demo mode** — the app shows prepared sample results and every feature still works. The key is only read server-side, never sent to the client. When a key is set and the AI call fails, the app shows a clear error with a retry button — it never silently falls back to demo results. |
| `LLM_MODEL` | No | Model name (default `glm-5.3-flash`) |
| `LLM_FALLBACK_BASE_URL` | No | Fallback provider base URL (default: same as `LLM_BASE_URL`) |
| `LLM_FALLBACK_API_KEY` | No | Fallback provider API key (default: same as `LLM_API_KEY`) |
| `LLM_FALLBACK_MODEL` | No | Fallback model name (default: same as `LLM_MODEL`) |

How the LLM is wired: all AI calls go through the server-side route
`/api/generate`, which makes **two calls** — one for the sermon
summary/questions/devotions and one for care triage — each with a 45-second
timeout, one retry on bad JSON, and automatic fallback to the fallback
provider. The two calls run **sequentially, not in parallel**: the Verboo
router rejects bursts of concurrent requests with HTTP 503 while single
calls succeed, so parallel calls proved unreliable on this provider. Providers that reject `response_format: json_object` (Verboo
returns 403 `structured_output_not_enabled`) are automatically retried as
plain text and the JSON is extracted from the reply. Server logs contain
only status and duration, never transcripts or congregant data.

### Connecting another provider

Any OpenAI-compatible chat-completions provider works: set its base URL,
key, and model name in the three `LLM_*` variables. To use a second
provider as automatic fallback, fill in the three `LLM_FALLBACK_*`
variables. Providers that support structured output get
`response_format: json_object`; providers that reject it are retried
without it.

### Diagnostics

`GET /api/health` reports whether each env var is set (true/false only,
never the values), the configured models, and a short live probe where the
model is asked to reply `OK`. Without a key it reports demo mode.

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project → Import** the repo (framework: Next.js).
3. Set environment variables in **Settings → Environment Variables** (Production): `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, and optionally the three `LLM_FALLBACK_*` variables. Without `LLM_API_KEY` the deployment runs in demo mode.
4. **Redeploy** after changing env vars (env changes only apply to new deployments). Then check `/api/health` — it should report `mode: "live"` and `test.ok: true`.
5. Remove Vercel Authentication (SSO) protection on the project if the
   site should open without a login.

Example values for Verboo (the router used by this project's other apps):

| Variable | Value |
|---|---|
| `LLM_BASE_URL` | `https://code.verboo.ai/router/v1` |
| `LLM_MODEL` | `glm-5.3-flash` (or `deepseek-v4-pro-0813`, the fastest tested) |
| `LLM_API_KEY` | your Verboo API key (paste in the Vercel dashboard, never in code) |

## Privacy & safety

- No database, no login, no server-side storage of congregant data.
- All AI calls go through a server-side API route; the API key never reaches the client.
- See the in-app **Responsible AI** page (`/responsible-ai`).

## License

MIT
