import { ToolLoopAgent } from 'ai';
import { Sandbox } from '@vercel/sandbox';
import { createBashTool } from './tools';

const sandbox = await Sandbox.create();

const MODEL = 'minimax/minimax-m3.1-flash';

export const agent = new ToolLoopAgent({
  model: MODEL,
  instructions: '',
  tools: {
    bashTool: createBashTool(sandbox)
  }
});
