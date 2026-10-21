import { ToolLoopAgent } from 'ai';

const MODEL = 'minimax/minimax-m3.1-flash';

export const agent = new ToolLoopAgent({
  model: MODEL,
  instructions: '',
  tools: {}
});
