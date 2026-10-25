# Ask Your Docs: Product Requirements

> **Status:** MVP released · [Live app](https://filesystem-agent-two-gamma.vercel.app) · **Docs:** [Architecture](hld.md) · [Design decisions](decisions.md)

## 1. Summary

Ask Your Docs is a chat assistant that can also read your own files. You add text files or PDFs,
ask a question, and get an answer that points to the exact file and line it came from. You can
see every command the AI ran to find it.

Two things make it different from a typical "chat with your PDF" tool:

- **Your files stay in your browser.** They are saved on your device and never uploaded. The AI
  searches them through a small sandboxed shell that runs inside the page.
- **You bring your own AI key.** Google, OpenAI, Anthropic or OpenRouter. The app has no
  accounts, no database and no AI bill of its own.

## 2. Problem

People keep useful information in documents: meeting notes, transcripts, manuals, reports,
exports. Getting a quick, trustworthy answer out of them is harder than it should be:

- Searching by keyword finds lines, not answers.
- General chat assistants don't know your documents, and uploading private files to a third-party
  service is often not acceptable.
- "Chat with your docs" products usually need an account, a subscription and a server-side copy
  of every file, and their answers are hard to verify.

## 3. Who it's for

- **Individuals** with private documents (notes, contracts, statements) who want answers
  without uploading files anywhere.
- **Developers and analysts** who want to see how an answer was found: which search, which lines.
- **Builders** who want a small, readable reference for an agent whose tools run in the browser.

## 4. Goals and non-goals

**Goals**

1. Answer questions about the user's files, with a citation for each fact (`[file:line]`).
2. Keep files on the user's device; send only what the AI needs to see.
3. Work as a normal assistant for questions that have nothing to do with the files.
4. Show every step the AI took, so answers can be checked.
5. Cost nothing to host beyond a free static and serverless tier.

**Non-goals (for now)**

- Accounts, sync between devices, or sharing.
- Very large document collections (hundreds of files or more), where a search index pays off.
- Scanned documents (images with no text layer) and Office formats.

## 5. User stories

| As a… | I want to… | So that… |
|---|---|---|
| user | add text files or PDFs by picking or dragging them | I can ask about them |
| user | close the tab and come back to my files | I don't have to add them again |
| user | ask a question in plain language and get a cited answer | I can trust and check it |
| user | ask follow-up questions | I can dig deeper without repeating context |
| user | ask general questions in the same chat | I don't need a second assistant |
| user | see the commands the AI ran and their output | I understand how the answer was found |
| user | use my own provider and model | I control cost, quality and where my data goes |
| user | get a clear message when something fails | I know what to fix (key, model, network) |

## 6. Functional requirements

**Files**
- Accept `.txt`, `.md`, `.csv`, `.json` (up to 1 MB each) and `.pdf` (up to 10 MB each), up to 20 files.
- Read PDF text in the browser when the file is added; refuse scanned or password-protected PDFs
  with a clear message.
- Save files in the browser so they survive a reload; remove one file or clear all.
- Rename a duplicate name instead of overwriting (`notes.md` → `notes (2).md`).

**Chat**
- Send the whole conversation each time, so follow-up questions work.
- Search the files only when a question depends on them; answer other questions directly.
- Cite each fact from a file as `[file:line]`; say so when the files don't contain the answer.
- Show each command and its output inline; show progress while waiting.
- "New chat" clears the conversation and keeps files and settings.

**Settings**
- Choose a provider (Google, OpenAI, Anthropic, OpenRouter), paste a key, and optionally change
  the model. A sensible default model is filled in for each provider.
- Link to each provider's key page. Saved in the browser only.
- Sending without a key opens Settings instead of failing.

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| Privacy | Files are never uploaded. Only the chat is sent, including the output of the commands the AI ran (at most 8,000 characters per command, and visible to the user), and only to our stateless server and the user's chosen provider. The key travels in a request header and is never stored or logged on the server. |
| Safety | The AI's commands run in an isolated in-page shell: no network, no real disk, nothing kept between commands, strict execution limits. |
| Cost | No server-side storage, database or AI spend. Each command's output is capped so long chats stay affordable on the user's key. |
| Performance | Heavy libraries (the shell, the PDF reader) load only when first needed. A typical answer takes 1–3 commands and a few seconds. |
| Reliability | Provider calls time out after 60 seconds; every failure ends in a plain-language message, never a silent stop. |
| Simplicity | About 1,000 lines of TypeScript, readable without prior knowledge of the project. |

## 8. Experience

```
┌──────────────────────┬───────────────────────────────────────────────┐
│ Settings: Google ·…  │ USER                                          │
│ FILES      Clear all │ Who owns the billing migration?               │
│ ┌──────────────────┐ │ ASSISTANT                                     │
│ │ Drop files here  │ │ $ grep -rni "billing migration" /docs         │
│ │  [Choose files]  │ │   /docs/team-notes.md:4:- Priya owns the …    │
│ └──────────────────┘ │ Priya owns the billing migration              │
│ team-notes.md  117 B │ [team-notes.md:4].                            │
│ manual.pdf   49.6 KB │                                               │
│                      │ [ Ask something...      ] [Send] [New chat]   │
└──────────────────────┴───────────────────────────────────────────────┘
```

## 9. Acceptance checklist

1. In a fresh browser, add an API key, a text file and a PDF.
2. Reload: the files are still listed.
3. Ask three questions about the files: correct answers, commands visible, citations present.
4. Ask a follow-up that depends on the previous answer: it works.
5. Ask about something that isn't in the files: the answer says so.
6. Ask a general question ("What is the capital of Japan?"): answered directly, no commands.
7. DevTools → Network: no file is uploaded; request bodies contain only the chat and command
   output (each output at most 8,000 characters); the key appears only in a header.
8. Wrong key, unknown model, offline: each shows a clear message.
9. A scanned PDF and a non-PDF renamed to `.pdf`: each is refused with a clear message.

## 10. Milestones

| Phase | Delivered |
|---|---|
| 1. Files in the browser | Files panel, browser storage, file rules |
| 2. Shell in the browser | `runCommand` over saved files, with tests |
| 3. Browser-side tool | Full chat sent to the server; the AI's commands run in the browser; server sandbox removed |
| 4. Bring your own key | Settings, per-request model from the user's key, no server key |
| 5. Usable chat | Progress, plain-language errors, New chat, general-assistant behaviour |
| 6. More providers and files | OpenRouter; PDF text extraction in the browser |
| 7. Release | README, production deploy, acceptance checklist |

## 11. Future work

- Page numbers in PDF citations, and clickable citations that open the source line.
- Saving conversations; trimming very long ones.
- Word documents; OCR for scanned PDFs.
- More providers (AI Gateway, local models through Ollama).
- A search index for large collections.
- Running the whole agent in the browser, with no server at all.

## 12. Risks

| Risk | Mitigation |
|---|---|
| The AI may read a whole small file (e.g. with `cat`), which sends that file's text to the provider | Every command and its output is shown in the chat; output is capped at 8,000 characters per command; instructions prefer targeted searches over reading whole files |
| A key saved in the browser could be read by malicious script on the page | No third-party scripts or analytics; the key is sent only with the user's own requests |
| Default models get renamed, overloaded or retired | The model is a free-text field; defaults live in one file; errors name the fix |
| Small models misuse the tool or loop | One plain command string as input, a 10-command limit per answer, short instructions |
| Many commands per answer make it slow | Instructions favour one broad `grep` first; output is capped |
