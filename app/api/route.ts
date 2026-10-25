import { createAgent } from '@/lib/agent';
import { getModel, isProvider } from '@/lib/models';
import { PROVIDERS } from '@/lib/settings';
import {
  APICallError,
  RetryError,
  UIMessage,
  createAgentUIStreamResponse
} from 'ai';

// Give up instead of waiting forever when the provider doesn't answer
const TIMEOUT_MS = 60_000;

// Turns an error into a message the user can act on
function errorMessage(error: unknown, provider: string) {
  // After its automatic retries, the SDK wraps the provider's error
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  const name = (cause as Error)?.name;

  if (name === 'TimeoutError' || name === 'AbortError') {
    return 'The model took too long to answer. Try again, or pick another model in Settings.';
  }
  if (APICallError.isInstance(cause)) {
    // Status code only: some providers repeat part of the key in the message
    console.error('Provider error:', provider, cause.statusCode);
    // Google answers a wrong key with 400 + API_KEY_INVALID instead of 401
    if (cause.responseBody?.includes('API_KEY_INVALID')) {
      return 'Your API key was rejected. Check it in Settings.';
    }
    switch (cause.statusCode) {
      case 401:
      case 403:
        return 'Your API key was rejected. Check it in Settings.';
      case 404:
        return 'Model not found. Check the model name in Settings.';
      case 402:
        return 'Your provider account is out of credits. Add credits, or pick a free model in Settings.';
      case 429:
        return 'Too many requests for your key. Wait a minute and try again.';
      case 500:
      case 503:
        return 'The model is busy right now. Try again, or pick another model in Settings.';
    }
    return `The AI provider returned an error (${cause.statusCode}). Check your settings.`;
  }
  // Message only: the full error object can include the request body
  console.error('Agent error:', (cause as Error)?.message);
  return 'An error occurred. Please try again.';
}

export async function POST(request: Request) {
  // Sent by the browser from Settings. Never log these.
  const provider = request.headers.get('x-provider');
  const apiKey = request.headers.get('x-api-key');
  const modelId = request.headers.get('x-model');

  // No fallback to a server key: every user brings their own
  if (!apiKey) {
    return new Response('Add your API key in Settings.', { status: 400 });
  }
  if (!isProvider(provider)) {
    return new Response('Choose a provider in Settings.', { status: 400 });
  }

  const { messages }: { messages: UIMessage[] } = await request.json();
  const model = getModel(
    provider,
    apiKey,
    modelId || PROVIDERS[provider].defaultModel
  );

  // The whole chat goes to the agent, so follow-up questions have context
  return createAgentUIStreamResponse({
    agent: createAgent(model),
    uiMessages: messages,
    timeout: TIMEOUT_MS,
    onError: (error) => errorMessage(error, provider)
  });
}
