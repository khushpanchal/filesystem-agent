import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { LanguageModel } from 'ai';
import { PROVIDERS, type Provider } from './settings';

export function isProvider(value: string | null): value is Provider {
  return value !== null && Object.hasOwn(PROVIDERS, value);
}

// One function, four providers: each call uses the user's own key
export function getModel(
  provider: Provider,
  apiKey: string,
  modelId: string
): LanguageModel {
  switch (provider) {
    case 'google':
      return createGoogleGenerativeAI({ apiKey })(modelId);
    case 'openai':
      return createOpenAI({ apiKey })(modelId);
    case 'anthropic':
      return createAnthropic({ apiKey })(modelId);
    case 'openrouter':
      // 'strict' = talking to OpenRouter itself (sends its newer request options)
      return createOpenRouter({
        apiKey,
        compatibility: 'strict',
        appName: 'Ask Your Docs'
      }).chat(modelId);
  }
}
