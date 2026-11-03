/**
 * Reliable local persistence on top of localStorage.
 *
 * - Every document is stored under a versioned key with a schema number.
 * - Values are validated/sanitised on read; unknown fields are dropped.
 * - A corrupted document is NEVER silently discarded: it is copied to a
 *   `…:corrupt:<timestamp>` backup key before defaults are used.
 * - Writes are guarded (quota errors, private mode) and reported to a listener.
 */
import type { CycleGroup, CycleNumber } from '../data/types.ts';
import { CYCLE_GROUPS } from '../data/types.ts';

export const STORAGE_PREFIX = 'rdr2u';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  readonly length: number;
  key(index: number): string | null;
}

/** In-memory fallback when localStorage is unavailable (e.g. blocked cookies). */
export class MemoryStore implements KeyValueStore {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  get length(): number {
    return this.map.size;
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
}

export function detectStore(): { store: KeyValueStore; persistent: boolean } {
  try {
    const ls = globalThis.localStorage;
    const probe = `${STORAGE_PREFIX}:probe`;
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return { store: ls, persistent: true };
  } catch {
    return { store: new MemoryStore(), persistent: false };
  }
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export type Language = 'fr' | 'en';
export type BasemapId = 'rockstar' | 'schematic' | 'custom';
export type CollectedDisplay = 'fade' | 'hide';
export type MarkerFilter = 'all' | 'weekly' | 'missing';

export interface Overlays {
  treasures: boolean;
  legendary: boolean;
  fastTravel: boolean;
  nazar: boolean;
  roads: boolean;
  pins: boolean;
}

export interface MapView {
  lat: number;
  lng: number;
  zoom: number;
}

export interface Settings {
  language: Language;
  basemap: BasemapId;
  customTileUrl: string;
  liveData: boolean;
  markerSize: number;
  markerOpacity: number;
  collectedDisplay: CollectedDisplay;
  resetCollectedDaily: boolean;
  autoInventory: boolean;
  stackSize: number;
  markerFilter: MarkerFilter;
  showToolBadges: boolean;
  overlays: Overlays;
  /** Categories hidden by the user (everything else is shown). */
  hiddenCategories: string[];
  categoryColors: Record<string, string>;
  manualCycles: Partial<Record<CycleGroup, CycleNumber>> | null;
  weeklySetOverride: string | null;
  nazarOverride: string | null;
  mapView: MapView | null;
  reducedMotion: boolean;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  language: 'fr',
  basemap: 'rockstar',
  customTileUrl: '',
  liveData: true,
  markerSize: 1,
  markerOpacity: 1,
  collectedDisplay: 'fade',
  resetCollectedDaily: true,
  autoInventory: true,
  stackSize: 10,
  markerFilter: 'all',
  showToolBadges: true,
  overlays: { treasures: false, legendary: false, fastTravel: true, nazar: true, roads: false, pins: true },
  hiddenCategories: [],
  categoryColors: {},
  manualCycles: null,
  weeklySetOverride: null,
  nazarOverride: null,
  mapView: null,
  reducedMotion: false,
});

export interface Progress {
  /** markerId -> ISO timestamp of when it was marked collected. */
  collected: Record<string, string>;
  /** itemId -> amount in the player's inventory. */
  inventory: Record<string, number>;
}

export const EMPTY_PROGRESS: Readonly<Progress> = Object.freeze({ collected: {}, inventory: {} });

export interface Pin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  note: string;
  color: string;
  createdAt: string;
}

export interface PinsDoc {
  pins: Pin[];
}

// ---------------------------------------------------------------------------
// Sanitisers (never throw; coerce or fall back to defaults)
// ---------------------------------------------------------------------------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const pick = <T extends string>(v: unknown, allowed: readonly T[], d: T): T =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : d;
const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d);
const num = (v: unknown, d: number, min: number, max: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d;
const str = (v: unknown, d: string, max = 2000): string => (typeof v === 'string' ? v.slice(0, max) : d);
const HEX = /^#[0-9a-f]{6}$/i;

export function sanitizeSettings(raw: unknown): Settings {
  const r = isObj(raw) ? raw : {};
  const d = DEFAULT_SETTINGS;
  const ov = isObj(r['overlays']) ? r['overlays'] : {};
  const colors: Record<string, string> = {};
  if (isObj(r['categoryColors'])) {
    for (const [k, v] of Object.entries(r['categoryColors'])) if (typeof v === 'string' && HEX.test(v)) colors[k] = v;
  }
  let manual: Settings['manualCycles'] = null;
  if (isObj(r['manualCycles'])) {
    const m: Partial<Record<CycleGroup, CycleNumber>> = {};
    for (const g of CYCLE_GROUPS) {
      const v = r['manualCycles'][g];
      if (v === 1 || v === 2 || v === 3 || v === 4 || v === 5 || v === 6) m[g] = v;
    }
    manual = Object.keys(m).length ? m : null;
  }
  let mapView: MapView | null = null;
  if (isObj(r['mapView'])) {
    const mv = r['mapView'];
    if (typeof mv['lat'] === 'number' && typeof mv['lng'] === 'number' && typeof mv['zoom'] === 'number') {
      mapView = { lat: num(mv['lat'], -70, -200, 50), lng: num(mv['lng'], 110, -50, 250), zoom: num(mv['zoom'], 3, 2, 7) };
    }
  }
  const customTileUrl = str(r['customTileUrl'], '', 500);
  return {
    language: pick(r['language'], ['fr', 'en'] as const, d.language),
    basemap: pick(r['basemap'], ['rockstar', 'schematic', 'custom'] as const, d.basemap),
    customTileUrl: customTileUrl === '' || isSafeTileTemplate(customTileUrl) ? customTileUrl : '',
    liveData: bool(r['liveData'], d.liveData),
    markerSize: num(r['markerSize'], d.markerSize, 0.6, 1.8),
    markerOpacity: num(r['markerOpacity'], d.markerOpacity, 0.2, 1),
    collectedDisplay: pick(r['collectedDisplay'], ['fade', 'hide'] as const, d.collectedDisplay),
    resetCollectedDaily: bool(r['resetCollectedDaily'], d.resetCollectedDaily),
    autoInventory: bool(r['autoInventory'], d.autoInventory),
    stackSize: Math.round(num(r['stackSize'], d.stackSize, 1, 99)),
    markerFilter: pick(r['markerFilter'], ['all', 'weekly', 'missing'] as const, d.markerFilter),
    showToolBadges: bool(r['showToolBadges'], d.showToolBadges),
    overlays: {
      treasures: bool(ov['treasures'], d.overlays.treasures),
      legendary: bool(ov['legendary'], d.overlays.legendary),
      fastTravel: bool(ov['fastTravel'], d.overlays.fastTravel),
      nazar: bool(ov['nazar'], d.overlays.nazar),
      roads: bool(ov['roads'], d.overlays.roads),
      pins: bool(ov['pins'], d.overlays.pins),
    },
    hiddenCategories: Array.isArray(r['hiddenCategories'])
      ? [...new Set(r['hiddenCategories'].filter((x): x is string => typeof x === 'string'))]
      : [],
    categoryColors: colors,
    manualCycles: manual,
    weeklySetOverride: typeof r['weeklySetOverride'] === 'string' ? r['weeklySetOverride'] : null,
    nazarOverride: typeof r['nazarOverride'] === 'string' ? r['nazarOverride'] : null,
    mapView,
    reducedMotion: bool(r['reducedMotion'], d.reducedMotion),
  };
}

/** Only https (or same-origin relative) Leaflet templates containing {z}, {x} and {y}. */
export function isSafeTileTemplate(url: string): boolean {
  if (!/\{z\}/.test(url) || !/\{x\}/.test(url) || !/\{y\}/.test(url)) return false;
  if (url.startsWith('/') && !url.startsWith('//')) return true;
  try {
    const u = new URL(url.replace(/[{}]/g, ''));
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function sanitizeProgress(raw: unknown): Progress {
  const r = isObj(raw) ? raw : {};
  const collected: Record<string, string> = {};
  if (isObj(r['collected'])) {
    for (const [k, v] of Object.entries(r['collected'])) {
      if (typeof v === 'string' && !Number.isNaN(Date.parse(v))) collected[k] = v;
    }
  }
  const inventory: Record<string, number> = {};
  if (isObj(r['inventory'])) {
    for (const [k, v] of Object.entries(r['inventory'])) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) inventory[k] = Math.min(99, Math.round(v));
    }
  }
  return { collected, inventory };
}

export function sanitizePins(raw: unknown): PinsDoc {
  const r = isObj(raw) ? raw : {};
  const pins: Pin[] = [];
  if (Array.isArray(r['pins'])) {
    for (const p of r['pins']) {
      if (!isObj(p) || typeof p['lat'] !== 'number' || typeof p['lng'] !== 'number') continue;
      if (!Number.isFinite(p['lat']) || !Number.isFinite(p['lng'])) continue;
      pins.push({
        id: str(p['id'], '', 64) || cryptoId(),
        lat: p['lat'],
        lng: p['lng'],
        title: str(p['title'], '', 80),
        note: str(p['note'], '', 1000),
        color: typeof p['color'] === 'string' && HEX.test(p['color']) ? p['color'] : '#c8a24a',
        createdAt: typeof p['createdAt'] === 'string' ? p['createdAt'] : new Date(0).toISOString(),
      });
    }
  }
  return { pins: pins.slice(0, 2000) };
}

export function cryptoId(): string {
  const c = globalThis.crypto;
  if (c && 'randomUUID' in c) return c.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export interface DocSpec<T> {
  name: string;
  schema: number;
  sanitize: (raw: unknown) => T;
  /** Migrations from older schema numbers: schema -> function(data) => data of schema+1. */
  migrations?: Record<number, (data: unknown) => unknown>;
}

export const SETTINGS_DOC: DocSpec<Settings> = { name: 'settings', schema: 1, sanitize: sanitizeSettings };
export const PROGRESS_DOC: DocSpec<Progress> = { name: 'progress', schema: 1, sanitize: sanitizeProgress };
export const PINS_DOC: DocSpec<PinsDoc> = { name: 'pins', schema: 1, sanitize: sanitizePins };

export type StorageEvent =
  | { type: 'write-failed'; doc: string; error: string }
  | { type: 'corrupt-backed-up'; doc: string; backupKey: string };

interface Envelope {
  schema: number;
  savedAt: string;
  data: unknown;
}

export class Repository {
  constructor(
    private readonly store: KeyValueStore,
    private readonly onEvent: (e: StorageEvent) => void = () => {},
    private readonly now: () => Date = () => new Date(),
  ) {}

  key(name: string): string {
    return `${STORAGE_PREFIX}:${name}`;
  }

  load<T>(spec: DocSpec<T>): T {
    const key = this.key(spec.name);
    const raw = this.store.getItem(key);
    if (raw === null) return spec.sanitize(undefined);
    try {
      const env = JSON.parse(raw) as unknown;
      if (!isObj(env) || typeof env['schema'] !== 'number' || !('data' in env)) throw new Error('bad envelope');
      let data: unknown = env['data'];
      let schema = env['schema'];
      if (schema > spec.schema) throw new Error(`document from a newer app version (schema ${schema})`);
      while (schema < spec.schema) {
        const migrate = spec.migrations?.[schema];
        if (!migrate) throw new Error(`no migration from schema ${schema}`);
        data = migrate(data);
        schema++;
      }
      return spec.sanitize(data);
    } catch {
      const backupKey = `${key}:corrupt:${this.now().getTime()}`;
      try {
        this.store.setItem(backupKey, raw);
        this.onEvent({ type: 'corrupt-backed-up', doc: spec.name, backupKey });
      } catch {
        /* ignore: nothing more we can do */
      }
      return spec.sanitize(undefined);
    }
  }

  save<T>(spec: DocSpec<T>, data: T): boolean {
    const env: Envelope = { schema: spec.schema, savedAt: this.now().toISOString(), data };
    try {
      this.store.setItem(this.key(spec.name), JSON.stringify(env));
      return true;
    } catch (err) {
      this.onEvent({ type: 'write-failed', doc: spec.name, error: err instanceof Error ? err.message : String(err) });
      return false;
    }
  }

  remove(spec: DocSpec<unknown>): void {
    this.store.removeItem(this.key(spec.name));
  }

  /** Keys of corrupted-document backups, for the settings screen. */
  corruptBackups(): string[] {
    const out: string[] = [];
    for (let i = 0; i < this.store.length; i++) {
      const k = this.store.key(i);
      if (k?.startsWith(`${STORAGE_PREFIX}:`) && k.includes(':corrupt:')) out.push(k);
    }
    return out.sort();
  }
}

// ---------------------------------------------------------------------------
// Export / import (backup file)
// ---------------------------------------------------------------------------

export const BACKUP_FORMAT = 'rdr2-collectors-ultimate-backup';

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: 1;
  exportedAt: string;
  settings: Settings;
  progress: Progress;
  pins: PinsDoc;
}

export function createBackup(settings: Settings, progress: Progress, pins: PinsDoc, now = new Date()): BackupFile {
  return { format: BACKUP_FORMAT, version: 1, exportedAt: now.toISOString(), settings, progress, pins };
}

export class BackupError extends Error {}

export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('invalid-json');
  }
  if (!isObj(raw) || raw['format'] !== BACKUP_FORMAT) throw new BackupError('not-a-backup');
  if (raw['version'] !== 1) throw new BackupError('unsupported-version');
  return {
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: str(raw['exportedAt'], ''),
    settings: sanitizeSettings(raw['settings']),
    progress: sanitizeProgress(raw['progress']),
    pins: sanitizePins(raw['pins']),
  };
}
