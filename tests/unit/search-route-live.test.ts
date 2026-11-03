import { describe, expect, it, vi } from 'vitest';
import { fetchNazar, fetchUpstreamCycles, fetchWeekly, parseNazarResponse, parseWeeklyResponse, type Fetcher } from '../../src/core/live.ts';
import { distance, pathLength, planRoute } from '../../src/core/route.ts';
import { normalizeText, SearchIndex } from '../../src/core/search.ts';

describe('search', () => {
  const index = new SearchIndex([
    { label: 'Œuf de Canard', value: 1 },
    { label: 'Œuf d’Aigle', value: 2 },
    { label: 'Pièce de 1792', keywords: 'Pièces de Monnaie', value: 3 },
    { label: 'Canard sauvage', value: 4 },
  ]);
  it('normalises accents, ligatures and punctuation', () => {
    expect(normalizeText('  Œuf d’Aigle ! ')).toBe('oeuf d aigle');
    expect(normalizeText('Pièce')).toBe('piece');
  });
  it('finds entries regardless of accents and ranks prefix matches first', () => {
    expect(index.search('oeuf').map((r) => r.value)).toEqual([2, 1]);
    expect(index.search('canard').map((r) => r.value)).toEqual([4, 1]);
    expect(index.search('monnaie').map((r) => r.value)).toEqual([3]);
    expect(index.search('   ')).toEqual([]);
    expect(index.search('zzz')).toEqual([]);
  });
});

describe('route planner', () => {
  it('visits every point once and beats a naive order', () => {
    const pts = Array.from({ length: 40 }, (_, i) => ({ lat: -((i * 37) % 100), lng: (i * 53) % 160, id: i }));
    const start = { lat: -50, lng: 80 };
    const route = planRoute(start, pts);
    expect(route).toHaveLength(40);
    expect(new Set(route.map((p) => p.id)).size).toBe(40);
    expect(pathLength([start, ...route])).toBeLessThan(pathLength([start, ...pts]));
  });
  it('handles trivial inputs', () => {
    expect(planRoute({ lat: 0, lng: 0 }, [])).toEqual([]);
    expect(distance({ lat: 0, lng: 0 }, { lat: 3, lng: 4 })).toBe(5);
  });
});

describe('live data parsers', () => {
  const sets = new Set(['set_sacred', 'set_veteran']);
  it('parses the weekly set in every known format', () => {
    expect(parseWeeklyResponse({ set: 'AWARD_ROLE_COLLECTOR_SET_SACRED' }, sets)).toBe('set_sacred');
    expect(parseWeeklyResponse({ set: 'veteran' }, sets)).toBe('set_veteran');
    expect(parseWeeklyResponse({ set: 'set_unknown' }, sets)).toBeNull();
    expect(parseWeeklyResponse(null, sets)).toBeNull();
  });
  it('accepts a Nazar location only for the expected day', () => {
    const keys = new Set(['MPSW_LOCATION_04']);
    expect(parseNazarResponse({ date: '2026-11-03', nazar: 'MPSW_LOCATION_04' }, '2026-11-03', keys)).toBe('MPSW_LOCATION_04');
    expect(parseNazarResponse({ date: '2026-11-02', nazar: 'MPSW_LOCATION_04' }, '2026-11-03', keys)).toBeNull();
    expect(parseNazarResponse({ date: '2026-11-03', nazar: 'EVIL' }, '2026-11-03', keys)).toBeNull();
  });
  it('falls back to the second source and never throws', async () => {
    const fetcher = vi.fn<Fetcher>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ set: 'SET_VETERAN' })));
    expect(await fetchWeekly(sets, fetcher)).toBe('set_veteran');
    expect(fetcher).toHaveBeenCalledTimes(2);
    const failing: Fetcher = () => Promise.resolve(new Response('nope', { status: 500 }));
    expect(await fetchNazar('2026-11-03', new Set(['x']), failing)).toBeNull();
    expect(await fetchUpstreamCycles(() => Promise.resolve(new Response('[{"date":"bad"}]')))).toBeNull();
  });
  it('aborts slow requests', async () => {
    const slow: Fetcher = (_url, init) =>
      new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new Error('aborted'))));
    expect(await fetchWeekly(sets, slow, 20)).toBeNull();
  });
});
