import type { DocFile } from './files';

export type CommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
  truncated: boolean;
};

// The whole tool output goes back to the AI on every request, so keep it small
export const MAX_OUTPUT = 8000;

function cut(text: string) {
  return text.length > MAX_OUTPUT ? text.slice(0, MAX_OUTPUT) : text;
}

// Runs one bash command over the saved files, mounted at /docs/<name>.
// Never throws: errors come back as stderr + a non-zero exit code.
export async function runCommand(
  command: string,
  files: DocFile[]
): Promise<CommandResult> {
  try {
    // Loaded on first use only, so the ~400 KB bundle stays out of the page load
    const { Bash } = await import('just-bash');
    // A new instance per command: anything a command writes is thrown away
    const bash = new Bash({
      files: Object.fromEntries(files.map((f) => [f.path, f.text])),
      cwd: '/docs',
      executionLimitProfile: 'hardened'
    });
    const result = await bash.exec(command);
    return {
      stdout: cut(result.stdout),
      stderr: cut(result.stderr),
      exitCode: result.exitCode,
      truncated:
        result.stdout.length > MAX_OUTPUT || result.stderr.length > MAX_OUTPUT
    };
  } catch (e) {
    return {
      stdout: '',
      stderr: `runCommand failed: ${(e as Error).message}`,
      exitCode: 1,
      truncated: false
    };
  }
}
