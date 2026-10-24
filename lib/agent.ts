import { ToolLoopAgent } from 'ai';
import { INSTRUCTIONS } from './instructions';
import { bashTool } from './tools';

const MODEL = 'minimax/minimax-m3.1-flash';

export const agent = new ToolLoopAgent({
  model: MODEL,
  instructions: INSTRUCTIONS,
  tools: {
    bashTool
  }
});
