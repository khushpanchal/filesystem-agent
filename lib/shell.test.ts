import { describe, expect, it } from 'vitest';
import type { DocFile } from './files';
import { runCommand } from './shell';

function doc(name: string, text: string): DocFile {
  return { name, path: `/docs/${name}`, text, size: text.length, addedAt: 0 };
}

const files = [
  doc('a.txt', 'hello world\nOur Pricing is simple.\npricing tiers: free, pro'),
  doc('b notes.md', 'Meeting notes\nPRICING page due Friday'),
  doc('data.csv', 'name,plan\nacme,pro\nglobex,free')
];

describe('runCommand', () => {
  it('finds matches with file names and line numbers', async () => {
    const r = await runCommand('grep -rn pricing /docs', files);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('/docs/a.txt:3:pricing tiers: free, pro');
    expect(r.truncated).toBe(false);
  });

  it('supports -i, pipes and names with spaces', async () => {
    const r = await runCommand('grep -rli pricing /docs | sort', files);
    expect(r.stdout.trim().split('\n')).toEqual([
      '/docs/a.txt',
      '/docs/b notes.md'
    ]);
  });

  it('starts in /docs and lists the files', async () => {
    const r = await runCommand('pwd && ls', files);
    expect(r.stdout).toContain('/docs');
    expect(r.stdout).toContain('data.csv');
  });

  it('returns exit code 1 when grep finds nothing', async () => {
    const r = await runCommand('grep -rn zebra /docs', files);
    expect(r.exitCode).toBe(1);
    expect(r.stdout).toBe('');
  });

  it('reports unknown commands instead of throwing', async () => {
    const r = await runCommand('foo', files);
    expect(r.exitCode).toBe(127);
    expect(r.stderr).toContain('command not found');
  });

  it('has no network', async () => {
    const r = await runCommand('curl -s https://example.com', files);
    expect(r.exitCode).not.toBe(0);
  });

  it('throws away writes between commands', async () => {
    await runCommand('echo hi > /docs/x.txt', files);
    const r = await runCommand('ls /docs', files);
    expect(r.stdout).not.toContain('x.txt');
  });

  it('cuts long output and sets truncated', async () => {
    const r = await runCommand('seq 1 5000', files);
    expect(r.stdout.length).toBe(8000);
    expect(r.truncated).toBe(true);
  });

  it('works with no files', async () => {
    const r = await runCommand('ls /docs', []);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toBe('');
  });
});
