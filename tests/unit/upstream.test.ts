import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateUpstream } from '../../scripts/sync-upstream.ts';
import { classify } from '../../scripts/upstream-report.ts';
import { TRACKED_FILES } from '../../scripts/upstream-lib.ts';

const vendored = Object.fromEntries(TRACKED_FILES.map((p) => [p, readFileSync(join(process.cwd(), 'upstream', p), 'utf8')]));

describe('upstream sync validation', () => {
  it('accepts the vendored snapshot', () => {
    const r = validateUpstream(vendored, 'test');
    expect(r.markers).toBeGreaterThan(1500);
    expect(r.cyclesFrom <= r.cyclesTo).toBe(true);
  });
  it('rejects a broken upstream update (invalid JSON or schema change)', () => {
    expect(() => validateUpstream({ ...vendored, 'data/cycles.json': '[{"date":"2026-01-01","flower":"seven"}]' }, 'x')).toThrow();
    expect(() => validateUpstream({ ...vendored, 'data/items.json': '{' }, 'x')).toThrow();
    expect(() => validateUpstream({ ...vendored, 'data/items.json': '{"flower":{"1":[]}}' }, 'x')).toThrow(/few markers/);
  });
});

describe('upstream change classification', () => {
  it('buckets files by impact', () => {
    expect(classify('data/cycles.json')).toBe('data-synced');
    expect(classify('data/new_thing.json')).toBe('data-other');
    expect(classify('langs/de.json')).toBe('translations');
    expect(classify('assets/js/routes.js')).toBe('features');
    expect(classify('assets/images/icons/coin.png')).toBe('styles-assets');
    expect(classify('.github/workflows/x.yml')).toBe('infra');
  });
});
