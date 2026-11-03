/** Time helpers. The collector cycles reset at 00:00 UTC (upstream `Cycles`). */

export const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` in UTC. */
export function utcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Start (00:00 UTC) of the day containing `date`, shifted by `offsetDays`. */
export function utcDayStart(date: Date, offsetDays = 0): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + offsetDays));
}

/** Milliseconds until the next 00:00 UTC. */
export function msUntilUtcMidnight(now: Date): number {
  return utcDayStart(now, 1).getTime() - now.getTime();
}

/** Madam Nazar moves daily at 06:00 UTC (upstream `MadamNazar.getFreshDate`). */
export function nazarDateString(now: Date): string {
  return utcDateString(new Date(now.getTime() - 6 * 3_600_000));
}

/** `HH:MM:SS` countdown. */
export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':');
}
