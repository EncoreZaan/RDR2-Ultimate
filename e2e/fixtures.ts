import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test as base, expect, type Page } from '@playwright/test';

/**
 * A date inside the cycle calendar actually shipped in dist/ (the upstream
 * calendar is a sliding window, so it cannot be hard-coded).
 */
function pickDate(): Date {
  const cal = JSON.parse(readFileSync(join(process.cwd(), 'dist', 'data', 'cycles.json'), 'utf8')) as { days: { date: string }[] };
  const day = cal.days[Math.floor(cal.days.length / 2)]!.date;
  return new Date(`${day}T12:00:00Z`);
}
export const FIXED_DATE = pickDate();
const FIXED_DAY = FIXED_DATE.toISOString().slice(0, 10);

/**
 * Isolates the app from the network: map tiles fail (exercising the schematic
 * fallback) and community APIs answer with fixtures.
 */
export async function isolate(page: Page): Promise<void> {
  await page.clock.setFixedTime(FIXED_DATE);
  await page.route('https://s.rsg.sc/**', (r) => r.abort());
  await page.route('https://pepegapi.jeanropke.net/v2/rdo/weekly', (r) =>
    r.fulfill({ json: { set: 'AWARD_ROLE_COLLECTOR_SET_SACRED' }, headers: { 'access-control-allow-origin': '*' } }),
  );
  await page.route('https://pepegapi.jeanropke.net/v2/rdo/nazar', (r) =>
    r.fulfill({ json: { date: FIXED_DAY, nazar: 'MPSW_LOCATION_04' }, headers: { 'access-control-allow-origin': '*' } }),
  );
  await page.route('https://rdo-dailies.com/**', (r) => r.abort());
  await page.route('https://raw.githubusercontent.com/**', (r) => r.abort());
}

export async function openApp(page: Page, path = './'): Promise<void> {
  await isolate(page);
  await page.goto(path);
  await expect(page.locator('.mk').first()).toBeVisible({ timeout: 15_000 });
}

export async function ensureSidebar(page: Page): Promise<void> {
  const sidebar = page.locator('#sidebar');
  if (!(await sidebar.evaluate((el) => el.classList.contains('is-open')))) {
    await page.locator('.menu-btn').click();
  }
  await expect(sidebar).toHaveClass(/is-open/);
}

export async function closeSidebarOnSmallScreens(page: Page): Promise<void> {
  const vw = page.viewportSize()?.width ?? 1440;
  if (vw < 1024 && (await page.locator('#sidebar').evaluate((el) => el.classList.contains('is-open')))) {
    await page.locator('.menu-btn').click();
  }
}

/**
 * Clicks a specific map marker. Markers overlap at low zoom, so a pointer click
 * at the element centre may hit a neighbour; dispatching the DOM click targets
 * exactly this marker (Leaflet listens to it).
 */
export async function clickMarker(page: Page, index = 0): Promise<string> {
  const marker = page.locator('.leaflet-marker-pane .mk:not(.mk-user)').nth(index);
  const title = (await marker.getAttribute('title')) ?? '';
  await marker.dispatchEvent('click');
  await expect(page.locator('.detail-card h2')).toHaveText(title);
  return title;
}

export const test = base.extend<{ errors: string[] }>({
  errors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const text = m.text();
      // Blocked tiles / aborted fixture requests are expected in tests.
      if (/Failed to load resource|ERR_FAILED|net::/.test(text)) return;
      errors.push(text);
    });
    await use(errors);
  },
});
export { expect };
