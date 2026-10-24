import { clear, createStore, del, keys, set, values } from 'idb-keyval';

export type DocFile = {
  name: string;
  path: string;
  text: string;
  size: number;
  addedAt: number;
};

// Lazy: the database is only opened on first use, so this is safe during SSR
const store = createStore('ask-your-docs', 'files');

const TYPES = ['.txt', '.md', '.csv', '.json'];
const MAX_FILES = 20;
const MAX_SIZE = 1024 * 1024;

export async function listFiles(): Promise<DocFile[]> {
  const files = await values<DocFile>(store);
  // IndexedDB returns them in key (name) order; keep the order they were added
  return files.sort((a, b) => a.addedAt - b.addedAt);
}

// notes.md -> notes (2).md -> notes (3).md ...
function uniqueName(name: string, taken: string[]) {
  if (!taken.includes(name)) return name;
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let n = 2;
  while (taken.includes(`${base} (${n})${ext}`)) n++;
  return `${base} (${n})${ext}`;
}

export async function addFile(file: File): Promise<DocFile> {
  const lower = file.name.toLowerCase();
  if (!TYPES.some((type) => lower.endsWith(type))) {
    throw new Error(`${file.name}: only ${TYPES.join(' ')} files`);
  }
  if (file.size > MAX_SIZE) {
    throw new Error(`${file.name}: larger than 1 MB`);
  }
  const taken = await keys<string>(store);
  if (taken.length >= MAX_FILES) {
    throw new Error(`${file.name}: limit is ${MAX_FILES} files`);
  }

  const name = uniqueName(file.name, taken);
  const doc: DocFile = {
    name,
    path: `/docs/${name}`,
    text: await file.text(),
    size: file.size,
    addedAt: Date.now()
  };
  await set(name, doc, store);
  return doc;
}

export function removeFile(name: string) {
  return del(name, store);
}

export function clearFiles() {
  return clear(store);
}
