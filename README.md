# Ask Your Docs

**Chat with an AI that can read your own files, without uploading them anywhere.**

**Try it:** https://filesystem-agent-two-gamma.vercel.app (bring your own API key)

Add text files or PDFs, ask a question, and get an answer that cites the exact file and line it
came from. Every command the AI runs to find the answer is shown in the chat. Your files stay in
your browser, and you use your own AI key.

```
You:        Who owns the billing migration, and when is the launch?

Assistant:  $ grep -rni "billing migration" /docs
              /docs/team-notes.md:4:- Priya owns the billing migration.
            $ grep -rni "launch" /docs
              /docs/team-notes.md:3:- The launch date is 12 March.

            Priya owns the billing migration [team-notes.md:4], and the launch
            is on 12 March [team-notes.md:3].
```

## Why use it

- **Private by design.** Files are saved in your browser (IndexedDB) and never uploaded. The AI
  only sees what its commands print, usually a few matching lines, sent as part of the chat.
- **Answers you can check.** Each fact comes with a `[file:line]` citation, and you can see every
  search the AI ran and what it returned.
- **Exact, not "similar".** The AI searches with real shell tools (`grep`, `sed`), so it finds
  the actual words in your files. There's no index to build and nothing to wait for.
- **Your key, your choice.** Google, OpenAI, Anthropic or OpenRouter, with any model you like.
  No account, no subscription, no middleman billing.
- **A normal assistant too.** General questions are answered directly; your files are only
  searched when a question is about them.
- **Free to host.** No database, no file storage and no server-side AI key. Deploying needs no
  environment variables.

## How it works

```
 Your browser                                   Server (stateless)          AI provider
┌──────────────────────────────────────────┐   ┌───────────────────┐   ┌──────────────┐
│ files (IndexedDB) ─► sandboxed bash      │   │                   │   │              │
│                       (just-bash)        │   │                   │   │              │
│ chat ── question + history, key header ──┼──►│ agent ────────────┼──►│ your model   │
│      ◄─ "run: grep -rni warranty /docs" ─┼───│ (tool call)       │◄──┼──            │
│ runs it locally, sends back the output ──┼──►│                   │──►│              │
│      ◄─ answer with [file:line] ─────────┼───│                   │◄──┼──            │
└──────────────────────────────────────────┘   └───────────────────┘   └──────────────┘
```

The AI runs on the server, but its one tool, a shell, runs **in your browser** over your saved
files. Files are never uploaded; the server and the AI only see what each command prints (at most
8,000 characters per command). Commands run in an isolated in-page shell with no
network and no real disk, and anything a command writes is thrown away.

More detail: [Architecture](docs/hld.md) · [Design decisions](docs/decisions.md) ·
[Product requirements](docs/prd.md)

## Using it

1. **Get an API key** from one of the supported providers:

   | Provider | Default model | Get a key |
   |---|---|---|
   | Google | `gemini-3.5-flash-lite` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (has a free tier) |
   | OpenAI | `gpt-6-luna` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
   | Anthropic | `claude-haiku-5-5` | [platform.claude.com/settings/keys](https://platform.claude.com/settings/keys) |
   | OpenRouter | `openai/gpt-5-mini` | [openrouter.ai/keys](https://openrouter.ai/keys) (one key, hundreds of models) |

2. **Open Settings** (top left), choose the provider, paste the key and press **Save**. You can
   type any other model ID offered by that provider.
3. **Add files** by dragging them onto the panel or with **Choose files**. They stay there after
   you reload or close the tab.
4. **Ask.** For example:
   - "Summarise each file in two sentences."
   - "Did anyone mention pricing? Quote the lines."
   - "What is the warranty period, and how do I make a claim?"
   - Follow-ups work: "Who said that, and in which file?"
5. **New chat** clears the conversation and keeps your files and settings.

**Supported files:** `.txt`, `.md`, `.csv`, `.json` (up to 1 MB each) and `.pdf` (up to 10 MB,
text-based; scanned PDFs have no text to read). Up to 20 files.

**If something goes wrong**, the chat says what to fix: a rejected key, an unknown model name,
no credits, too many requests, a busy model or a lost connection.

## Privacy

| What | Where it goes |
|---|---|
| Your files | Nowhere. Saved in this browser only |
| What the AI's commands print (up to 8,000 characters per command; usually a few matching lines, but a small file can be printed in full if the AI reads it) | Sent with the chat to the app's server and your AI provider |
| Your API key | Saved in this browser; sent with each question in a request header, used for that request only, never stored or logged by the server |
| Your chat | Kept in the page until you reload or start a new chat; sent with each question |

Your AI provider's own data policy applies to what it receives. Every command and its output is
shown in the chat, so you can always see exactly what was shared.

## Run it locally

Requirements: Node.js 22 or later, and [pnpm](https://pnpm.io/).

```bash
git clone https://github.com/khushpanchal/filesystem-agent.git
cd filesystem-agent
pnpm install
pnpm dev
```

Open http://localhost:3000, add a key in Settings, and add some files. No `.env` file is needed.

| Command | What it does |
|---|---|
| `pnpm dev` | Start the development server |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm test` | Unit tests for the in-browser shell (Vitest) |
| `pnpm exec tsc --noEmit` | Type-check |

## Deploy

The app deploys to [Vercel](https://vercel.com) as-is: import the repository and deploy. There are
no environment variables to set, because the server holds no keys and stores nothing.

## Project structure

```
app/
  layout.tsx, page.tsx      page shell and two-column layout
  api/route.ts              the only server code: validates the key, runs the agent, maps errors
components/
  chat.tsx                  chat state, runs the AI's commands in the browser
  chat-message.tsx          renders answers and commands
  files-panel.tsx           add, list and remove files
  settings-dialog.tsx       provider, key and model
lib/
  agent.ts, tools.ts        the agent and its one tool (bash, executed client-side)
  instructions.ts           the system prompt
  models.ts                 provider + key + model → AI SDK model
  settings.ts               providers, defaults, saved settings
  files.ts, pdf.ts          browser file storage and PDF text extraction
  shell.ts                  runs a command over the saved files (just-bash)
docs/                       product, architecture and design-decision documents
```

To add a provider, add it to `PROVIDERS` in `lib/settings.ts` and one `case` in `lib/models.ts`.
To add a file type, convert it to text in `lib/files.ts`, as `lib/pdf.ts` does for PDFs.

## Built with

[Next.js](https://nextjs.org) ·
[AI SDK](https://ai-sdk.dev) ·
[just-bash](https://github.com/vercel-labs/just-bash) (shell in the browser) ·
[pdf.js](https://github.com/mozilla/pdf.js) (PDF text) ·
[idb-keyval](https://github.com/jakearchibald/idb-keyval) (browser storage) ·
[OpenRouter AI SDK provider](https://github.com/OpenRouterTeam/ai-sdk-provider) ·
[Tailwind CSS](https://tailwindcss.com)

This project started from the starter app of Vercel's **Filesystem Agents** course, which runs an
agent's bash commands in a server-side Vercel Sandbox. Ask Your Docs moves the files and the
command execution into the browser and adds bring-your-own-key providers. The reasoning behind each
change is in [docs/decisions.md](docs/decisions.md).
