import type { CollectiblesFile, CycleGroup, CycleNumber, MarkerData, WeeklySet } from '../data/types.ts';
import type { MarkerFilter, Progress } from './storage.ts';
import { utcDateString } from './time.ts';

/** A marker counts as collected if it was marked (and, with daily reset, marked on `today`). */
export function isCollected(progress: Progress, markerId: string, today: string, resetDaily: boolean): boolean {
  const ts = progress.collected[markerId];
  if (!ts) return false;
  if (!resetDaily) return true;
  return utcDateString(new Date(ts)) === today;
}

/** Removes collected entries from previous days (daily reset). Returns the same object if unchanged. */
export function pruneCollected(progress: Progress, today: string): Progress {
  let changed = false;
  const collected: Record<string, string> = {};
  for (const [id, ts] of Object.entries(progress.collected)) {
    if (utcDateString(new Date(ts)) === today) collected[id] = ts;
    else changed = true;
  }
  return changed ? { ...progress, collected } : progress;
}

export function setInventory(progress: Progress, itemId: string, amount: number, max = 99): Progress {
  const inventory = { ...progress.inventory };
  const n = Math.max(0, Math.min(max, Math.round(amount)));
  if (n === 0) delete inventory[itemId];
  else inventory[itemId] = n;
  return { ...progress, inventory };
}

export interface ToggleOptions {
  now: Date;
  today: string;
  resetDaily: boolean;
  autoInventory: boolean;
  stackSize: number;
}

/**
 * Toggles the collected state of a marker. When auto-inventory is on and the
 * marker is a specific item, the inventory follows (+1 on collect, -1 on undo).
 */
export function toggleCollected(progress: Progress, marker: MarkerData, opts: ToggleOptions): Progress {
  const was = isCollected(progress, marker.id, opts.today, opts.resetDaily);
  const collected = { ...progress.collected };
  if (was) delete collected[marker.id];
  else collected[marker.id] = opts.now.toISOString();
  let next: Progress = { ...progress, collected };
  if (opts.autoInventory && marker.itemId) {
    const current = progress.inventory[marker.itemId] ?? 0;
    next = setInventory(next, marker.itemId, current + (was ? -1 : 1), opts.stackSize);
  }
  return next;
}

export interface VisibilityContext {
  cycles: Record<CycleGroup, CycleNumber>;
  categoryGroups: ReadonlyMap<string, CycleGroup>;
  hiddenCategories: ReadonlySet<string>;
  filter: MarkerFilter;
  weeklyItems: ReadonlySet<string>;
  inventory: Readonly<Record<string, number>>;
}

/** Markers of the active cycle, after category and filter rules (collected state is a display concern). */
export function visibleMarkers(markers: readonly MarkerData[], ctx: VisibilityContext): MarkerData[] {
  return markers.filter((m) => {
    if (ctx.hiddenCategories.has(m.category)) return false;
    const group = ctx.categoryGroups.get(m.category);
    if (!group || ctx.cycles[group] !== m.cycle) return false;
    if (ctx.filter === 'weekly') return m.itemId !== null && ctx.weeklyItems.has(m.itemId);
    if (ctx.filter === 'missing') return m.itemId === null || (ctx.inventory[m.itemId] ?? 0) === 0;
    return true;
  });
}

export interface CollectionStat {
  id: string;
  owned: number;
  total: number;
  /** Number of complete sets currently in the inventory (min over items). */
  completeSets: number;
  value: number;
}

export interface Stats {
  todayCollected: number;
  todayTotal: number;
  itemsOwned: number;
  itemsTotal: number;
  inventoryValue: number;
  completeSetsValue: number;
  collections: CollectionStat[];
}

export function computeStats(
  data: CollectiblesFile,
  activeMarkers: readonly MarkerData[],
  progress: Progress,
  today: string,
  resetDaily: boolean,
): Stats {
  const price = new Map(data.items.map((i) => [i.id, i.price]));
  let inventoryValue = 0;
  for (const [id, n] of Object.entries(progress.inventory)) inventoryValue += (price.get(id) ?? 0) * n;
  let completeSetsValue = 0;
  let itemsOwned = 0;
  const collections = data.collections.map((c) => {
    const counts = c.itemIds.map((id) => progress.inventory[id] ?? 0);
    const owned = counts.filter((n) => n > 0).length;
    const completeSets = counts.length ? Math.min(...counts) : 0;
    itemsOwned += owned;
    completeSetsValue += completeSets * c.value;
    return { id: c.id, owned, total: c.itemIds.length, completeSets, value: c.value };
  });
  return {
    todayCollected: activeMarkers.filter((m) => isCollected(progress, m.id, today, resetDaily)).length,
    todayTotal: activeMarkers.length,
    itemsOwned,
    itemsTotal: data.items.length,
    inventoryValue: Math.round(inventoryValue * 100) / 100,
    completeSetsValue: Math.round(completeSetsValue * 100) / 100,
    collections,
  };
}

export function weeklyItemSet(sets: readonly WeeklySet[], id: string | null): WeeklySet | null {
  if (!id) return null;
  return sets.find((s) => s.id === id) ?? null;
}
