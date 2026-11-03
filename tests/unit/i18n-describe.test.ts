import { describe, expect, it } from 'vitest';
import { categoryName, humanize, markerHint, markerName } from '../../src/core/describe.ts';
import { createTranslator, formatMoney, UI_STRINGS } from '../../src/core/i18n.ts';
import type { MarkerData } from '../../src/data/types.ts';

describe('UI strings', () => {
  it('has the same keys in French and English, none empty', () => {
    expect(Object.keys(UI_STRINGS.en).sort()).toEqual(Object.keys(UI_STRINGS.fr).sort());
    for (const lang of ['fr', 'en'] as const) for (const v of Object.values(UI_STRINGS[lang])) expect(v.trim()).not.toBe('');
  });
  it('interpolates parameters', () => {
    expect(createTranslator('fr')('collection.cycle', { n: 4 })).toBe('Cycle 4');
    expect(createTranslator('en')('stats.completeSets', { n: 2 })).toBe('2 complete');
  });
  it('formats money per locale', () => {
    expect(formatMoney(1234.5, 'en')).toBe('$1,234.50');
    expect(formatMoney(12, 'fr')).toMatch(/^\$12,00$/);
  });
});

describe('describe', () => {
  const g = { 'provision_eagle_egg.name': 'Eagle Egg', 'menu.arrowhead': 'Arrowheads', 'map.egg_type.tree': 'In a tree' };
  const m = (p: Partial<MarkerData>): MarkerData => ({ id: 'x_1', text: 'x', category: 'egg', itemId: null, cycle: 1, lat: 0, lng: 0, tool: 0, height: 0, ...p });
  it('names item markers with their index', () => {
    expect(markerName(g, m({ text: 'provision_eagle_egg_2', itemId: 'provision_eagle_egg' }), 'Eggs')).toBe('Eagle Egg #2');
  });
  it('names random spots after the category, 1-based', () => {
    expect(markerName(g, m({ text: 'arrowhead_random_0', category: 'arrowhead' }), 'Arrowheads')).toBe('Arrowheads #1');
  });
  it('gives category hints', () => {
    expect(markerHint(g, m({ itemId: 'provision_eagle_egg' }))).toBe('In a tree');
  });
  it('falls back gracefully', () => {
    expect(categoryName({}, 'random', () => 'Random')).toBe('Random');
    expect(humanize('provision_jewelry_onyx_ring')).toBe('Jewelry Onyx Ring');
  });
});
