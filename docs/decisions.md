# Decisions

> Why things are the way they are. New decisions are added at the bottom; old ones are kept and
> marked **Replaced by Dx** instead of deleted.

| # | Decision | Why | What we didn't do |
|---|---|---|---|
| D0 | Grow this repo on a branch `mvp`; save the course version as tag `course-complete` | Reuse the chat, route, agent and tool that already work; every push to `mvp` gets its own preview URL | Start a new project |
| D1 | The user brings their **own API key** | They pay for their AI use; we pay nothing for models | Use our key for everyone |
| D2 | **Remove the Vercel Sandbox** | The free plan allows ~5,000 sandboxes a month; a few dozen users would use that up | One sandbox per user |
| D3 | **Files stay in the user's browser** (saved with IndexedDB) | Private; still there after a reload; no storage cost | Upload files to our server |
| D4 | The AI loop runs on our server, but the **bash tool runs in the browser** | Files never leave the browser; requests stay tiny | Send all files with every message |
| D5 | The server keeps **no memory**; a new agent is made for each request | Server functions don't keep memory between requests anyway; avoids the course's shared global | One shared agent for everyone |
| D6 | Agent, tool and shell code use **no server-only APIs** (`fs`, `node:*`) | Lets us move everything into the browser later | — |
| D7 | The tool takes **one `command` string** | The course's `command` + `args` split confused the AI (pipes, `*.md`); we saw it fail again on 2026-10-24 | `command` + `args[]` |
| D8 | Ollama only when running locally. **Replaced by D13** | Our hosted server can't reach a user's laptop | — |
| D9 | No accounts, database or payments | Keep it small | — |
| D10 | OpenRouter left out; kept Google, OpenAI, Anthropic, AI Gateway, Ollama. **Partly replaced by D13** | Keep it small. Users only need a provider key, no Vercel account (AI Gateway is the exception) | OpenRouter now (it would need `@openrouter/ai-sdk-provider@^2.10.0` for our AI SDK v6) |
| D11 | The mini bash is **`just-bash`** (Vercel Labs, Apache-2.0, beta). Loaded only when first needed; a **new copy for every command**; strict limits on | Spike 1 in Chrome: `grep -rn`/`-i`, pipes, `*.txt`, names with spaces, real exit codes (0, 1, 2, 127) all worked; no network and no real disk. A fresh copy (~5 ms) throws away anything a command writes. Loading it late keeps ~400 KB out of the first page load | Write our own small shell (no pipes, more to test). Never build with `--webpack` (breaks on `node:zlib`) |
| D12 | The browser answers tools with **`onToolCall` → `addToolOutput`** (not awaited), resends with **`sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls`**; the server uses **`createAgentUIStreamResponse({ agent, uiMessages })`** | Spike 2: the tool had no `execute`, the browser returned `zebra-4417`, and the AI repeated it. It took 2 requests (1 message, then 2). `addToolResult` still exists but is deprecated | Converting messages by hand with `convertToModelMessages` |
| D13 | **Simpler MVP:** text files only (`.txt .md .csv .json`); providers are **Google, OpenAI, Anthropic** only | It's an MVP for our own testing. AI Gateway would make every tester create a Vercel account; Ollama only works on one laptop; PDF needs a big library. All moved to "later" | PDF now; AI Gateway / Ollama in Settings |

## Spikes

| Spike | Question | Answer |
|---|---|---|
| 1 | Can a bash run in the browser over files held in memory? | Yes, with `just-bash` → D11 |
| 2 | Can the AI ask for a tool that the browser runs? | Yes → D12 |

## Who pays for what

| Thing | Paid by |
|---|---|
| AI use | the user's API key |
| Storing files, running commands | the user's browser |
| Hosting the page and the server route | us, on Vercel's free plan (fine for testing; the free plan is non-commercial) |
