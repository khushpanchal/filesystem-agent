'use client';

import { useEffect, useState } from 'react';
import {
  addFile,
  clearFiles,
  listFiles,
  removeFile,
  type DocFile
} from '@/lib/files';

// Served from public/samples/ (the 3 course call transcripts)
const SAMPLES = [
  'call-1-platform-review.md',
  'call-2-follow-up-review.md',
  'call-3-commercial-alignment.md'
];

function formatSize(size: number) {
  if (size < 1024) return `${size} B`;
  return `${(size / 1024).toFixed(1)} KB`;
}

export function FilesPanel() {
  const [files, setFiles] = useState<DocFile[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  // Reading a PDF can take a moment
  const [adding, setAdding] = useState(false);

  // IndexedDB is the source of truth; re-read it after every change
  async function refresh() {
    setFiles(await listFiles());
  }

  // Load saved files once, when the page opens (browser only)
  useEffect(() => {
    refresh();
  }, []);

  // Shared by the file picker and the drop zone
  async function addFiles(list: FileList | File[] | null) {
    if (!list) return;
    setAdding(true);
    const errs: string[] = [];
    // One at a time, so each add sees the files saved before it
    for (const file of Array.from(list)) {
      try {
        await addFile(file);
      } catch (e) {
        errs.push((e as Error).message);
      }
    }
    setErrors(errs);
    await refresh();
    setAdding(false);
  }

  // Samples not saved yet, so a second click doesn't add copies
  const missingSamples = SAMPLES.filter(
    (name) => !files.some((f) => f.name === name)
  );

  // Download each sample and turn it into a File, as if the user picked it
  async function loadSamples() {
    try {
      const samples = await Promise.all(
        missingSamples.map(async (name) => {
          const res = await fetch(`/samples/${name}`);
          if (!res.ok) throw new Error(`${name}: could not load sample`);
          return new File([await res.text()], name, { type: 'text/markdown' });
        })
      );
      await addFiles(samples);
    } catch (e) {
      setErrors([(e as Error).message]);
    }
  }

  async function handleRemove(name: string) {
    await removeFile(name);
    await refresh();
  }

  async function handleClear() {
    await clearFiles();
    setErrors([]);
    await refresh();
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    // Reset so picking the same file again still fires onChange
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    // Stop the browser from opening the dropped file
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4 pt-2 font-mono text-sm">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold uppercase">Files</div>
        {files.length > 0 && (
          <button
            onClick={handleClear}
            className="text-xs text-zinc-500 hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="space-y-2 border-2 border-dashed p-4 text-center text-zinc-500"
      >
        <div>Drop .txt .md .csv .json .pdf here</div>
        <label className="inline-block cursor-pointer bg-black px-3 py-1 text-white">
          Choose files
          <input
            type="file"
            multiple
            accept=".txt,.md,.csv,.json,.pdf"
            onChange={handleChange}
            className="hidden"
          />
        </label>
      </div>

      {missingSamples.length > 0 && (
        <button
          onClick={loadSamples}
          className="w-full border px-3 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Load sample files
        </button>
      )}

      {adding && <div className="text-xs text-zinc-400">Reading files…</div>}

      {errors.length > 0 && (
        <ul className="space-y-1 text-xs text-red-600">
          {errors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}

      {files.length === 0 ? (
        <div className="text-xs text-zinc-400">No files yet</div>
      ) : (
        <ul className="space-y-1">
          {files.map((f) => (
            <li key={f.name} className="flex items-center gap-2">
              <span className="flex-1 truncate">{f.name}</span>
              <span className="shrink-0 text-zinc-400">
                {formatSize(f.size)}
              </span>
              <button
                onClick={() => handleRemove(f.name)}
                aria-label={`Remove ${f.name}`}
                className="shrink-0 text-zinc-400 hover:text-red-600"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
