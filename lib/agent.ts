import { ToolLoopAgent } from 'ai';
import { INSTRUCTIONS } from './instructions';
import { bashTool } from './tools';
import { Sandbox } from '@vercel/sandbox';
import path from 'path';
import fs from 'fs/promises';

const sandbox = await Sandbox.create();

const MODEL = 'minimax/minimax-m3.1-flash';

await loadSandboxFiles(sandbox);

export const agent = new ToolLoopAgent({
  model: MODEL,
  instructions: INSTRUCTIONS,
  tools: {
    bashTool
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