/**
 * Synchronises the vendored upstream DATA (never code) from jeanropke/RDR2CollectorsMap.
 *
 *   npm run upstream:sync              # sync to the latest upstream commit
 *   npm run upstream:sync -- --check   # only report, write nothing
 *   npm run upstream:sync -- --commit <sha>
 *
 * Safety: every downloaded file is parsed and validated with the same
 * normalisers as the app (src/data/normalize.ts). If anything is invalid the
 * script exits with code 1 and leaves upstream/ untouched.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  normalizeBasemap,
  normalizeCollectibles,
  normalizeCycles,
  normalizeWorld,
  extractStrings,
  requiredStringKeys,
} from '../src/data/normalize.ts';
import {
  fetchUpstreamFile,
  ghOutput,
  ghSummary,
  latestUpstreamCommit,
  TRACKED_FILES,
  UPSTREAM_BRANCH,
  UPSTREAM_REPO,
  type UpstreamMeta,
} from './upstream-lib.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const upstreamDir = join(root, 'upstream');

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** Validates a full set of upstream files; returns a few figures for the report. */
export function validateUpstream(files: Record<string, string>, commit: string): { markers: number; cyclesFrom: string; cyclesTo: string; strings: number } {
  const j = (p: string): unknown => JSON.parse(files[p] ?? 'null');
  const collectibles = normalizeCollectibles(j('data/items.json'), j('data/items_value.json'), commit, new Date().toISOString());
  const cycles = normalizeCycles(j('data/cycles.json'));
  const world = normalizeWorld({
    weeklySets: j('data/weekly_sets.json'),
    treasures: j('data/treasures.json'),
    legendary: j('data/animal_legendary.json'),
    fastTravel: j('data/fasttravels.json'),
    nazar: j('data/nazar.json'),
  });
  normalizeBasemap(
    Object.fromEntries(['ambarino', 'lemoyne', 'new-austin', 'new-hanover', 'west-elizabeth'].map((r) => [r, j(`data/geojson/${r}.json`)])),
    j('data/geojson/railroads.json'),
  );
  const keys = requiredStringKeys(collectibles, world);
  const en = extractStrings(j('langs/en.json'), keys, 'langs/en');
  extractStrings(j('langs/fr.json'), keys, 'langs/fr');
  if (Object.keys(en).length < 500) throw new Error(`langs/en.json: only ${Object.keys(en).length} usable strings`);
  return { markers: collectibles.markers.length, cyclesFrom: cycles.days[0]!.date, cyclesTo: cycles.days.at(-1)!.date, strings: Object.keys(en).length };
}

async function main(): Promise<void> {
  const checkOnly = process.argv.includes('--check');
  const current = JSON.parse(await readFile(join(upstreamDir, 'UPSTREAM.json'), 'utf8')) as UpstreamMeta;
  const requested = arg('--commit') || process.env['UPSTREAM_COMMIT'] || '';
  if (requested && !/^[0-9a-f]{7,40}$/.test(requested)) throw new Error(`Invalid commit SHA: ${requested}`);
  const target = requested || (await latestUpstreamCommit());
  console.log(`Upstream ${UPSTREAM_REPO}@${UPSTREAM_BRANCH}: vendored ${current.commit.slice(0, 7)}, latest ${target.slice(0, 7)}`);

  const files: Record<string, string> = {};
  for (const path of TRACKED_FILES) files[path] = await fetchUpstreamFile(target, path);

  let figures;
  try {
    figures = validateUpstream(files, target);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`✗ Upstream data at ${target} is INVALID — nothing was changed.\n  ${msg}`);
    await ghSummary(`### ❌ Upstream data rejected\n\nCommit \`${target}\` failed validation:\n\n\`\`\`\n${msg}\n\`\`\``);
    await ghOutput({ changed: 'false', valid: 'false' });
    process.exit(1);
  }

  const changed: string[] = [];
  for (const path of TRACKED_FILES) {
    let old = '';
    try {
      old = await readFile(join(upstreamDir, path), 'utf8');
    } catch {
      /* new file */
    }
    if (old !== files[path]) changed.push(path);
  }

  const summary = [
    `### Upstream data sync`,
    ``,
    `- Upstream: [\`${target.slice(0, 7)}\`](https://github.com/${UPSTREAM_REPO}/commit/${target}) (previous: \`${current.commit.slice(0, 7)}\`)`,
    `- Markers: **${figures.markers}** · cycle calendar **${figures.cyclesFrom} → ${figures.cyclesTo}** · strings: ${figures.strings}`,
    `- Changed files: ${changed.length ? changed.map((c) => `\`${c}\``).join(', ') : '_none_'}`,
  ].join('\n');
  console.log(summary);
  await ghSummary(summary);

  if (checkOnly || changed.length === 0) {
    await ghOutput({ changed: 'false', valid: 'true', commit: target });
    console.log(changed.length === 0 ? '✓ Already up to date.' : '✓ Check only — nothing written.');
    return;
  }

  for (const path of changed) {
    await mkdir(dirname(join(upstreamDir, path)), { recursive: true });
    await writeFile(join(upstreamDir, path), files[path]!);
  }
  const meta: UpstreamMeta = { repo: UPSTREAM_REPO, branch: UPSTREAM_BRANCH, commit: target, syncedAt: new Date().toISOString() };
  await writeFile(join(upstreamDir, 'UPSTREAM.json'), `${JSON.stringify(meta)}\n`);
  await ghOutput({ changed: 'true', valid: 'true', commit: target, files: changed.join(' '), cycles_to: figures.cyclesTo });
  console.log(`✓ Updated ${changed.length} file(s). Run \`npm run build\` and the tests before committing.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
