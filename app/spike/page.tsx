'use client';

// S1-02 spike (throwaway): model asks for a tool → browser runs it → model answers.

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls
} from 'ai';

export default function Spike() {
  const [input, setInput] = useState('What is the secret word?');
  const { messages, sendMessage, addToolOutput } = useChat({
    transport: new DefaultChatTransport({ api: '/api/spike' }),
    // After the browser adds the tool output, send everything back to the server
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall({ toolCall }) {
      if (toolCall.dynamic) return;
      if (toolCall.toolName === 'getSecretWord') {
        // Not awaited: awaiting inside onToolCall can deadlock (AI SDK docs)
        addToolOutput({
          tool: 'getSecretWord',
          toolCallId: toolCall.toolCallId,
          output: { word: 'zebra-4417' }
        });
      }
    }
  });

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    sendMessage({ text: input });
  };

  return (
    <div className="min-h-screen p-8">
      <main className="mx-auto max-w-2xl space-y-4 font-mono text-sm">
        <div id="messages" className="space-y-2">
          {messages.map((message) => (
            <div key={message.id}>
              <div className="text-xs font-bold uppercase">{message.role}</div>
              {message.parts.map((part, i) => {
                if (part.type === 'text') return <div key={i}>{part.text}</div>;
                if (part.type.startsWith('tool-')) {
                  return (
                    <pre key={i} className="text-blue-600">
                      {JSON.stringify(part, null, 2)}
                    </pre>
                  );
                }
                return null;
              })}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 border px-4 py-2"
          />
          <button type="submit" className="bg-black px-4 py-2 text-white">
            Send
          </button>
        </form>
      </main>
    </div>
  );
}
