# Decision Log — "Ask Your Docs"

> Append-only. Each decision records what, why, and what was rejected. Spikes (S1-xx) add their
> outcome here. Superseded decisions stay, marked **Superseded by Dx**.

| # | Decision | Why | Rejected alternative | Status |
|---|---|---|---|---|
| D0 | **Extend this repo**, migrate incrementally on an `mvp` branch; tag the course version (`course-complete`) | Reuse working pieces (chat UI, route, agent, tool schema); Vercel preview deployments per push while `main` stays the course app | New project from scratch | Accepted (P0-01 done) |
| D1 | **BYOK**: the user supplies the model API key | User pays tokens; hosting pays $0 for models | Our own key | Accepted |
| D2 | **Remove Vercel Sandbox** | Hobby quota: 5,000 sandbox creations/month ≈ 166/day; 50 daily users would exhaust it | Sandbox per session | Accepted |
| D3 | **Files stay in the browser** (IndexedDB) | Upload once, persists across reloads; privacy; no storage cost | Upload to server / Vercel Blob | Accepted |
| D4 | **Client-side tool execution**: loop on server, `bashTool` runs in browser | Files never sent to server; no 4.5 MB request-body cap; tiny requests | Re-send all files every message | Accepted |
| D5 | **Stateless server**, agent built **per request** via `createAgent()` | Functions don't keep memory between requests; avoids the course's module-singleton issues | Module-level `export const agent` | Accepted |
| D6 | Agent, tool schema and shell code are **portable** (no `node:*`/server-only APIs) | Scale path: move the whole loop into the browser later | — | Accepted |
| D7 | Tool input = **single `command` string** | Course's `command` + `args[]` split confused the model (pipes/globs/quoting); we own the parser now | `command` + `args` | Accepted |
| D8 | **Ollama only in local/self-host mode** | Hosted server can't reach the user's `localhost:11434` | Ollama on hosted app | Accepted |
| D9 | No accounts, no DB, no payments in MVP | Minimal scope | — | Accepted |
| D10 | MVP providers stay as planned (Google, OpenAI, Anthropic, AI Gateway, Ollama-local); **OpenRouter deferred** to post-MVP | Keep the MVP simple. End users need only a provider API key, no Vercel account, **except AI Gateway**, which needs the user's own Vercel account + card → label it so in Settings. Default suggestion: Google AI Studio (free tier, no card) | OpenRouter now (`@openrouter/ai-sdk-provider@^2.10.0` for ai@6; 3.x needs ai@7) | Accepted (2026-10-24) |

## Pending decisions (resolved by spikes)

| Spike | Question | Outcome |
|---|---|---|
| S1-01 | Shell executor: `just-bash` vs hand-written mini-shell (browser support, `grep -rni`/pipes, bundle size, license) | _pending_ |
| S1-02 | AI SDK v6 client-side tool round trip: API names and how the route accepts full history | _pending_ |

## Cost model (who pays what)

| Item | Paid by | Our cost |
|---|---|---|
| Model tokens | user's API key | $0 |
| File storage + grep execution | user's browser | $0 |
| Static pages/JS (CDN) | us (Vercel) | ~$0 on Hobby |
| Agent loop function (`app/api/route.ts`) | us (Vercel) | only scaling cost; Hobby fits ~50 daily users |
| Domain (optional) | us | ~$10–15/yr |

Vercel **Hobby is non-commercial**; move to **Pro** when commercial or near limits. At very high
concurrency the server loop (functions held open while streaming) becomes the cost → scale path:
move the loop into the browser (D6).
