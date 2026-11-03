import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  cleanString,
  DataValidationError,
  geojsonToLines,
  normalizeCollectibles,
  normalizeCollections,
  normalizeCycles,
  normalizeMarkers,
  normalizeWorld,
  parseMarkerText,
} from '../../src/data/normalize.ts';

const up = (p: string): unknown => JSON.parse(readFileSync(new URL(`../../upstream/${p}`, import.meta.url), 'utf8'));

describe('parseMarkerText', () => {
  it('splits item id and index like upstream', () => {
    expect(parseMarkerText('provision_eagle_egg_2')).toEqual({ itemId: 'provision_eagle_egg', index: 2 });
    expect(parseMarkerText('provision_duck_egg')).toEqual({ itemId: 'provision_duck_egg', index: null });
    expect(parseMarkerText('arrowhead_random_0')).toEqual({ itemId: 'arrowhead_random', index: 0 });
  });
});

describe('normalizeCollectibles (real upstream snapshot)', () => {
  const data = normalizeCollectibles(up('data/items.json'), up('data/items_value.json'), 'abc', '2026-01-01T00:00:00Z');

  it('keeps every upstream marker', () => {
    const raw = up('data/items.json') as Record<string, Record<string, unknown[]>>;
    const total = Object.values(raw).reduce((n, byCycle) => n + Object.values(byCycle).reduce((m, l) => m + l.length, 0), 0);
    expect(data.markers).toHaveLength(total);
    expect(total).toBeGreaterThan(1500);
  });

  it('has unique marker ids and valid cycles', () => {
    expect(new Set(data.markers.map((m) => m.id)).size).toBe(data.markers.length);
    for (const m of data.markers) expect([1, 2, 3, 4, 5, 6]).toContain(m.cycle);
  });

  it('maps all 17 categories to a cycle group', () => {
    expect(data.categories).toHaveLength(17);
    expect(data.categories.find((c) => c.id === 'cups')?.cycleGroup).toBe('tarot_cards');
    expect(data.categories.find((c) => c.id === 'ring')?.cycleGroup).toBe('lost_jewelry');
    expect(data.categories.find((c) => c.id === 'fossils_random')?.itemIds.length).toBe(20);
  });

  it('links specific items and leaves random spots unlinked', () => {
    const egg = data.markers.find((m) => m.text === 'provision_eagle_egg_1');
    expect(egg?.itemId).toBe('provision_eagle_egg');
    const random = data.markers.find((m) => m.category === 'random');
    expect(random?.itemId).toBeNull();
  });

  it('only keeps YouTube video links', () => {
    for (const m of data.markers) if (m.video) expect(m.video).toMatch(/^https:\/\/(www\.)?youtube\.com\//);
  });
});

describe('validation errors', () => {
  it('rejects unknown categories', () => {
    expect(() => normalizeMarkers({ unicorns: { '1': [] } }, [])).toThrow(DataValidationError);
  });
  it('rejects out-of-bounds coordinates with a precise path', () => {
    const bad = { flower: { '1': [{ text: 'x', lat: 999, lng: 10 }] } };
    expect(() => normalizeMarkers(bad, [])).toThrow(/items\.flower\.1\[0\]/);
  });
  it('rejects invalid cycle numbers', () => {
    expect(() => normalizeCycles([{ date: '2026-01-01', flower: 9 }])).toThrow(DataValidationError);
  });
  it('rejects duplicate dates', () => {
    const day = { date: '2026-01-01', flower: 1, tarot_cards: 1, lost_jewelry: 1, bottle: 1, egg: 1, arrowhead: 1, heirlooms: 1, coin: 1, fossils: 1, random: 1 };
    expect(() => normalizeCycles([day, day])).toThrow(/duplicate/);
  });
  it('rejects a truncated collection list', () => {
    expect(() => normalizeCollections([])).toThrow(/too few/);
  });
});

describe('normalizeCycles (real snapshot)', () => {
  it('sorts days and exposes the 10 cycle groups', () => {
    const c = normalizeCycles(up('data/cycles.json'));
    expect(c.days.length).toBeGreaterThan(7);
    const dates = c.days.map((d) => d.date);
    expect([...dates].sort()).toEqual(dates);
    expect(Object.keys(c.days[0]!.cycles)).toHaveLength(10);
  });
});

describe('normalizeWorld (real snapshot)', () => {
  it('normalises weekly sets, treasures, legendary animals and Nazar', () => {
    const w = normalizeWorld({
      weeklySets: up('data/weekly_sets.json'),
      treasures: up('data/treasures.json'),
      legendary: up('data/animal_legendary.json'),
      fastTravel: up('data/fasttravels.json'),
      nazar: up('data/nazar.json'),
    });
    expect(w.weeklySets.length).toBeGreaterThan(30);
    expect(w.nazar).toHaveLength(12);
    expect(w.nazar.every((n) => n.key.startsWith('MPSW_LOCATION_'))).toBe(true);
    expect(w.treasures[0]?.locations.length).toBeGreaterThan(0);
  });
});

describe('geojsonToLines & cleanString', () => {
  it('flattens [lng, lat] pairs into [lat, lng] and drops duplicate points', () => {
    const fc = { type: 'FeatureCollection', features: [{ geometry: { coordinates: [[10, -20], [10, -20], [11, -21]] } }] };
    expect(geojsonToLines(fc, 'x')).toEqual([[-20, 10, -21, 11]]);
  });
  it('strips placeholders and HTML from upstream strings', () => {
    expect(cleanString('See {int.random_spot.link}this <b>page</b>{int.end.link}.')).toBe('See this page.');
  });
});
