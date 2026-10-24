import { agent } from '@/lib/agent';
import { UIMessage, createAgentUIStreamResponse } from 'ai';

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();

  // The whole chat goes to the agent, so follow-up questions have context
  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
    onError: (error) => {
      // Message only: the full error object can include the request body
      console.error('Agent error:', (error as Error).message);
      return 'An error occurred. Please try again.';
    }
  });
}
