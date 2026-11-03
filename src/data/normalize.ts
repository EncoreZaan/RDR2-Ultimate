/**
 * Pure functions that validate the raw upstream files (jeanropke/RDR2CollectorsMap)
 * and turn them into our compact, typed data model. Used by:
 *  - scripts/build-data.ts (at build time)
 *  - scripts/sync-upstream.ts (to reject a broken upstream update before it lands)
 *  - unit tests
 *
 * Every function throws a `DataValidationError` with a precise path on bad input.
 */
import type {
  AreaOfInterest,
  BasemapFile,
  Category,
  Collection,
  CollectiblesFile,
  CycleDay,
  CycleGroup,
  CycleNumber,
  CyclesFile,
  GameStrings,
  Item,
  MarkerData,
  NazarLocation,
  PointOfInterest,
  RoadRegion,
  WeeklySet,
  WorldFile,
} from './types.ts';

export class DataValidationError extends Error {
  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = 'DataValidationError';
  }
}

type Json = unknown;

function isRecord(v: Json): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function expectRecord(v: Json, path: string): Record<string, unknown> {
  if (!isRecord(v)) throw new DataValidationError(path, 'expected an object');
  return v;
}
function expectArray(v: Json, path: string): unknown[] {
  if (!Array.isArray(v)) throw new DataValidationError(path, 'expected an array');
  return v;
}
function expectString(v: Json, path: string): string {
  if (typeof v !== 'string' || v.length === 0)
    throw new DataValidationError(path, 'expected a non-empty string');
  return v;
}
function expectNumber(v: Json, path: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v))
    throw new DataValidationError(path, 'expected a finite number');
  return v;
}

/** Map coordinate bounds used by the upstream map (L.CRS.Simple). Generous margin. */
const LAT_RANGE: [number, number] = [-200, 25];
const LNG_RANGE: [number, number] = [-50, 250];
function expectCoord(lat: Json, lng: Json, path: string): [number, number] {
  const la = expectNumber(lat, `${path}.lat`);
  const ln = expectNumber(lng, `${path}.lng`);
  if (la < LAT_RANGE[0] || la > LAT_RANGE[1] || ln < LNG_RANGE[0] || ln > LNG_RANGE[1])
    throw new DataValidationError(path, `coordinate out of map bounds (${la}, ${ln})`);
  return [round(la, 4), round(ln, 4)];
}

export function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function expectCycle(v: Json, path: string): CycleNumber {
  const n = typeof v === 'string' ? Number(v) : v;
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5 || n === 6) return n;
  throw new DataValidationError(path, `expected a cycle number 1-6, got ${JSON.stringify(v)}`);
}

/** Category -> cycle group (mirrors upstream `Cycles.getTodayCycle`). */
export const CATEGORY_CYCLE_GROUP: Readonly<Record<string, CycleGroup>> = {
  flower: 'flower',
  cups: 'tarot_cards',
  pentacles: 'tarot_cards',
  swords: 'tarot_cards',
  wands: 'tarot_cards',
  jewelry_random: 'lost_jewelry',
  bracelet: 'lost_jewelry',
  earring: 'lost_jewelry',
  necklace: 'lost_jewelry',
  ring: 'lost_jewelry',
  bottle: 'bottle',
  egg: 'egg',
  arrowhead: 'arrowhead',
  heirlooms: 'heirlooms',
  coin: 'coin',
  fossils_random: 'fossils',
  random: 'random',
};

/** Categories whose markers are random spots rather than a specific item. */
const RANDOM_CATEGORIES = new Set(['random', 'fossils_random', 'jewelry_random', 'arrowhead', 'coin']);

/** Collections that are fed by a different marker category. */
const COLLECTION_TO_CATEGORY: Readonly<Record<string, string>> = {
  coastal: 'fossils_random',
  oceanic: 'fossils_random',
  megafauna: 'fossils_random',
};

/** Splits an upstream marker `text` into item id and optional index (upstream `Marker` regex). */
export function parseMarkerText(text: string): { itemId: string; index: number | null } {
  const m = /^(.+?)(?:_(\d+))?$/.exec(text);
  if (!m?.[1]) return { itemId: text, index: null };
  return { itemId: m[1], index: m[2] !== undefined ? Number(m[2]) : null };
}

export function normalizeCollections(raw: Json): { collections: Collection[]; items: Item[] } {
  const list = expectArray(raw, 'items_value');
  const collections: Collection[] = [];
  const items: Item[] = [];
  list.forEach((c, i) => {
    const path = `items_value[${i}]`;
    const rec = expectRecord(c, path);
    const id = expectString(rec['category'], `${path}.category`);
    const value = expectNumber(rec['price'], `${path}.price`);
    const itemsList = expectArray(rec['itemsList'], `${path}.itemsList`);
    const itemIds: string[] = [];
    itemsList.forEach((it, j) => {
      const r = expectRecord(it, `${path}.itemsList[${j}]`);
      const itemId = expectString(r['itemId'], `${path}.itemsList[${j}].itemId`);
      const price = expectNumber(r['price'], `${path}.itemsList[${j}].price`);
      itemIds.push(itemId);
      items.push({ id: itemId, collection: id, price });
    });
    if (itemIds.length === 0) throw new DataValidationError(path, 'collection without items');
    collections.push({ id, value, itemIds });
  });
  if (collections.length < 10) throw new DataValidationError('items_value', 'too few collections');
  return { collections, items };
}

export function normalizeMarkers(raw: Json, items: Item[]): { categories: Category[]; markers: MarkerData[] } {
  const root = expectRecord(raw, 'items');
  const itemIndex = new Set(items.map((i) => i.id));
  const categories: Category[] = [];
  const markers: MarkerData[] = [];
  const seen = new Set<string>();

  for (const [categoryId, byCycle] of Object.entries(root)) {
    const cycleGroup = CATEGORY_CYCLE_GROUP[categoryId];
    if (!cycleGroup) throw new DataValidationError(`items.${categoryId}`, 'unknown category (no cycle mapping)');
    const cycles = expectRecord(byCycle, `items.${categoryId}`);
    for (const [cycleKey, list] of Object.entries(cycles)) {
      const cycle = expectCycle(cycleKey, `items.${categoryId}.${cycleKey}`);
      expectArray(list, `items.${categoryId}.${cycleKey}`).forEach((m, i) => {
        const path = `items.${categoryId}.${cycleKey}[${i}]`;
        const r = expectRecord(m, path);
        const text = expectString(r['text'], `${path}.text`);
        const [lat, lng] = expectCoord(r['lat'], r['lng'], path);
        const { itemId } = parseMarkerText(text);
        const tool = r['tool'] ?? 0;
        if (tool !== 0 && tool !== 1 && tool !== 2) throw new DataValidationError(`${path}.tool`, 'expected 0, 1 or 2');
        const height = r['height'] ?? 0;
        if (height !== -1 && height !== 0 && height !== 1)
          throw new DataValidationError(`${path}.height`, 'expected -1, 0 or 1');
        const id = `${text}_${cycle}`;
        if (seen.has(id)) throw new DataValidationError(path, `duplicate marker id ${id}`);
        seen.add(id);
        const marker: MarkerData = {
          id,
          text,
          category: categoryId,
          itemId: itemIndex.has(itemId) ? itemId : null,
          cycle,
          lat,
          lng,
          tool: tool,
          height: height,
        };
        const video = r['video'];
        if (typeof video === 'string' && /^https:\/\/(www\.)?youtube\.com\//.test(video)) marker.video = video;
        const spotType = r['type'];
        if (typeof spotType === 'string' && spotType) marker.spotType = spotType;
        markers.push(marker);
      });
    }
    const itemIds = items
      .filter((it) => (COLLECTION_TO_CATEGORY[it.collection] ?? it.collection) === categoryId)
      .map((it) => it.id);
    categories.push({ id: categoryId, cycleGroup, random: RANDOM_CATEGORIES.has(categoryId), itemIds });
  }
  if (markers.length < 500) throw new DataValidationError('items', `suspiciously few markers (${markers.length})`);
  return { categories, markers };
}

export function normalizeCollectibles(
  rawItems: Json,
  rawItemsValue: Json,
  upstreamCommit: string,
  generatedAt: string,
): CollectiblesFile {
  const { collections, items } = normalizeCollections(rawItemsValue);
  const { categories, markers } = normalizeMarkers(rawItems, items);
  return { schema: 1, upstreamCommit, generatedAt, categories, collections, items, markers };
}

const RAW_CYCLE_KEYS: Readonly<Record<CycleGroup, string>> = {
  flower: 'flower',
  tarot_cards: 'tarot_cards',
  lost_jewelry: 'lost_jewelry',
  bottle: 'bottle',
  egg: 'egg',
  arrowhead: 'arrowhead',
  heirlooms: 'heirlooms',
  coin: 'coin',
  fossils: 'fossils',
  random: 'random',
};

export function normalizeCycles(raw: Json): CyclesFile {
  const list = expectArray(raw, 'cycles');
  const days: CycleDay[] = list.map((d, i) => {
    const path = `cycles[${i}]`;
    const r = expectRecord(d, path);
    const date = expectString(r['date'], `${path}.date`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new DataValidationError(`${path}.date`, 'expected YYYY-MM-DD');
    const cycles = {} as Record<CycleGroup, CycleNumber>;
    for (const [group, key] of Object.entries(RAW_CYCLE_KEYS) as [CycleGroup, string][]) {
      cycles[group] = expectCycle(r[key], `${path}.${key}`);
    }
    return { date, cycles };
  });
  days.sort((a, b) => a.date.localeCompare(b.date));
  for (let i = 1; i < days.length; i++) {
    if (days[i]?.date === days[i - 1]?.date) throw new DataValidationError('cycles', `duplicate date ${days[i]?.date}`);
  }
  if (days.length === 0) throw new DataValidationError('cycles', 'empty calendar');
  return { schema: 1, days };
}

function normalizeArea(raw: Json, path: string, idKey: string): AreaOfInterest {
  const r = expectRecord(raw, path);
  const id = expectString(r[idKey], `${path}.${idKey}`);
  const [lat, lng] = expectCoord(r['x'], r['y'], path);
  const radius = expectNumber(r['radius'], `${path}.radius`);
  const locations = expectArray(r['locations'] ?? [], `${path}.locations`).map((l, i) => {
    const lr = expectRecord(l, `${path}.locations[${i}]`);
    const [la, ln] = expectCoord(lr['x'], lr['y'], `${path}.locations[${i}]`);
    return { id: typeof lr['text'] === 'string' ? lr['text'] : `${id}_${i}`, lat: la, lng: ln };
  });
  return { id, lat, lng, radius, locations };
}

/** Upstream Nazar keys (MPSW_LOCATION_xx) by location id, from upstream nazar.js. */
export const NAZAR_KEYS: Readonly<Record<string, string>> = {
  rio: 'MPSW_LOCATION_00',
  cho: 'MPSW_LOCATION_01',
  hen: 'MPSW_LOCATION_02',
  tal: 'MPSW_LOCATION_03',
  bgv: 'MPSW_LOCATION_04',
  hrt_e: 'MPSW_LOCATION_05',
  hrt_w: 'MPSW_LOCATION_06',
  grz: 'MPSW_LOCATION_07',
  scm: 'MPSW_LOCATION_08',
  blu: 'MPSW_LOCATION_09',
  der: 'MPSW_LOCATION_10',
  bbr: 'MPSW_LOCATION_11',
};

export function normalizeWorld(raw: {
  weeklySets: Json;
  treasures: Json;
  legendary: Json;
  fastTravel: Json;
  nazar: Json;
}): WorldFile {
  const sets = expectRecord(expectRecord(raw.weeklySets, 'weekly_sets')['sets'], 'weekly_sets.sets');
  const weeklySets: WeeklySet[] = Object.entries(sets).map(([id, s]) => {
    const r = expectRecord(s, `weekly_sets.sets.${id}`);
    const itemIds = expectArray(r['items'], `weekly_sets.sets.${id}.items`).map((x, i) =>
      expectString(x, `weekly_sets.sets.${id}.items[${i}]`),
    );
    return { id, value: expectNumber(r['value'], `weekly_sets.sets.${id}.value`), itemIds };
  });
  const treasures = expectArray(raw.treasures, 'treasures').map((t, i) => normalizeArea(t, `treasures[${i}]`, 'text'));
  const legendaryAnimals = expectArray(raw.legendary, 'animal_legendary').map((t, i) =>
    normalizeArea(t, `animal_legendary[${i}]`, 'text'),
  );
  const fastTravel: PointOfInterest[] = expectArray(raw.fastTravel, 'fasttravels').map((f, i) => {
    const r = expectRecord(f, `fasttravels[${i}]`);
    const [lat, lng] = expectCoord(r['x'], r['y'], `fasttravels[${i}]`);
    return { id: expectString(r['text'], `fasttravels[${i}].text`), lat, lng };
  });
  const nazar: NazarLocation[] = expectArray(raw.nazar, 'nazar').map((n, i) => {
    const r = expectRecord(n, `nazar[${i}]`);
    const id = expectString(r['id'], `nazar[${i}].id`);
    const [lat, lng] = expectCoord(r['x'], r['y'], `nazar[${i}]`);
    const key = NAZAR_KEYS[id];
    if (!key) throw new DataValidationError(`nazar[${i}].id`, `unknown Nazar location ${id}`);
    return { id, key, lat, lng };
  });
  return { schema: 1, weeklySets, treasures, legendaryAnimals, fastTravel, nazar };
}

/** Converts a GeoJSON LineString FeatureCollection ([lng, lat] pairs) into flat [lat, lng, ...] arrays. */
export function geojsonToLines(raw: Json, path: string, decimals = 2): number[][] {
  const fc = expectRecord(raw, path);
  const features = expectArray(fc['features'], `${path}.features`);
  const out: number[][] = [];
  features.forEach((f, i) => {
    const g = expectRecord(expectRecord(f, `${path}.features[${i}]`)['geometry'], `${path}.features[${i}].geometry`);
    const coords = expectArray(g['coordinates'], `${path}.features[${i}].geometry.coordinates`);
    const flat: number[] = [];
    let prev: string | null = null;
    for (const c of coords) {
      if (!Array.isArray(c) || typeof c[0] !== 'number' || typeof c[1] !== 'number') continue;
      const lat = round(c[1], decimals);
      const lng = round(c[0], decimals);
      const key = `${lat},${lng}`;
      if (key === prev) continue;
      prev = key;
      flat.push(lat, lng);
    }
    if (flat.length >= 4) out.push(flat);
  });
  return out;
}

export function centroid(lines: number[][]): [number, number] {
  let sLat = 0;
  let sLng = 0;
  let n = 0;
  for (const line of lines) {
    for (let i = 0; i + 1 < line.length; i += 2) {
      sLat += line[i] ?? 0;
      sLng += line[i + 1] ?? 0;
      n++;
    }
  }
  return n === 0 ? [0, 0] : [round(sLat / n, 2), round(sLng / n, 2)];
}

export function normalizeBasemap(regions: Record<string, Json>, railroads: Json): BasemapFile {
  const out: RoadRegion[] = Object.entries(regions).map(([id, raw]) => {
    const lines = geojsonToLines(raw, `geojson/${id}`);
    return { id, label: centroid(lines), lines };
  });
  return {
    schema: 1,
    bounds: [
      [-144, 0],
      [0, 176],
    ],
    regions: out,
    railroads: geojsonToLines(railroads, 'geojson/railroads'),
  };
}

/**
 * Cleans an upstream translation string: removes the `{int.xxx}` link placeholders
 * and any HTML markup. The app always renders game strings as plain text.
 */
export function cleanString(s: string): string {
  return s
    .replace(/\{[a-z0-9_.-]+\}/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Returns the translation keys our UI needs for the given data. */
export function requiredStringKeys(c: CollectiblesFile, w: WorldFile): Set<string> {
  const keys = new Set<string>();
  for (const cat of c.categories) keys.add(`menu.${cat.id}`);
  for (const col of c.collections) keys.add(`menu.${col.id}`);
  for (const it of c.items) keys.add(`${it.id}.name`);
  for (const m of c.markers) {
    keys.add(`${m.id}.desc`);
    keys.add(`${m.text}.desc`);
    keys.add(`${parseMarkerText(m.text).itemId}.name`);
  }
  for (const s of w.weeklySets) keys.add(`weekly.desc.${s.id}`).add(`weekly.flavor.${s.id}`);
  for (const t of w.treasures) keys.add(`${t.id}.name`).add(t.id);
  for (const l of w.legendaryAnimals) keys.add(l.id).add(`${l.id}.desc`);
  for (const f of w.fastTravel) keys.add(`${f.id}.name`);
  [
    'map.flower_type.night_only',
    'map.flower_type.bush',
    'map.egg_type.tree',
    'map.egg_type.stump',
    'map.egg_type.ground',
    'map.random_spot_metal_detector_chest.desc',
    'map.random_spot_metal_detector_shallow.desc',
    'map.random_spot_shovel.desc',
    'arrowhead_random.desc',
    'coin_random.desc',
    'fossils_random.desc',
    'jewelry_random.desc',
    'random_item.name',
    'menu.random_spots',
    'menu.coastal',
    'menu.oceanic',
    'menu.megafauna',
  ].forEach((k) => keys.add(k));
  return keys;
}

/** Filters and cleans a full upstream language file down to the keys we use. */
export function extractStrings(raw: Json, keys: Set<string>, path: string): GameStrings {
  const dict = expectRecord(raw, path);
  const out: GameStrings = {};
  for (const k of [...keys].sort()) {
    const v = dict[k];
    if (typeof v === 'string') {
      const cleaned = cleanString(v);
      if (cleaned) out[k] = cleaned;
    }
  }
  return out;
}
