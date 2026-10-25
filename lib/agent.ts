import { ToolLoopAgent, type LanguageModel } from 'ai';
import { INSTRUCTIONS } from './instructions';
import { bashTool } from './tools';

// A new agent for every request, with that user's model and key
export function createAgent(model: LanguageModel) {
  return new ToolLoopAgent({
    model,
    instructions: INSTRUCTIONS,
    tools: {
      bashTool
    }
  });
}
