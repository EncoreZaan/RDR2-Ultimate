import { batch, computed, effect, signal } from '@preact/signals';
import type {
  BasemapFile,
  CollectiblesFile,
  CycleDay,
  CycleGroup,
  CyclesFile,
  GameStrings,
  MarkerData,
  WorldFile,
} from '../data/types.ts';
import { calendarNeedsRefresh, mergeCalendars, resolveCycles } from '../core/cycles.ts';
import { categoryName, itemName, markerName } from '../core/describe.ts';
import { createTranslator, type UiKey } from '../core/i18n.ts';
import { fetchNazar, fetchUpstreamCycles, fetchWeekly } from '../core/live.ts';
import { computeStats, isCollected, pruneCollected, setInventory, toggleCollected, visibleMarkers } from '../core/progress.ts';
import { SearchIndex, type SearchEntry } from '../core/search.ts';
import {
  createBackup,
  cryptoId,
  detectStore,
  PINS_DOC,
  PROGRESS_DOC,
  Repository,
  SETTINGS_DOC,
  sanitizeSettings,
  type BackupFile,
  type Pin,
  type PinsDoc,
  type Progress,
  type Settings,
} from '../core/storage.ts';
import { nazarDateString, utcDateString } from '../core/time.ts';
import { CATEGORY_COLORS } from '../map/icons.ts';

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const detected = detectStore();
export const storageIsPersistent = detected.persistent;
export const toasts = signal<Toast[]>([]);

export interface Toast {
  id: string;
  text: string;
  kind: 'info' | 'success' | 'warning' | 'error';
  action?: { label: string; run: () => void };
  sticky?: boolean;
}

export function toast(text: string, kind: Toast['kind'] = 'info', extra: Partial<Toast> = {}): string {
  const t: Toast = { id: cryptoId(), text, kind, ...extra };
  toasts.value = [...toasts.value.filter((x) => x.text !== text), t].slice(-4);
  if (!t.sticky) setTimeout(() => dismissToast(t.id), 5000);
  return t.id;
}
export function dismissToast(id: string): void {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

const repo = new Repository(detected.store, (e) => {
  if (e.type === 'write-failed') toast(t.value('settings.saveFailed'), 'error');
});

export const settings = signal<Settings>(repo.load(SETTINGS_DOC));
export const progress = signal<Progress>(repo.load(PROGRESS_DOC));
export const pinsDoc = signal<PinsDoc>(repo.load(PINS_DOC));
export const corruptBackups = signal<string[]>(repo.corruptBackups());

export const t = computed(() => createTranslator(settings.value.language));

let settingsTimer: ReturnType<typeof setTimeout> | undefined;
effect(() => {
  const s = settings.value;
  clearTimeout(settingsTimer);
  settingsTimer = setTimeout(() => repo.save(SETTINGS_DOC, s), 250);
});
effect(() => {
  repo.save(PROGRESS_DOC, progress.value);
});
effect(() => {
  repo.save(PINS_DOC, pinsDoc.value);
});
/** Flushes the debounced settings write (page hide / tests). */
export function flushSettings(): void {
  clearTimeout(settingsTimer);
  repo.save(SETTINGS_DOC, settings.value);
}

export function updateSettings(patch: Partial<Settings>): void {
  settings.value = { ...settings.value, ...patch };
}

// Live data cache (survives reloads so offline sessions keep the last known values).
interface LiveCache {
  weekly?: { id: string; fetchedAt: string };
  nazar?: { key: string; date: string };
  cycles?: CycleDay[];
}
const LIVE_KEY = 'rdr2u:live';
function loadLive(): LiveCache {
  try {
    const raw = detected.store.getItem(LIVE_KEY);
    return raw ? (JSON.parse(raw) as LiveCache) : {};
  } catch {
    return {};
  }
}
const liveCache = signal<LiveCache>(loadLive());
effect(() => {
  try {
    detected.store.setItem(LIVE_KEY, JSON.stringify(liveCache.value));
  } catch {
    /* non critical */
  }
});

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

export interface DataMeta {
  upstreamCommit: string;
  syncedAt: string;
}

export const collectibles = signal<CollectiblesFile | null>(null);
export const world = signal<WorldFile | null>(null);
export const basemap = signal<BasemapFile | null>(null);
export const localCalendar = signal<CycleDay[]>([]);
export const meta = signal<DataMeta | null>(null);
export const gameStrings = signal<GameStrings>({});
export const loadState = signal<'loading' | 'ready' | 'error'>('loading');

const base = import.meta.env.BASE_URL;

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${base}data/${path}`);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function loadGameStrings(lang: Settings['language']): Promise<void> {
  try {
    gameStrings.value = await getJson<GameStrings>(`i18n/${lang}.json`);
  } catch {
    if (lang !== 'en') gameStrings.value = await getJson<GameStrings>('i18n/en.json');
  }
}

export async function loadData(): Promise<void> {
  loadState.value = 'loading';
  try {
    const [c, w, cy, m] = await Promise.all([
      getJson<CollectiblesFile>('collectibles.json'),
      getJson<WorldFile>('world.json'),
      getJson<CyclesFile>('cycles.json'),
      getJson<DataMeta>('meta.json'),
      loadGameStrings(settings.value.language),
    ]);
    batch(() => {
      collectibles.value = c;
      world.value = w;
      localCalendar.value = cy.days;
      meta.value = m;
      loadState.value = 'ready';
    });
    // The basemap is large and not needed for the first paint.
    getJson<BasemapFile>('basemap.json')
      .then((b) => (basemap.value = b))
      .catch(() => {});
  } catch (err) {
    console.error(err);
    loadState.value = 'error';
  }
}

// ---------------------------------------------------------------------------
// Time & cycles
// ---------------------------------------------------------------------------

export const now = signal(new Date());
export const today = computed(() => utcDateString(now.value));
export const dayOffset = signal(0);
export const selectedDate = computed(() => {
  const d = new Date(`${today.value}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dayOffset.value);
  return utcDateString(d);
});
export const isViewingToday = computed(() => dayOffset.value === 0);

export const calendar = computed(() => mergeCalendars(localCalendar.value, liveCache.value.cycles ?? []));
const liveDates = computed(() => {
  const local = new Set(localCalendar.value.map((d) => d.date));
  return new Set((liveCache.value.cycles ?? []).map((d) => d.date).filter((d) => !local.has(d)));
});
export const resolved = computed(() =>
  resolveCycles(calendar.value, selectedDate.value, settings.value.manualCycles, liveDates.value),
);

// Day rollover: prune collected entries and refresh live data.
effect(() => {
  const day = today.value;
  if (settings.peek().resetCollectedDaily) {
    const pruned = pruneCollected(progress.peek(), day);
    if (pruned !== progress.peek()) progress.value = pruned;
  }
});

// ---------------------------------------------------------------------------
// Derived collection state
// ---------------------------------------------------------------------------

export const categoryGroups = computed(
  () => new Map<string, CycleGroup>((collectibles.value?.categories ?? []).map((c) => [c.id, c.cycleGroup])),
);

export const markerById = computed(() => new Map((collectibles.value?.markers ?? []).map((m) => [m.id, m])));

export const weeklyId = computed(() => settings.value.weeklySetOverride ?? liveCache.value.weekly?.id ?? null);
export const weeklySource = computed<'manual' | 'live' | 'unknown'>(() =>
  settings.value.weeklySetOverride ? 'manual' : liveCache.value.weekly ? 'live' : 'unknown',
);
export const weeklySet = computed(() => world.value?.weeklySets.find((s) => s.id === weeklyId.value) ?? null);
export const weeklyItems = computed(() => new Set(weeklySet.value?.itemIds ?? []));

export const nazarLocation = computed(() => {
  const w = world.value;
  if (!w) return null;
  if (settings.value.nazarOverride) return w.nazar.find((n) => n.id === settings.value.nazarOverride) ?? null;
  const live = liveCache.value.nazar;
  if (live && live.date === nazarDateString(now.value)) return w.nazar.find((n) => n.key === live.key) ?? null;
  return null;
});
export const nazarSource = computed<'manual' | 'live' | 'unknown'>(() =>
  settings.value.nazarOverride ? 'manual' : nazarLocation.value ? 'live' : 'unknown',
);

const hiddenSet = computed(() => new Set(settings.value.hiddenCategories));

/** Markers of the selected day's cycles for every category (ignores filters) — used for counts. */
export const cycleMarkers = computed(() => {
  const data = collectibles.value;
  if (!data) return [];
  return visibleMarkers(data.markers, {
    cycles: resolved.value.cycles,
    categoryGroups: categoryGroups.value,
    hiddenCategories: new Set(),
    filter: 'all',
    weeklyItems: weeklyItems.value,
    inventory: {},
  });
});

/** Markers shown on the map (categories + filter applied). */
export const shownMarkers = computed(() => {
  const data = collectibles.value;
  if (!data) return [];
  return visibleMarkers(data.markers, {
    cycles: resolved.value.cycles,
    categoryGroups: categoryGroups.value,
    hiddenCategories: hiddenSet.value,
    filter: settings.value.markerFilter,
    weeklyItems: weeklyItems.value,
    inventory: progress.value.inventory,
  });
});

export function markerIsCollected(id: string): boolean {
  return isCollected(progress.value, id, today.value, settings.value.resetCollectedDaily);
}

export const stats = computed(() => {
  const data = collectibles.value;
  if (!data) return null;
  return computeStats(data, cycleMarkers.value, progress.value, today.value, settings.value.resetCollectedDaily);
});

export function categoryColor(id: string): string {
  return settings.value.categoryColors[id] ?? CATEGORY_COLORS[id] ?? '#c8a24a';
}

export const catName = (id: string): string =>
  categoryName(gameStrings.value, id, (x) => (x === 'random' ? t.value('collection.random') : x));

export const nameOfMarker = (m: MarkerData): string => markerName(gameStrings.value, m, catName(m.category));
export const nameOfItem = (id: string): string => itemName(gameStrings.value, id);

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function toggleMarker(m: MarkerData): void {
  if (!isViewingToday.value) {
    toast(t.value('cycle.viewingOther'), 'warning');
    return;
  }
  const s = settings.value;
  progress.value = toggleCollected(progress.value, m, {
    now: new Date(),
    today: today.value,
    resetDaily: s.resetCollectedDaily,
    autoInventory: s.autoInventory,
    stackSize: s.stackSize,
  });
}

export function setCategoryCollected(categoryId: string, collected: boolean): void {
  if (!isViewingToday.value) return;
  for (const m of cycleMarkers.value) {
    if (m.category === categoryId && markerIsCollected(m.id) !== collected) toggleMarker(m);
  }
}

export function changeInventory(itemId: string, delta: number): void {
  const current = progress.value.inventory[itemId] ?? 0;
  progress.value = setInventory(progress.value, itemId, current + delta, settings.value.stackSize);
}

export function toggleCategory(id: string): void {
  const hidden = new Set(settings.value.hiddenCategories);
  if (hidden.has(id)) hidden.delete(id);
  else hidden.add(id);
  updateSettings({ hiddenCategories: [...hidden] });
}

export function setAllCategories(visible: boolean): void {
  updateSettings({ hiddenCategories: visible ? [] : (collectibles.value?.categories ?? []).map((c) => c.id) });
}

export function addPin(lat: number, lng: number, title: string, note = '', color = '#c8a24a'): Pin {
  const pin: Pin = { id: cryptoId(), lat, lng, title, note, color, createdAt: new Date().toISOString() };
  pinsDoc.value = { pins: [...pinsDoc.value.pins, pin] };
  return pin;
}
export function updatePin(pin: Pin): void {
  pinsDoc.value = { pins: pinsDoc.value.pins.map((p) => (p.id === pin.id ? pin : p)) };
}
export function deletePin(id: string): void {
  pinsDoc.value = { pins: pinsDoc.value.pins.filter((p) => p.id !== id) };
}

export function currentBackup(): BackupFile {
  flushSettings();
  return createBackup(settings.value, progress.value, pinsDoc.value);
}

export function downloadBackup(suffix = ''): void {
  const blob = new Blob([JSON.stringify(currentBackup(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rdr2-ultimate-sauvegarde-${today.value}${suffix}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function restoreBackup(b: BackupFile): void {
  batch(() => {
    settings.value = b.settings;
    progress.value = b.progress;
    pinsDoc.value = b.pins;
  });
  flushSettings();
}

export function resetProgress(kind: 'collected' | 'inventory' | 'all'): void {
  downloadBackup('-avant-reinitialisation');
  if (kind === 'collected') progress.value = { ...progress.value, collected: {} };
  else if (kind === 'inventory') progress.value = { ...progress.value, inventory: {} };
  else {
    batch(() => {
      progress.value = { collected: {}, inventory: {} };
      pinsDoc.value = { pins: [] };
      settings.value = sanitizeSettings(undefined);
    });
  }
}

// ---------------------------------------------------------------------------
// Live data
// ---------------------------------------------------------------------------

export const liveBusy = signal(false);

export async function refreshLive(force = false): Promise<void> {
  const w = world.value;
  if (!w || !settings.value.liveData || liveBusy.value) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  liveBusy.value = true;
  try {
    const n = new Date();
    const cache = liveCache.value;
    const tasks: Promise<void>[] = [];
    const weeklyAge = cache.weekly ? n.getTime() - Date.parse(cache.weekly.fetchedAt) : Infinity;
    if (force || weeklyAge > 3 * 3_600_000) {
      tasks.push(
        fetchWeekly(new Set(w.weeklySets.map((s) => s.id))).then((id) => {
          if (id) liveCache.value = { ...liveCache.value, weekly: { id, fetchedAt: new Date().toISOString() } };
        }),
      );
    }
    const nd = nazarDateString(n);
    if (force || cache.nazar?.date !== nd) {
      tasks.push(
        fetchNazar(nd, new Set(w.nazar.map((x) => x.key))).then((key) => {
          if (key) liveCache.value = { ...liveCache.value, nazar: { key, date: nd } };
        }),
      );
    }
    if (force || calendarNeedsRefresh(calendar.value, utcDateString(n))) {
      tasks.push(
        fetchUpstreamCycles().then((c) => {
          if (c) liveCache.value = { ...liveCache.value, cycles: c.days.slice(-60) };
        }),
      );
    }
    await Promise.allSettled(tasks);
  } finally {
    liveBusy.value = false;
  }
}

// ---------------------------------------------------------------------------
// UI state
// ---------------------------------------------------------------------------

export type Tab = 'collection' | 'weekly' | 'map' | 'stats' | 'settings';
export const activeTab = signal<Tab>('collection');
function media(query: string, fallback: boolean): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : fallback;
}
export const sidebarOpen = signal(media('(min-width: 1024px)', true));
export const selectedMarkerId = signal<string | null>(null);
export const selectedPinId = signal<string | null>(null);
export const online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
export const route = signal<MarkerData[] | null>(null);

/** Map commands issued by UI components, consumed by MapView. */
export type MapCommand =
  | { type: 'fly'; lat: number; lng: number; zoom?: number }
  | { type: 'fit'; points: [number, number][] }
  | { type: 'reset' };
export const mapCommand = signal<MapCommand | null>(null);

export function focusMarker(m: MarkerData): void {
  selectedMarkerId.value = m.id;
  mapCommand.value = { type: 'fly', lat: m.lat, lng: m.lng, zoom: 6 };
  if (media('(max-width: 1023px)', false)) sidebarOpen.value = false;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export type SearchHit =
  | { kind: 'item'; itemId: string }
  | { kind: 'category'; categoryId: string }
  | { kind: 'place'; lat: number; lng: number; zoom: number }
  | { kind: 'pin'; pinId: string };

export const searchIndex = computed(() => {
  const data = collectibles.value;
  const w = world.value;
  const g = gameStrings.value;
  if (!data || !w) return new SearchIndex<SearchHit>([]);
  const entries: SearchEntry<SearchHit>[] = [];
  for (const c of data.categories) entries.push({ label: catName(c.id), value: { kind: 'category', categoryId: c.id } });
  for (const it of data.items) {
    const col = data.collections.find((c) => c.id === it.collection);
    entries.push({ label: nameOfItem(it.id), keywords: col ? catName(col.id) : '', value: { kind: 'item', itemId: it.id } });
  }
  for (const f of w.fastTravel) {
    entries.push({ label: g[`${f.id}.name`] ?? f.id, keywords: t.value('map.overlay.fastTravel'), value: { kind: 'place', lat: f.lat, lng: f.lng, zoom: 5 } });
  }
  for (const tr of w.treasures) {
    entries.push({ label: g[`${tr.id}.name`] ?? tr.id, keywords: t.value('map.overlay.treasures'), value: { kind: 'place', lat: tr.lat, lng: tr.lng, zoom: 6 } });
  }
  for (const l of w.legendaryAnimals) {
    entries.push({ label: g[l.id] ?? l.id, keywords: t.value('map.overlay.legendary'), value: { kind: 'place', lat: l.lat, lng: l.lng, zoom: 6 } });
  }
  for (const p of pinsDoc.value.pins) entries.push({ label: p.title || t.value('pin.defaultTitle'), keywords: p.note, value: { kind: 'pin', pinId: p.id } });
  return new SearchIndex(entries);
});

export function translate(key: UiKey, params?: Record<string, string | number>): string {
  return t.value(key, params);
}
