'use client';

import { useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls
} from 'ai';
import { listFiles } from '@/lib/files';
import { loadSettings } from '@/lib/settings';
import { runCommand, type CommandResult } from '@/lib/shell';

// Each command is one more round trip to the server and the AI
const MAX_COMMANDS = 10;

export function Form() {
  const [input, setInput] = useState('');
  // Endings that aren't errors in useChat, but the user still needs to know about
  const [notice, setNotice] = useState<string | null>(null);
  // A ref, not state: useChat keeps the first version of its callbacks,
  // so they must read the current count from here
  const commandsRef = useRef(0);

  const { messages, sendMessage, addToolOutput, status, error } = useChat({
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

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input;
    setInput('');
    commandsRef.current = 0;
    setNotice(null);
    sendMessage({ text });
  };

  return (
    <div className="min-h-screen p-8">
      <main className="mx-auto max-w-2xl">
        <div className="mb-6 space-y-4 font-mono text-sm">
          {messages.map((message) => (
            <div key={message.id} className="space-y-1">
              <div className="text-xs font-bold uppercase">{message.role}</div>
              {message.parts.map((part, i) => {
                if (part.type === 'text') {
                  return (
                    <div key={i} className="whitespace-pre-wrap">
                      {part.text}
                    </div>
                  );
                }
                if (part.type === 'tool-bashTool') {
                  const toolPart = part as {
                    state: string;
                    input?: { command?: string };
                    output?: CommandResult;
                    errorText?: string;
                  };
                  return (
                    <div
                      key={i}
                      className="space-y-1 text-blue-600 dark:text-blue-400"
                    >
                      <code>$ {toolPart.input?.command}</code>
                      {toolPart.state === 'output-available' &&
                        toolPart.output && (
                          <pre className="overflow-x-auto p-2 text-xs text-green-600">
                            {toolPart.output.stdout ||
                              toolPart.output.stderr ||
                              '(no output)'}
                            {toolPart.output.truncated &&
                              '\n… (cut at 8,000 characters)'}
                          </pre>
                        )}
                      {toolPart.state === 'output-error' && (
                        <pre className="overflow-x-auto p-2 text-xs text-red-600">
                          {toolPart.errorText}
                        </pre>
                      )}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          ))}

          {/* Shown while waiting for the AI too, not just while text arrives */}
          {(status === 'submitted' || status === 'streaming') && (
            <div className="text-xs text-zinc-400">Thinking…</div>
          )}

          {(error || notice) && (
            <div className="text-red-600">{notice ?? error?.message}</div>
          )}
        </div>

        {/* Always shown, so follow-up questions can be asked */}
        <form onSubmit={handleSubmit} className="flex gap-2 font-mono">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something..."
            className="flex-1 border px-4 py-2"
          />
          <button
            type="submit"
            disabled={status === 'submitted' || status === 'streaming'}
            className="bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </main>
    </div>
  );
}
