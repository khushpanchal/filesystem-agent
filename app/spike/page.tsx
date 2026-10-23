'use client';

// S1-01 spike (throwaway): can just-bash run grep over in-memory files in the browser?

import { useState } from 'react';

const FILES = {
  '/docs/a.txt': [
    'hello world',
    'Our Pricing is simple.',
    'Three plans are available.',
    'pricing tiers: free, pro, team',
    'hello again'
  ].join('\n'),
  '/docs/b notes.txt': [
    'Meeting notes',
    'Action items for next week',
    'PRICING page draft is due Friday'
  ].join('\n')
};

type Result = { stdout: string; stderr: string; exitCode: number };

export default function Spike() {
  const [command, setCommand] = useState('grep -rn hello /docs');
  const [result, setResult] = useState<Result | null>(null);

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    // Loaded on first run only, so the ~400 KB bundle stays out of the initial page load
    const { Bash } = await import('just-bash');
    // A new instance per command: any write (e.g. `> /docs/x.txt`) is thrown away afterwards
    const bash = new Bash({
      files: FILES,
      cwd: '/docs',
      executionLimitProfile: 'hardened'
    });
    const r = await bash.exec(command);
    setResult({ stdout: r.stdout, stderr: r.stderr, exitCode: r.exitCode });
  };

  return (
    <div className="min-h-screen p-8">
      <main className="mx-auto max-w-2xl space-y-4 font-mono text-sm">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            className="flex-1 border px-4 py-2"
          />
          <button type="submit" className="bg-black px-4 py-2 text-white">
            Run
          </button>
        </form>

        {result && (
          <div className="space-y-2">
            <div className="text-xs font-bold">exit code: {result.exitCode}</div>
            <pre className="overflow-x-auto p-2 text-green-600">
              {result.stdout || '(no stdout)'}
            </pre>
            {result.stderr && (
              <pre className="overflow-x-auto p-2 text-red-600">
                {result.stderr}
              </pre>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
