/**
 * Builds the app's runtime data (public/data/*.json) from the vendored upstream
 * snapshot in upstream/. Run with `npm run data` (Node >= 22.18, native TS).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractStrings,
  normalizeBasemap,
  normalizeCollectibles,
  normalizeCycles,
  normalizeWorld,
  requiredStringKeys,
} from '../src/data/normalize.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const up = (p: string) => join(root, 'upstream', p);
const out = join(root, 'public', 'data');

async function json(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8')) as unknown;
}

export async function buildData(): Promise<Record<string, number>> {
  const meta = (await json(up('UPSTREAM.json'))) as { commit: string; syncedAt: string };
  const collectibles = normalizeCollectibles(
    await json(up('data/items.json')),
    await json(up('data/items_value.json')),
    meta.commit,
    meta.syncedAt,
  );
  const cycles = normalizeCycles(await json(up('data/cycles.json')));
  const world = normalizeWorld({
    weeklySets: await json(up('data/weekly_sets.json')),
    treasures: await json(up('data/treasures.json')),
    legendary: await json(up('data/animal_legendary.json')),
    fastTravel: await json(up('data/fasttravels.json')),
    nazar: await json(up('data/nazar.json')),
  });
  const regions: Record<string, unknown> = {};
  for (const r of ['ambarino', 'new-hanover', 'lemoyne', 'west-elizabeth', 'new-austin']) {
    regions[r] = await json(up(`data/geojson/${r}.json`));
  }
  const basemap = normalizeBasemap(regions, await json(up('data/geojson/railroads.json')));
  const keys = requiredStringKeys(collectibles, world);

  await mkdir(join(out, 'i18n'), { recursive: true });
  const files: Record<string, unknown> = {
    'collectibles.json': collectibles,
    'cycles.json': cycles,
    'world.json': world,
    'basemap.json': basemap,
    'i18n/en.json': extractStrings(await json(up('langs/en.json')), keys, 'langs/en'),
    'i18n/fr.json': extractStrings(await json(up('langs/fr.json')), keys, 'langs/fr'),
    'meta.json': {
      schema: 1,
      upstreamCommit: meta.commit,
      syncedAt: meta.syncedAt,
      cyclesFrom: cycles.days[0]?.date,
      cyclesTo: cycles.days.at(-1)?.date,
    },
  };
  const sizes: Record<string, number> = {};
  for (const [name, data] of Object.entries(files)) {
    const text = JSON.stringify(data);
    sizes[name] = text.length;
    await writeFile(join(out, name), text);
  }
  return sizes;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildData()
    .then((sizes) => {
      for (const [k, v] of Object.entries(sizes)) console.log(`  public/data/${k.padEnd(20)} ${(v / 1024).toFixed(1)} KiB`);
      console.log('Data build OK');
    })
    .catch((err: unknown) => {
      console.error('Data build FAILED:', err instanceof Error ? err.message : err);
      process.exit(1);
    });
}
