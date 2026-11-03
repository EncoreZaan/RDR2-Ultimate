/**
 * Shared helpers for the upstream tracking scripts (Node >= 22.18, no dependency).
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export const UPSTREAM_REPO = 'jeanropke/RDR2CollectorsMap';
export const UPSTREAM_BRANCH = 'master';
export const UPSTREAM_GIT = `https://github.com/${UPSTREAM_REPO}.git`;

/** Files we vendor from upstream (data only — never upstream code). */
export const TRACKED_FILES = [
  'data/items.json',
  'data/cycles.json',
  'data/items_value.json',
  'data/weekly_sets.json',
  'data/treasures.json',
  'data/animal_legendary.json',
  'data/fasttravels.json',
  'data/nazar.json',
  'data/geojson/ambarino.json',
  'data/geojson/lemoyne.json',
  'data/geojson/new-austin.json',
  'data/geojson/new-hanover.json',
  'data/geojson/west-elizabeth.json',
  'data/geojson/railroads.json',
  'langs/en.json',
  'langs/fr.json',
] as const;

export interface UpstreamMeta {
  repo: string;
  branch: string;
  commit: string;
  syncedAt: string;
}

const run = promisify(execFile);

export async function git(args: string[], cwd?: string): Promise<string> {
  const { stdout } = await run('git', args, { cwd, maxBuffer: 64 * 1024 * 1024 });
  return stdout.trim();
}

export async function latestUpstreamCommit(): Promise<string> {
  const out = await git(['ls-remote', UPSTREAM_GIT, `refs/heads/${UPSTREAM_BRANCH}`]);
  const sha = out.split(/\s+/)[0] ?? '';
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error(`Unexpected ls-remote output: ${out}`);
  return sha;
}

export async function fetchUpstreamFile(commit: string, path: string, attempts = 4): Promise<string> {
  const url = `https://raw.githubusercontent.com/${UPSTREAM_REPO}/${commit}/${path}`;
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.text();
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** i));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** Appends to the GitHub Actions step summary / outputs when running in CI. */
export async function ghSummary(markdown: string): Promise<void> {
  const file = process.env['GITHUB_STEP_SUMMARY'];
  if (!file) return;
  const { appendFile } = await import('node:fs/promises');
  await appendFile(file, `${markdown}\n`);
}

export async function ghOutput(values: Record<string, string>): Promise<void> {
  const file = process.env['GITHUB_OUTPUT'];
  if (!file) return;
  const { appendFile } = await import('node:fs/promises');
  for (const [k, v] of Object.entries(values)) {
    if (v.includes('\n')) await appendFile(file, `${k}<<__EOF__\n${v}\n__EOF__\n`);
    else await appendFile(file, `${k}=${v}\n`);
  }
}
