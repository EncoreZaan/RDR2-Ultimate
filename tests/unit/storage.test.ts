import { describe, expect, it } from 'vitest';
import {
  BackupError,
  createBackup,
  DEFAULT_SETTINGS,
  isSafeTileTemplate,
  MemoryStore,
  parseBackup,
  PROGRESS_DOC,
  Repository,
  sanitizePins,
  sanitizeProgress,
  sanitizeSettings,
  SETTINGS_DOC,
  type DocSpec,
  type StorageEvent,
} from '../../src/core/storage.ts';

describe('sanitizeSettings', () => {
  it('returns defaults for garbage', () => {
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('nope')).toEqual(DEFAULT_SETTINGS);
  });
  it('clamps numbers and rejects unknown enum values', () => {
    const s = sanitizeSettings({ markerSize: 50, stackSize: -3, language: 'de', basemap: 'evil', markerFilter: 'weekly' });
    expect(s.markerSize).toBe(1.8);
    expect(s.stackSize).toBe(1);
    expect(s.language).toBe('fr');
    expect(s.basemap).toBe('rockstar');
    expect(s.markerFilter).toBe('weekly');
  });
  it('keeps only valid hex colours and cycle numbers', () => {
    const s = sanitizeSettings({ categoryColors: { egg: '#ffffff', coin: 'red' }, manualCycles: { egg: 3, coin: 9 } });
    expect(s.categoryColors).toEqual({ egg: '#ffffff' });
    expect(s.manualCycles).toEqual({ egg: 3 });
  });
  it('refuses unsafe tile templates', () => {
    expect(sanitizeSettings({ customTileUrl: 'javascript:alert(1)/{z}/{x}/{y}' }).customTileUrl).toBe('');
    expect(isSafeTileTemplate('http://x.test/{z}/{x}/{y}.png')).toBe(false);
    expect(isSafeTileTemplate('https://x.test/{z}/{x}_{y}.webp')).toBe(true);
    expect(isSafeTileTemplate('/tiles/{z}/{x}/{y}.jpg')).toBe(true);
    expect(isSafeTileTemplate('https://x.test/{z}/{x}.png')).toBe(false);
  });
});

describe('sanitizeProgress / sanitizePins', () => {
  it('drops invalid entries', () => {
    const p = sanitizeProgress({ collected: { a: '2026-01-01T00:00:00Z', b: 'not a date', c: 4 }, inventory: { x: 3, y: -1, z: 500, w: 'a' } });
    expect(p.collected).toEqual({ a: '2026-01-01T00:00:00Z' });
    expect(p.inventory).toEqual({ x: 3, z: 99 });
  });
  it('sanitises pins and truncates long text', () => {
    const doc = sanitizePins({ pins: [{ lat: 1, lng: 2, title: 'x'.repeat(200), color: 'nope' }, { lat: 'a' }] });
    expect(doc.pins).toHaveLength(1);
    expect(doc.pins[0]!.title).toHaveLength(80);
    expect(doc.pins[0]!.color).toBe('#c8a24a');
    expect(doc.pins[0]!.id).toBeTruthy();
  });
});

describe('Repository', () => {
  const fixedNow = () => new Date('2026-11-03T10:00:00Z');

  it('round-trips a document', () => {
    const store = new MemoryStore();
    const repo = new Repository(store, undefined, fixedNow);
    const progress = { collected: { m1: '2026-11-03T09:00:00.000Z' }, inventory: { egg: 2 } };
    expect(repo.save(PROGRESS_DOC, progress)).toBe(true);
    expect(new Repository(store).load(PROGRESS_DOC)).toEqual(progress);
    expect((JSON.parse(store.getItem('rdr2u:progress')!) as { schema: number }).schema).toBe(1);
  });

  it('backs up corrupted documents instead of deleting them', () => {
    const store = new MemoryStore();
    store.setItem('rdr2u:settings', '{not json');
    const events: StorageEvent[] = [];
    const repo = new Repository(store, (e) => events.push(e), fixedNow);
    expect(repo.load(SETTINGS_DOC)).toEqual(DEFAULT_SETTINGS);
    expect(store.getItem(`rdr2u:settings:corrupt:${fixedNow().getTime()}`)).toBe('{not json');
    expect(events[0]?.type).toBe('corrupt-backed-up');
    expect(repo.corruptBackups()).toHaveLength(1);
  });

  it('refuses documents written by a newer schema (and keeps them)', () => {
    const store = new MemoryStore();
    store.setItem('rdr2u:progress', JSON.stringify({ schema: 99, data: {} }));
    const repo = new Repository(store, undefined, fixedNow);
    expect(repo.load(PROGRESS_DOC)).toEqual({ collected: {}, inventory: {} });
    expect(repo.corruptBackups()).toHaveLength(1);
  });

  it('runs migrations in order', () => {
    const store = new MemoryStore();
    store.setItem('rdr2u:demo', JSON.stringify({ schema: 1, data: { n: 1 } }));
    const spec: DocSpec<{ n: number }> = {
      name: 'demo',
      schema: 3,
      sanitize: (raw) => ({ n: typeof raw === 'object' && raw && 'n' in raw ? Number((raw).n) : 0 }),
      migrations: { 1: (d) => ({ n: (d as { n: number }).n + 10 }), 2: (d) => ({ n: (d as { n: number }).n * 2 }) },
    };
    expect(new Repository(store).load(spec)).toEqual({ n: 22 });
  });

  it('reports write failures (quota exceeded)', () => {
    const store = new MemoryStore();
    store.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    const events: StorageEvent[] = [];
    const repo = new Repository(store, (e) => events.push(e));
    expect(repo.save(PROGRESS_DOC, { collected: {}, inventory: {} })).toBe(false);
    expect(events[0]).toMatchObject({ type: 'write-failed', doc: 'progress' });
  });
});

describe('backup files', () => {
  it('round-trips export/import', () => {
    const b = createBackup({ ...DEFAULT_SETTINGS, language: 'en' }, { collected: {}, inventory: { egg: 1 } }, { pins: [] });
    const parsed = parseBackup(JSON.stringify(b));
    expect(parsed.settings.language).toBe('en');
    expect(parsed.progress.inventory).toEqual({ egg: 1 });
  });
  it('rejects foreign or broken files', () => {
    expect(() => parseBackup('{')).toThrow(BackupError);
    expect(() => parseBackup('{"format":"other"}')).toThrow(/not-a-backup/);
    expect(() => parseBackup(JSON.stringify({ format: 'rdr2-collectors-ultimate-backup', version: 2 }))).toThrow(/unsupported/);
  });
});
