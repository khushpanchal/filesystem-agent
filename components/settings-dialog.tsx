'use client';

import { useEffect, useRef, useState } from 'react';
import {
  PROVIDERS,
  loadSettings,
  onOpenSettings,
  saveSettings,
  type Provider,
  type Settings
} from '@/lib/settings';

export function SettingsDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // What's saved (shown on the button) vs. what's being edited in the form
  const [saved, setSaved] = useState<Settings | null>(null);
  const [provider, setProvider] = useState<Provider>('google');
  const [apiKey, setApiKey] = useState('');
  const [modelId, setModelId] = useState(PROVIDERS.google.defaultModel);

  // localStorage only exists in the browser, so read it after the first draw
  useEffect(() => {
    setSaved(loadSettings());
  }, []);

  // Let other components open this box (the chat does when there's no key)
  useEffect(() => onOpenSettings(open), []);

  function open() {
    // Start from what's saved, or the defaults
    const current = loadSettings();
    const p = current?.provider ?? 'google';
    setProvider(p);
    setApiKey(current?.apiKey ?? '');
    setModelId(current?.modelId ?? PROVIDERS[p].defaultModel);
    dialogRef.current?.showModal();
  }

  function changeProvider(p: Provider) {
    setProvider(p);
    // Each provider has its own model names
    setModelId(PROVIDERS[p].defaultModel);
  }

  function handleSave(e: React.SubmitEvent) {
    e.preventDefault();
    const settings = {
      provider,
      apiKey: apiKey.trim(),
      modelId: modelId.trim() || PROVIDERS[provider].defaultModel
    };
    saveSettings(settings);
    setSaved(settings);
    dialogRef.current?.close();
  }

  const info = PROVIDERS[provider];

  return (
    <>
      <button
        onClick={open}
        className="w-full border px-3 py-1 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        Settings:{' '}
        {saved?.apiKey ? (
          <span>
            {PROVIDERS[saved.provider].label} · {saved.modelId}
          </span>
        ) : (
          <span className="text-red-600">no API key yet</span>
        )}
      </button>

      <dialog
        ref={dialogRef}
        className="m-auto w-full max-w-md border bg-background p-6 font-mono text-sm text-foreground backdrop:bg-black/40"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="text-xs font-bold uppercase">Settings</div>

          <label className="block space-y-1">
            <span className="text-xs">Provider</span>
            <select
              value={provider}
              onChange={(e) => changeProvider(e.target.value as Provider)}
              className="w-full border px-2 py-1"
            >
              {(Object.keys(PROVIDERS) as Provider[]).map((p) => (
                <option key={p} value={p}>
                  {PROVIDERS[p].label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs">API key</span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
              required
              className="w-full border px-2 py-1"
            />
            <a
              href={info.keyUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              Get a {info.label} key →
            </a>
          </label>

          <label className="block space-y-1">
            <span className="text-xs">Model</span>
            <input
              type="text"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="w-full border px-2 py-1"
            />
            <span className="text-xs text-zinc-500">
              Default: {info.defaultModel}
            </span>
          </label>

          <p className="text-xs text-zinc-500">
            No key? Google AI Studio has a free tier. Your key is saved only
            in this browser and sent with each question.
          </p>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="border px-3 py-1"
            >
              Cancel
            </button>
            <button type="submit" className="bg-black px-3 py-1 text-white">
              Save
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
