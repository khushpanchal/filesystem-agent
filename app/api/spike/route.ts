// S1-02 spike (throwaway): a tool with NO execute, so the browser has to run it.

import { ToolLoopAgent, createAgentUIStreamResponse, tool, UIMessage } from 'ai';
import { z } from 'zod';

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();
  console.log(`spike request: ${messages.length} messages`);

  const agent = new ToolLoopAgent({
    model: 'minimax/minimax-m3.1-flash',
    instructions:
      'When the user asks for the secret word, call getSecretWord and tell them the word it returns.',
    tools: {
      // No execute: the loop stops here and hands the call to the browser
      getSecretWord: tool({
        description: 'Returns the secret word.',
        inputSchema: z.object({})
      })
    }
  });

  // Takes the full UI message history (including browser tool outputs)
  return createAgentUIStreamResponse({ agent, uiMessages: messages });
}
