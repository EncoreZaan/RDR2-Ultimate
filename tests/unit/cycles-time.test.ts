import { describe, expect, it } from 'vitest';
import { calendarNeedsRefresh, mergeCalendars, previousDate, resolveCycles } from '../../src/core/cycles.ts';
import type { CycleDay, CycleGroup, CycleNumber } from '../../src/data/types.ts';
import { CYCLE_GROUPS } from '../../src/data/types.ts';
import { formatCountdown, msUntilUtcMidnight, nazarDateString, utcDateString, utcDayStart } from '../../src/core/time.ts';

const day = (date: string, n: CycleNumber, patch: Partial<Record<CycleGroup, CycleNumber>> = {}): CycleDay => ({
  date,
  cycles: { ...(Object.fromEntries(CYCLE_GROUPS.map((g) => [g, n])) as Record<CycleGroup, CycleNumber>), ...patch },
});

describe('time', () => {
  it('uses UTC days', () => {
    const d = new Date('2026-11-03T23:30:00-05:00'); // 04:30 UTC on the 4th
    expect(utcDateString(d)).toBe('2026-11-04');
    expect(utcDayStart(d).toISOString()).toBe('2026-11-04T00:00:00.000Z');
  });
  it('counts down to UTC midnight', () => {
    expect(msUntilUtcMidnight(new Date('2026-11-03T23:00:00Z'))).toBe(3_600_000);
    expect(formatCountdown(3_723_000)).toBe('01:02:03');
    expect(formatCountdown(-5)).toBe('00:00:00');
  });
  it('shifts the Nazar day by 6 hours', () => {
    expect(nazarDateString(new Date('2026-11-03T05:59:00Z'))).toBe('2026-11-02');
    expect(nazarDateString(new Date('2026-11-03T06:00:00Z'))).toBe('2026-11-03');
  });
});

describe('resolveCycles', () => {
  const cal = [day('2026-11-01', 1), day('2026-11-02', 2, { flower: 1 }), day('2026-11-03', 3)];

  it('returns the calendar entry for the date', () => {
    const r = resolveCycles(cal, '2026-11-02', null);
    expect(r.source).toBe('calendar');
    expect(r.cycles.egg).toBe(2);
  });
  it('flags groups that repeat yesterday’s cycle', () => {
    expect(resolveCycles(cal, '2026-11-02', null).sameAsYesterday).toEqual(['flower']);
  });
  it('falls back to cycle 1 when the date is unknown', () => {
    const r = resolveCycles(cal, '2027-01-01', null);
    expect(r.source).toBe('fallback');
    expect(Object.values(r.cycles).every((c) => c === 1)).toBe(true);
  });
  it('applies manual overrides on top', () => {
    const r = resolveCycles(cal, '2026-11-03', { coin: 6 });
    expect(r.source).toBe('manual');
    expect(r.cycles.coin).toBe(6);
    expect(r.cycles.egg).toBe(3);
  });
  it('marks dates that only exist in the live calendar', () => {
    expect(resolveCycles(cal, '2026-11-03', null, new Set(['2026-11-03'])).source).toBe('live');
  });
  it('merges calendars with later sources winning', () => {
    const merged = mergeCalendars(cal, [day('2026-11-03', 6), day('2026-11-04', 4)]);
    expect(merged.map((d) => d.date)).toEqual(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04']);
    expect(merged[2]!.cycles.egg).toBe(6);
  });
  it('detects a calendar that needs refreshing', () => {
    expect(calendarNeedsRefresh(cal, '2026-11-02')).toBe(false);
    expect(calendarNeedsRefresh(cal, '2026-11-03')).toBe(true);
    expect(previousDate('2026-03-01')).toBe('2026-02-28');
  });
});
