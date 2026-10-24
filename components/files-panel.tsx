'use client';

import { useState } from 'react';

type DocFile = { name: string; size: number; text: string };

function formatSize(size: number) {
  if (size < 1024) return `${size} B`;
  return `${(size / 1024).toFixed(1)} KB`;
}

export function FilesPanel() {
  const [files, setFiles] = useState<DocFile[]>([]);

  // Shared by the file picker and the drop zone
  async function addFiles(list: FileList | null) {
    if (!list) return;
    const added = await Promise.all(
      Array.from(list).map(async (file) => ({
        name: file.name,
        size: file.size,
        text: await file.text()
      }))
    );
    setFiles((prev) => [...prev, ...added]);
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
    <div className="space-y-4 p-4 font-mono text-sm">
      <div className="text-xs font-bold uppercase">Files</div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="space-y-2 border-2 border-dashed p-4 text-center text-zinc-500"
      >
        <div>Drop .txt .md .csv .json here</div>
        <label className="inline-block cursor-pointer bg-black px-3 py-1 text-white">
          Choose files
          <input
            type="file"
            multiple
            accept=".txt,.md,.csv,.json"
            onChange={handleChange}
            className="hidden"
          />
        </label>
      </div>

      {files.length === 0 ? (
        <div className="text-xs text-zinc-400">No files yet</div>
      ) : (
        <ul className="space-y-1">
          {files.map((f) => (
            <li key={f.name} className="flex justify-between gap-2">
              <span className="truncate">{f.name}</span>
              <span className="shrink-0 text-zinc-400">
                {formatSize(f.size)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
