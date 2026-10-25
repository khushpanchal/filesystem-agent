import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { PROVIDERS, type Provider } from './settings';

export function isProvider(value: string | null): value is Provider {
  return value !== null && Object.hasOwn(PROVIDERS, value);
}

// One function, three providers: each call uses the user's own key
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
  }
}
