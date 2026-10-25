import { tool } from 'ai';
import { z } from 'zod';

// No execute: the agent loop stops here and the browser runs the command
// over the user's saved files (components/chat.tsx → lib/shell.ts)
export const bashTool = tool({
  description: `
    Run one bash command line over the user's documents in /docs.
    Pipes work. Examples: grep -rni "pricing" /docs, ls /docs, sed -n '10,30p' /docs/notes.md
    `,
  inputSchema: z.object({
    command: z
      .string()
      .describe('The full command line, e.g. grep -rni "pricing" /docs')
  })
});
