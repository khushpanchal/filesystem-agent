export type Provider = 'google' | 'openai' | 'anthropic' | 'openrouter';

export type Settings = { provider: Provider; apiKey: string; modelId: string };

// Default models: cheap, fast, good at tool calls (checked 2026-10-25).
// Google: 3.8/3.7-flash were overloaded (no answer in 40 s); 3.5-flash-lite
// answered the sample questions in 6-8 s with 1-2 commands.
export const PROVIDERS: Record<
  Provider,
  { label: string; defaultModel: string; keyUrl: string }
> = {
  google: {
    label: 'Google',
    defaultModel: 'gemini-3.5-flash-lite',
    keyUrl: 'https://aistudio.google.com/apikey'
  },
  openai: {
    label: 'OpenAI',
    defaultModel: 'gpt-6-luna',
    keyUrl: 'https://platform.openai.com/api-keys'
  },
  anthropic: {
    label: 'Anthropic',
    defaultModel: 'claude-haiku-5-5',
    keyUrl: 'https://platform.claude.com/settings/keys'
  },
  // One key, many models (IDs look like "vendor/model"; free ones end in ":free")
  openrouter: {
    label: 'OpenRouter',
    defaultModel: 'openai/gpt-5-mini',
    keyUrl: 'https://openrouter.ai/keys'
  }
};

const STORAGE_KEY = 'ask-your-docs-settings';

// Browser only (localStorage). Returns null if nothing is saved.
export function loadSettings(): Settings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Settings) : null;
  } catch {
    return null;
  }
}

export function saveSettings(settings: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

// The chat and the Settings box are separate components; this browser event
// lets the chat open Settings (e.g. when there's no key yet)
const OPEN_EVENT = 'open-settings';

export function openSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onOpenSettings(listener: () => void) {
  window.addEventListener(OPEN_EVENT, listener);
  return () => window.removeEventListener(OPEN_EVENT, listener);
}
