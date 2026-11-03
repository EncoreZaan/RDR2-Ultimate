import type { CycleDay, CycleGroup, CycleNumber } from '../data/types.ts';
import { CYCLE_GROUPS } from '../data/types.ts';

export type CycleSource = 'calendar' | 'live' | 'manual' | 'fallback';

export interface ResolvedCycles {
  date: string;
  cycles: Record<CycleGroup, CycleNumber>;
  source: CycleSource;
  /** Groups that use the same cycle as the previous day (in-game spots won't respawn). */
  sameAsYesterday: CycleGroup[];
}

const FALLBACK: Record<CycleGroup, CycleNumber> = Object.fromEntries(
  CYCLE_GROUPS.map((g) => [g, 1]),
) as Record<CycleGroup, CycleNumber>;

/** Merges calendars (later sources win for duplicate dates) and returns them sorted by date. */
export function mergeCalendars(...calendars: CycleDay[][]): CycleDay[] {
  const byDate = new Map<string, CycleDay>();
  for (const cal of calendars) for (const d of cal) byDate.set(d.date, d);
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function previousDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Resolves the cycles for `date`.
 * Priority: manual overrides (per group) > calendar entry > fallback (all 1).
 */
export function resolveCycles(
  calendar: CycleDay[],
  date: string,
  manual: Partial<Record<CycleGroup, CycleNumber>> | null,
  liveDates: ReadonlySet<string> = new Set(),
): ResolvedCycles {
  const entry = calendar.find((d) => d.date === date);
  const yesterday = calendar.find((d) => d.date === previousDate(date));
  const base = entry?.cycles ?? FALLBACK;
  const hasManual = manual !== null && Object.keys(manual).length > 0;
  const cycles = { ...base, ...(manual ?? {}) };
  let source: CycleSource = entry ? (liveDates.has(date) ? 'live' : 'calendar') : 'fallback';
  if (hasManual) source = 'manual';
  const sameAsYesterday =
    entry && yesterday ? CYCLE_GROUPS.filter((g) => yesterday.cycles[g] === cycles[g]) : [];
  return { date, cycles, source, sameAsYesterday };
}

/** True when the calendar has no entry for `date` or the day after (data is getting stale). */
export function calendarNeedsRefresh(calendar: CycleDay[], date: string): boolean {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  const tomorrow = d.toISOString().slice(0, 10);
  return !calendar.some((c) => c.date === date) || !calendar.some((c) => c.date === tomorrow);
}

/** Date range covered by the calendar, for display. */
export function calendarRange(calendar: CycleDay[]): { from: string; to: string } | null {
  if (calendar.length === 0) return null;
  return { from: calendar[0]!.date, to: calendar[calendar.length - 1]!.date };
}
