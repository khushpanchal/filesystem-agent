import { ToolLoopAgent } from 'ai';
import { createBashTool } from './tools';
import { Sandbox } from '@vercel/sandbox';
import path from 'path';
import fs from 'fs/promises';

const INSTRUCTIONS = `
You are a helpful assistant that answers questions about customer calls.

Only use bashTool when the user's message needs information from the files. For greetings, thanks or small talk (for example "hi"), reply briefly in text without using any tool.

When you do need the files, start with one targeted search (for example grep) instead of reading every file. Using the information you find, craft a response for the user and output it as text.
`;

const sandbox = await Sandbox.create();

const MODEL = 'minimax/minimax-m3.1-flash';

await loadSandboxFiles(sandbox);

export const agent = new ToolLoopAgent({
  model: MODEL,
  instructions: INSTRUCTIONS,
  tools: {
    bashTool: createBashTool(sandbox)
  }
});

async function loadSandboxFiles(sandbox: Sandbox) {
  const callsDir = path.join(process.cwd(), 'lib', 'calls');
  const callFiles = await fs.readdir(callsDir);

  for (const file of callFiles) {
    const filePath = path.join(callsDir, file);
    const buffer = await fs.readFile(filePath);
    await sandbox.writeFiles([{ path: `calls/${file}`, content: buffer }]);
  }
}