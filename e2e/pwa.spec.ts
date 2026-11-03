import { clickMarker, expect, openApp, test } from './fixtures.ts';

test.describe('PWA', () => {
  test('serves a complete web app manifest with reachable icons', async ({ page, request }) => {
    await openApp(page);
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBeTruthy();
    const res = await request.get(new URL(href!, page.url()).toString());
    expect(res.ok()).toBe(true);
    const manifest = (await res.json()) as { name: string; display: string; start_url: string; icons: { src: string; sizes: string; purpose: string }[] };
    expect(manifest.name).toContain('Collector’s Ultimate');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable')).toBe(true);
    expect(manifest.icons.some((i) => i.sizes === '192x192')).toBe(true);
    for (const icon of manifest.icons) {
      const r = await request.get(new URL(icon.src, new URL(href!, page.url())).toString());
      expect(r.ok(), icon.src).toBe(true);
    }
  });

  test('ships a strict Content-Security-Policy', async ({ page }) => {
    await openApp(page);
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("object-src 'none'");
  });

  test('works fully offline after the first visit (progress kept)', async ({ page, context }) => {
    test.skip(test.info().project.name !== 'desktop', 'service worker flow checked once');
    await openApp(page);
    // Wait until the service worker controls the page and has precached the app.
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
      }
      return reg.active?.state;
    });
    const title = await clickMarker(page);
    await page.locator('.detail-card .btn-collect').click();

    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('.mk').first()).toBeVisible({ timeout: 15_000 });
    expect(await page.locator('.mk').count()).toBeGreaterThan(150);
    await expect(page.locator('.net-badge.is-offline')).toBeVisible();
    await expect(page.locator(`.mk[title="${title}"]`).first()).toHaveClass(/is-collected/);
    // Data files come from the precache.
    const cached = await page.evaluate(async () => {
      const keys = await caches.keys();
      let n = 0;
      for (const k of keys) n += (await (await caches.open(k)).keys()).filter((r) => r.url.includes('/data/')).length;
      return n;
    });
    expect(cached).toBeGreaterThanOrEqual(6);
    await context.setOffline(false);
  });
});
