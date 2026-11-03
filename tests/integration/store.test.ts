// @vitest-environment jsdom
/**
 * Integration: real generated data (public/data) + store + localStorage persistence.
 * Requires `npm run data` (done by `npm test` via pretest).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function mockFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL) => {
      const url = String(input);
      const m = /data\/(.+)$/.exec(url);
      if (!m) return new Response('offline', { status: 503 });
      try {
        return new Response(readFileSync(join(process.cwd(), 'public', 'data', m[1]!), 'utf8'));
      } catch {
        return new Response('not found', { status: 404 });
      }
    }),
  );
}

/** A day in the middle of the generated calendar (the upstream calendar is a sliding window). */
const cal = JSON.parse(readFileSync(join(process.cwd(), 'public', 'data', 'cycles.json'), 'utf8')) as { days: { date: string }[] };
const DAY = cal.days[Math.floor(cal.days.length / 2)]!.date;
const NEXT_DAY = cal.days[Math.floor(cal.days.length / 2) + 1]!.date;

async function freshStore() {
  vi.resetModules();
  return import('../../src/state/store.ts');
}

describe('store integration', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${DAY}T12:00:00Z`));
  });

  it('loads data, resolves today’s cycles and shows one cycle per category', async () => {
    const s = await freshStore();
    await s.loadData();
    expect(s.loadState.value).toBe('ready');
    expect(s.resolved.value.source).toBe('calendar');
    const markers = s.cycleMarkers.value;
    expect(markers.length).toBeGreaterThan(150);
    for (const m of markers) {
      const group = s.categoryGroups.value.get(m.category)!;
      expect(m.cycle).toBe(s.resolved.value.cycles[group]);
    }
    expect(Object.keys(s.gameStrings.value).length).toBeGreaterThan(500);
  });

  it('persists collected markers and inventory across a reload', async () => {
    let s = await freshStore();
    await s.loadData();
    const m = s.cycleMarkers.value.find((x) => x.itemId !== null)!;
    s.toggleMarker(m);
    expect(s.markerIsCollected(m.id)).toBe(true);
    expect(s.progress.value.inventory[m.itemId!]).toBe(1);
    s.updateSettings({ language: 'en', hiddenCategories: ['random'] });
    s.flushSettings();

    s = await freshStore(); // simulates closing and reopening the app
    await s.loadData();
    expect(s.markerIsCollected(m.id)).toBe(true);
    expect(s.progress.value.inventory[m.itemId!]).toBe(1);
    expect(s.settings.value.language).toBe('en');
    expect(s.shownMarkers.value.some((x) => x.category === 'random')).toBe(false);
  });

  it('expires collected markers after the UTC day changes (daily reset)', async () => {
    let s = await freshStore();
    await s.loadData();
    const m = s.cycleMarkers.value[0]!;
    s.toggleMarker(m);
    vi.setSystemTime(new Date(`${NEXT_DAY}T00:00:05Z`));
    s = await freshStore();
    expect(s.markerIsCollected(m.id)).toBe(false);
    expect(s.progress.value.collected).toEqual({});
  });

  it('blocks marking when viewing another day', async () => {
    const s = await freshStore();
    await s.loadData();
    s.dayOffset.value = 1;
    const m = s.cycleMarkers.value[0]!;
    s.toggleMarker(m);
    expect(s.markerIsCollected(m.id)).toBe(false);
  });

  it('restores a backup and resets with an automatic backup download', async () => {
    const s = await freshStore();
    await s.loadData();
    const m = s.cycleMarkers.value[0]!;
    s.toggleMarker(m);
    const backup = s.currentBackup();
    const click = vi.fn();
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag);
      if (el instanceof HTMLAnchorElement) el.click = click;
      return el;
    });
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    s.resetProgress('all');
    expect(click).toHaveBeenCalledOnce(); // safety backup before wiping
    expect(s.progress.value.collected).toEqual({});
    s.restoreBackup(backup);
    expect(s.markerIsCollected(m.id)).toBe(true);
  });

  it('uses the manual weekly set and Nazar override', async () => {
    const s = await freshStore();
    await s.loadData();
    s.updateSettings({ weeklySetOverride: 'set_sacred', nazarOverride: 'bgv' });
    expect(s.weeklySet.value?.itemIds).toContain('provision_eagle_egg');
    expect(s.weeklySource.value).toBe('manual');
    expect(s.nazarLocation.value?.key).toBe('MPSW_LOCATION_04');
  });

  it('searches items accent-insensitively in French', async () => {
    const s = await freshStore();
    await s.loadData();
    const hits = s.searchIndex.value.search('oeuf aigle');
    expect(hits[0]?.value).toEqual({ kind: 'item', itemId: 'provision_eagle_egg' });
  });
});
