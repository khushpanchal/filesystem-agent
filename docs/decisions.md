# Ask Your Docs: Design Decisions

> Each decision records the **context**, what we **decided**, what we **rejected** and the
> **consequences** we accepted. The architecture they produce is in [hld.md](hld.md).

## Where we started

The project began as Vercel's "Filesystem Agents" course app: a Next.js chat where an AI agent
answers questions about a few call transcripts by running bash commands in a **Vercel Sandbox**
(a Linux microVM) on the server. It worked, but as a product it had four problems:

1. **One shared sandbox and agent for every user**, created at server start, with the files baked in.
2. **Files lived on the server**, so users would have to upload private documents.
3. **Our AI key paid for everyone's questions**, and the sandbox free tier (about 5,000 sandboxes
   a month) would run out after a few dozen active users.
4. **Only the last message reached the model**, so follow-up questions had no context.

The decisions below turn that demo into a private, zero-cost-to-host product. They are grouped by
concern, not by date.

---

## Architecture

### 1. Let the agent explore files with shell commands, not a vector index

- **Context:** answers must be precise and verifiable, and collections are small (up to 20 files).
- **Decision:** the model gets one tool that runs shell commands (`grep`, `sed`, `ls`, pipes) over
  the files, and cites `[file:line]` from the command output.
- **Rejected:** retrieval-augmented generation with embeddings. It needs an embedding model, an
  index to build and store, chunking choices, and it returns "similar" text rather than exact lines.
- **Consequences:** no indexing step, exact citations and fully visible reasoning. Search quality
  depends on the model choosing good search terms, and very large collections would need an
  index later.

### 2. Keep files in the browser

- **Context:** the documents are private, and storing them would make us a data processor with
  storage costs.
- **Decision:** files are saved in **IndexedDB** on the user's device (via `idb-keyval`, about
  600 bytes) and never uploaded.
- **Rejected:** server or blob storage (privacy, cost, retention policy); sending every file with
  every message (slow, expensive, and the provider would see everything).
- **Consequences:** private by default and no storage bill. Files are per browser and per device,
  with no sync, and the browser can evict storage under pressure.

### 3. Split the agent loop: reasoning on the server, the tool in the browser

- **Context:** the model call needs provider SDKs and streaming; the files exist only in the browser.
- **Decision:** the tool is declared **without an `execute` function**. The server-side agent
  loop stops at each tool call and streams it to the browser. The browser runs the command
  (`onToolCall`), attaches the output (`addToolOutput`), and the chat resends automatically
  (`sendAutomaticallyWhen`).
- **Rejected:** a sandbox per user on the server (cost, cold starts, files would have to be
  uploaded); running the whole agent in the browser (provider SDKs and keys in client bundles,
  CORS limits on some providers, one less place to enforce timeouts and error handling).
- **Consequences:** files are never uploaded; the server and the model see only what the model's
  commands print (capped, and shown to the user). Each command costs one extra round trip,
  which shaped the instructions (one broad search first) and the 10-command limit.
- **Validated by:** a spike where a tool with no `execute` was answered by the browser and the
  model used the result, in two requests.

### 4. A stateless server that receives the whole chat

- **Context:** serverless functions don't keep memory between requests, and the course app used
  only the last message.
- **Decision:** the browser sends the full UI message history every time; the route creates a new
  model client and agent per request (`createAgentUIStreamResponse({ agent, uiMessages })`).
- **Rejected:** server-side sessions or a shared global agent (state, cross-user leakage,
  horizontal scaling issues).
- **Consequences:** follow-ups work, any instance can serve any request, and there is nothing to
  clean up. Request size grows with the conversation, which the output cap keeps in check.

---

## Execution

### 5. Run commands in `just-bash`, a fresh instance per command

- **Context:** the model's commands are untrusted input. They must not reach the network, a real
  disk or other users.
- **Decision:** use `just-bash` (Apache-2.0), a bash interpreter written in TypeScript with an
  in-memory file system. Each command gets a **new instance** with the `hardened` limit profile,
  the saved files mounted under `/docs`, and `cwd /docs`.
- **Rejected:** Vercel Sandbox (≈15 s cold start, a monthly quota, needs server credentials);
  writing our own mini-shell (no pipes or globs, much more to test).
- **Consequences:** real bash semantics (pipes, globs, exit codes 0/1/2/127) with no
  infrastructure. A write such as `echo > file` is discarded with the instance. The library
  is about 400 KB and isn't tree-shakable (see decision 12). It doesn't build with
  `next build --webpack`; Turbopack, the default, is used.
- **Validated by:** a spike running `grep -rn`, `-i`, pipes, globs and names with spaces in Chrome;
  then nine unit tests in `lib/shell.test.ts`.

### 6. The tool takes one command string

- **Context:** the course tool split input into `command` and `args[]`. Models regularly
  produced `command: "ls -la"` with `args: ["-la"]`, or put globs and pipes in `args`.
- **Decision:** `bashTool` takes a single `command` string: the full command line.
- **Rejected:** structured arguments, or several narrow tools (`search`, `read`, `list`), which
  would multiply schemas and round trips.
- **Consequences:** matches how models already write shell commands; failures dropped to near
  zero. Parsing is the shell's job, where it belongs.

### 7. Bound every loop and payload

- **Context:** each command is a paid round trip, and every tool output is resent with the history.
- **Decision:**

  | Limit | Value | Why |
  |---|---|---|
  | Command output | 8,000 characters (stdout and stderr each), with `truncated: true` | Keeps resent history small; the model is told to narrow the search |
  | Commands per answer | 10, then one final round to answer | Stops loops on small models; gives a graceful ending |
  | Provider timeout | 60 s per request | An overloaded model must end in a message, not an endless wait |
  | Files | 20 files; 1 MB per text file, 10 MB per PDF | Fits comfortably in browser storage and in a shell instance |

- **Consequences:** predictable cost and latency. Huge files need narrower searches.

---

## AI providers and keys

### 8. Users bring their own key; the server has none

- **Context:** a shared key makes the host pay for every question and invites abuse.
- **Decision:** the user picks a provider and pastes a key in Settings. It is saved in
  `localStorage` and sent with each request in an **`x-api-key` header**. The server passes it to
  the provider SDK and never stores or logs it. There is **no fallback key**: a missing key is
  HTTP 400.
- **Rejected:** a hosted key with rate limiting (cost and abuse risk); a key inside the request
  body (it would sit alongside the chat and be easier to log by accident); accounts.
- **Consequences:** zero AI cost for the host and full user control over provider and model.
  The key lives in the browser, so the page must stay free of third-party scripts.

### 9. Four providers behind one function

- **Context:** users have different keys; adding providers should be cheap.
- **Decision:** `getModel(provider, apiKey, modelId)` returns an AI SDK model for **Google,
  OpenAI, Anthropic or OpenRouter**; the provider list, default models and key links live in one
  table (`PROVIDERS`). OpenRouter uses its official AI SDK provider, pinned to the 2.x line that
  targets AI SDK 6.
- **Rejected:** Vercel AI Gateway as the only provider (every user would need a Vercel account);
  local models through Ollama (a hosted server can't reach a user's laptop); OpenRouter through
  the OpenAI-compatible client (it can drop OpenRouter-specific reasoning fields that some models
  need between tool calls, and OpenRouter's own docs recommend its provider).
- **Consequences:** a new provider is one table entry and one `case`. Defaults are cheap, fast
  models with reliable tool calling (`gemini-3.5-flash-lite`, `gpt-6-luna`, `claude-haiku-5-5`,
  `openai/gpt-5-mini`). The model is a free-text field, because model names change faster than
  releases. One Google flagship default was replaced after it proved overloaded in practice.

### 10. A general assistant that reads files on demand

- **Context:** an early "answer only from the files" prompt made the assistant refuse simple
  general questions ("how hot is the sun?").
- **Decision:** the instructions describe a general-purpose assistant that searches `/docs` only
  when the question depends on the user's files; general answers carry no citations; questions
  about the files that the files can't answer say so.
- **Rejected:** a documents-only bot; a separate "search my files" toggle.
- **Consequences:** one chat for everything. Greetings and general questions use zero commands.
  The model occasionally searches when unsure, which costs one cheap round trip.

---

## Files

### 11. Read PDFs in the browser, at upload time

- **Context:** PDFs are the most common document format, but the shell only understands text.
- **Decision:** when a PDF is added, `pdf.js` (Mozilla, Apache-2.0, legacy build) extracts its
  text in the browser, page by page, with a `--- page N ---` line before each page. The text is
  saved like any other file at `/docs/<name>.pdf`.
- **Rejected:** server-side extraction (files would leave the browser); extracting on every
  command (slow, and the shell can't parse PDF).
- **Consequences:** the shell, tool, instructions and citations needed no changes. Scanned PDFs
  (no text layer) and password-protected PDFs are refused with a clear message. Citations point to
  lines in the extracted text; reliable page citations are future work.

### 12. Load heavy libraries only when needed

- **Context:** the shell (~400 KB) and the PDF reader (~130 KB gzipped plus a ~375 KB worker) are
  large compared to the rest of the page.
- **Decision:** both are loaded with dynamic `import()` on first use: the shell on the first
  command, the PDF reader on the first PDF.
- **Consequences:** a small initial page load; a short one-time delay the first time each
  feature is used.

---

## Experience and operations

### 13. Every failure ends in a plain-language message

- **Context:** provider failures surfaced as a generic error, or as nothing at all: a timeout
  ends the stream as an *abort*, which the chat library doesn't treat as an error.
- **Decision:** the route maps provider status codes to actionable messages (wrong key, unknown
  model, out of credits, rate limit, overloaded). The chat shows a notice when a response ends with
  no finish reason (timeout) or the connection drops. "Thinking…" shows from the moment of sending.
- **Consequences:** users can fix problems themselves. Logs record provider and status only,
  because one provider echoes part of a wrong key in its error message.

### 14. Small, dependency-light stack

- **Decision:** Next.js App Router on Vercel, AI SDK 6, Tailwind, native `<dialog>`, a browser
  event for "open Settings", no state-management or UI library.
- **Rejected:** component libraries and global stores. The app has three components with state.
- **Consequences:** about 1,000 lines of TypeScript and no environment variables to deploy.
  AI SDK packages are kept on the v6 line together; moving to v7 is a deliberate, all-at-once
  upgrade.

---

## Cost model

| Item | Paid by |
|---|---|
| AI usage | The user's own key |
| File storage and command execution | The user's browser |
| Hosting the page and the API route | The host, on a free serverless tier (no database, storage or AI spend) |

## When to revisit

| Signal | Revisit |
|---|---|
| Users have hundreds of files, or files over 10 MB | Decision 1: add a search index |
| Users need their files on several devices | Decision 2: optional encrypted sync |
| Round-trip latency dominates answer time | Decision 3: run the agent fully in the browser |
| Providers start allowing browser calls with user keys everywhere | Decision 3: drop the server |
| Scanned PDFs are common | Decision 11: add OCR |
