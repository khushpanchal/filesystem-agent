import type { UIMessage } from 'ai';
import { MAX_OUTPUT, type CommandResult } from '@/lib/shell';

// A bashTool call inside a message, as the AI SDK stores it
type CommandPart = {
  state: string;
  input?: { command?: string };
  output?: CommandResult;
  errorText?: string;
};

export function ChatMessage({ message }: { message: UIMessage }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-bold uppercase">{message.role}</div>
      {message.parts.map((part, i) => {
        if (part.type === 'text') {
          return (
            <div key={i} className="whitespace-pre-wrap">
              {part.text}
            </div>
          );
        }
        if (part.type === 'tool-bashTool') {
          return <Command key={i} part={part as CommandPart} />;
        }
        return null;
      })}
    </div>
  );
}

// Shows a command the AI ran over the files, and what it printed
function Command({ part }: { part: CommandPart }) {
  return (
    <div className="space-y-1 text-blue-600 dark:text-blue-400">
      <code>$ {part.input?.command}</code>
      {part.state === 'output-available' && part.output && (
        <pre className="overflow-x-auto p-2 text-xs text-green-600">
          {part.output.stdout || part.output.stderr || '(no output)'}
          {part.output.truncated &&
            `\n… (cut at ${MAX_OUTPUT.toLocaleString()} characters)`}
        </pre>
      )}
      {part.state === 'output-error' && (
        <pre className="overflow-x-auto p-2 text-xs text-red-600">
          {part.errorText}
        </pre>
      )}
    </div>
  );
}
