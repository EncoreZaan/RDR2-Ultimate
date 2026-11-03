import { describe, expect, it } from 'vitest';
import { computeStats, isCollected, pruneCollected, setInventory, toggleCollected, visibleMarkers } from '../../src/core/progress.ts';
import type { CollectiblesFile, CycleGroup, CycleNumber, MarkerData } from '../../src/data/types.ts';
import { CYCLE_GROUPS } from '../../src/data/types.ts';

const marker = (id: string, category: string, cycle: CycleNumber, itemId: string | null): MarkerData => ({
  id,
  text: id,
  category,
  itemId,
  cycle,
  lat: -50,
  lng: 100,
  tool: 0,
  height: 0,
});
const cycles = (n: CycleNumber) => Object.fromEntries(CYCLE_GROUPS.map((g) => [g, n])) as Record<CycleGroup, CycleNumber>;
const groups = new Map<string, CycleGroup>([
  ['egg', 'egg'],
  ['random', 'random'],
]);
const opts = { now: new Date('2026-11-03T12:00:00Z'), today: '2026-11-03', resetDaily: true, autoInventory: true, stackSize: 10 };

describe('collected state', () => {
  const egg = marker('egg_1', 'egg', 1, 'provision_duck_egg');

  it('toggles and follows the inventory', () => {
    let p = toggleCollected({ collected: {}, inventory: {} }, egg, opts);
    expect(isCollected(p, 'egg_1', '2026-11-03', true)).toBe(true);
    expect(p.inventory['provision_duck_egg']).toBe(1);
    p = toggleCollected(p, egg, opts);
    expect(isCollected(p, 'egg_1', '2026-11-03', true)).toBe(false);
    expect(p.inventory['provision_duck_egg']).toBeUndefined();
  });

  it('does not touch the inventory for random spots or when disabled', () => {
    const r = marker('random_1', 'random', 1, null);
    expect(toggleCollected({ collected: {}, inventory: {} }, r, opts).inventory).toEqual({});
    expect(toggleCollected({ collected: {}, inventory: {} }, egg, { ...opts, autoInventory: false }).inventory).toEqual({});
  });

  it('respects the stack size', () => {
    const p = toggleCollected({ collected: {}, inventory: { provision_duck_egg: 10 } }, egg, opts);
    expect(p.inventory['provision_duck_egg']).toBe(10);
  });

  it('expires collected marks the next UTC day only when daily reset is on', () => {
    const p = { collected: { egg_1: '2026-11-02T23:59:00.000Z' }, inventory: {} };
    expect(isCollected(p, 'egg_1', '2026-11-03', true)).toBe(false);
    expect(isCollected(p, 'egg_1', '2026-11-03', false)).toBe(true);
    expect(pruneCollected(p, '2026-11-03').collected).toEqual({});
    const same = { collected: { egg_1: '2026-11-03T01:00:00.000Z' }, inventory: {} };
    expect(pruneCollected(same, '2026-11-03')).toBe(same);
  });

  it('clamps inventory values', () => {
    expect(setInventory({ collected: {}, inventory: {} }, 'x', 150).inventory['x']).toBe(99);
    expect(setInventory({ collected: {}, inventory: { x: 2 } }, 'x', -1).inventory['x']).toBeUndefined();
  });
});

describe('visibleMarkers', () => {
  const list = [marker('a_1', 'egg', 1, 'duck'), marker('a_2', 'egg', 2, 'duck'), marker('b_1', 'egg', 1, 'goose'), marker('r_1', 'random', 1, null)];
  const base = { cycles: cycles(1), categoryGroups: groups, hiddenCategories: new Set<string>(), filter: 'all' as const, weeklyItems: new Set<string>(), inventory: {} };

  it('keeps only the active cycle', () => {
    expect(visibleMarkers(list, base).map((m) => m.id)).toEqual(['a_1', 'b_1', 'r_1']);
  });
  it('hides categories', () => {
    expect(visibleMarkers(list, { ...base, hiddenCategories: new Set(['random']) }).map((m) => m.id)).toEqual(['a_1', 'b_1']);
  });
  it('filters weekly items', () => {
    expect(visibleMarkers(list, { ...base, filter: 'weekly', weeklyItems: new Set(['goose']) }).map((m) => m.id)).toEqual(['b_1']);
  });
  it('filters missing items but keeps random spots', () => {
    expect(visibleMarkers(list, { ...base, filter: 'missing', inventory: { duck: 1 } }).map((m) => m.id)).toEqual(['b_1', 'r_1']);
  });
});

describe('computeStats', () => {
  const data: CollectiblesFile = {
    schema: 1,
    upstreamCommit: 'x',
    generatedAt: 'x',
    categories: [],
    collections: [{ id: 'egg', value: 100, itemIds: ['duck', 'goose'] }],
    items: [
      { id: 'duck', collection: 'egg', price: 10 },
      { id: 'goose', collection: 'egg', price: 20 },
    ],
    markers: [],
  };
  it('computes value, ownership and complete sets', () => {
    const active = [marker('a_1', 'egg', 1, 'duck'), marker('b_1', 'egg', 1, 'goose')];
    const st = computeStats(data, active, { collected: { a_1: '2026-11-03T01:00:00Z' }, inventory: { duck: 3, goose: 2 } }, '2026-11-03', true);
    expect(st.todayCollected).toBe(1);
    expect(st.todayTotal).toBe(2);
    expect(st.itemsOwned).toBe(2);
    expect(st.inventoryValue).toBe(70);
    expect(st.collections[0]!.completeSets).toBe(2);
    expect(st.completeSetsValue).toBe(200);
  });
});
