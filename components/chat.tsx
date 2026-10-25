'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls
} from 'ai';
import { listFiles } from '@/lib/files';
import { loadSettings, openSettings } from '@/lib/settings';
import { runCommand } from '@/lib/shell';
import { ChatMessage } from './chat-message';

// Each command is one more round trip to the server and the AI
const MAX_COMMANDS = 10;

export function Chat() {
  const [input, setInput] = useState('');
  // Endings that aren't errors in useChat, but the user still needs to know about
  const [notice, setNotice] = useState<string | null>(null);
  // A ref, not state: useChat keeps the first version of its callbacks,
  // so they must read the current count from here
  const commandsRef = useRef(0);

  const {
    messages,
    setMessages,
    sendMessage,
    addToolOutput,
    stop,
    status,
    error,
    clearError
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api',
      // Read on every request, so a key saved in Settings is used right away.
      // The key travels in a header, never in the chat body.
      headers: (): Record<string, string> => {
        const settings = loadSettings();
        if (!settings) return {};
        return {
          'x-provider': settings.provider,
          'x-api-key': settings.apiKey,
          'x-model': settings.modelId
        };
      }
    }),
    // Once every command has an output, send the chat back to the AI.
    // One extra round after the limit lets the AI answer with what it found.
    sendAutomaticallyWhen: ({ messages }) =>
      commandsRef.current <= MAX_COMMANDS + 1 &&
      lastAssistantMessageIsCompleteWithToolCalls({ messages }),
    onFinish({ isError, isDisconnect, finishReason }) {
      if (isDisconnect) {
        setNotice('Lost the connection to the server. Check your internet and try again.');
      } else if (!isError && !finishReason) {
        // Every normal ending sends a finish reason ("stop", "tool-calls").
        // The server's timeout ends the stream without one, and not as an error.
        setNotice(
          'No answer came back: the model may be busy or took too long. Try again, or pick another model in Settings.'
        );
      }
    },
    // The AI asked for a command: run it here, over the saved files
    async onToolCall({ toolCall }) {
      if (toolCall.dynamic || toolCall.toolName !== 'bashTool') return;
      commandsRef.current += 1;

      if (commandsRef.current > MAX_COMMANDS) {
        addToolOutput({
          state: 'output-error',
          tool: 'bashTool',
          toolCallId: toolCall.toolCallId,
          errorText: `Limit of ${MAX_COMMANDS} commands per answer reached. Answer now with what you found.`
        });
        return;
      }

      const { command } = toolCall.input as { command: string };
      const result = await runCommand(command, await listFiles());
      // Not awaited: awaiting addToolOutput inside onToolCall can deadlock
      addToolOutput({
        tool: 'bashTool',
        toolCallId: toolCall.toolCallId,
        output: result
      });
    }
  });

  const busy = status === 'submitted' || status === 'streaming';

  // Follow the newest message as it streams in
  useEffect(() => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  }, [messages, status]);

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    // No key yet: open Settings instead of sending (the question stays typed)
    if (!loadSettings()?.apiKey) {
      openSettings();
      return;
    }
    const text = input;
    setInput('');
    commandsRef.current = 0;
    setNotice(null);
    sendMessage({ text });
  };

  // Clears the chat only; saved files and settings stay
  const handleNewChat = () => {
    stop();
    setMessages([]);
    clearError();
    setNotice(null);
    commandsRef.current = 0;
  };

  return (
    <div className="min-h-screen px-8 pt-8">
      <main className="mx-auto max-w-2xl">
        <div className="mb-6 space-y-4 font-mono text-sm">
          {messages.length === 0 && (
            <div className="text-zinc-400">
              Ask anything. Add your files on the left to ask about them too.
            </div>
          )}

          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {/* Shown while waiting for the AI too, not just while text arrives */}
          {busy && (
            <div className="text-xs text-zinc-400">Thinking…</div>
          )}

          {(error || notice) && (
            <div className="text-red-600">{notice ?? error?.message}</div>
          )}
        </div>

        {/* Pinned to the bottom of the window, so it stays visible in long chats */}
        <form
          onSubmit={handleSubmit}
          className="sticky bottom-0 flex gap-2 bg-background py-4 font-mono"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something..."
            className="flex-1 border px-4 py-2"
          />
          <button
            type="submit"
            disabled={busy}
            className="bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            Send
          </button>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleNewChat}
              className="border px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              New chat
            </button>
          )}
        </form>
      </main>
    </div>
  );
}
