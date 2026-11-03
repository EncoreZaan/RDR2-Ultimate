/**
 * Optional "live" data from community services, used exactly like upstream does.
 * Every call is best-effort: short timeout, strict parsing, never throws.
 * Can be disabled in the settings (privacy / fully offline use).
 */
import type { CyclesFile } from '../data/types.ts';
import { normalizeCycles } from '../data/normalize.ts';

export const LIVE_SOURCES = {
  weekly: ['https://pepegapi.jeanropke.net/v2/rdo/weekly', 'https://rdo-dailies.com/api/RDO/collector/weekly_set'],
  nazar: ['https://pepegapi.jeanropke.net/v2/rdo/nazar', 'https://rdo-dailies.com/api/RDO/collector/nazar_location'],
  cycles: ['https://raw.githubusercontent.com/jeanropke/RDR2CollectorsMap/master/data/cycles.json'],
} as const;

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

async function fetchJson(url: string, fetcher: Fetcher, timeoutMs: number): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetcher(url, { signal: ctrl.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

/** `AWARD_ROLE_COLLECTOR_SET_SACRED` | `SET_SACRED` | `set_sacred` -> `set_sacred`. */
export function parseWeeklyResponse(raw: unknown, knownSets: ReadonlySet<string>): string | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const set = (raw as Record<string, unknown>)['set'];
  if (typeof set !== 'string') return null;
  const id = set.replace(/^AWARD_ROLE_COLLECTOR_/i, '').toLowerCase();
  const candidate = id.startsWith('set_') ? id : `set_${id}`;
  return knownSets.has(candidate) ? candidate : null;
}

/** `{ date: 'YYYY-MM-DD', nazar: 'MPSW_LOCATION_04' }` — only accepted for the expected date. */
export function parseNazarResponse(raw: unknown, expectedDate: string, knownKeys: ReadonlySet<string>): string | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (r['date'] !== expectedDate || typeof r['nazar'] !== 'string') return null;
  return knownKeys.has(r['nazar']) ? r['nazar'] : null;
}

async function firstOf<T>(urls: readonly string[], fetcher: Fetcher, parse: (raw: unknown) => T | null, timeoutMs: number): Promise<T | null> {
  for (const url of urls) {
    try {
      const v = parse(await fetchJson(url, fetcher, timeoutMs));
      if (v !== null) return v;
    } catch {
      /* try next source */
    }
  }
  return null;
}

export function fetchWeekly(knownSets: ReadonlySet<string>, fetcher: Fetcher = fetch, timeoutMs = 6000): Promise<string | null> {
  return firstOf(LIVE_SOURCES.weekly, fetcher, (r) => parseWeeklyResponse(r, knownSets), timeoutMs);
}

export function fetchNazar(
  expectedDate: string,
  knownKeys: ReadonlySet<string>,
  fetcher: Fetcher = fetch,
  timeoutMs = 6000,
): Promise<string | null> {
  return firstOf(LIVE_SOURCES.nazar, fetcher, (r) => parseNazarResponse(r, expectedDate, knownKeys), timeoutMs);
}

export function fetchUpstreamCycles(fetcher: Fetcher = fetch, timeoutMs = 8000): Promise<CyclesFile | null> {
  return firstOf(
    LIVE_SOURCES.cycles,
    fetcher,
    (r) => {
      try {
        return normalizeCycles(r);
      } catch {
        return null;
      }
    },
    timeoutMs,
  );
}
