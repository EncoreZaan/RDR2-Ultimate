import { clickMarker, ensureSidebar, expect, openApp, test } from './fixtures.ts';

test.describe('responsive layout', () => {
  test('no horizontal scroll, sidebar usable, screenshot', async ({ page }, info) => {
    await openApp(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await ensureSidebar(page);
    const sidebar = (await page.locator('#sidebar').boundingBox())!;
    const vw = page.viewportSize()!.width;
    expect(sidebar.width).toBeLessThanOrEqual(vw);
    await expect(page.getByRole('tab', { name: 'Collection' })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`${info.project.name}-sidebar.png`) });
    // Touch targets of the map controls are at least 40px.
    const ctrl = (await page.locator('.map-controls .icon-btn').first().boundingBox())!;
    expect(ctrl.width).toBeGreaterThanOrEqual(40);
  });

  test('detail card fits in the viewport', async ({ page }) => {
    await openApp(page);
    const vw = page.viewportSize()!.width;
    if (vw < 1024 && (await page.locator('#sidebar.is-open').count())) await page.locator('.menu-btn').click();
    await clickMarker(page);
    const card = (await page.locator('.detail-card').boundingBox())!;
    expect(card.x).toBeGreaterThanOrEqual(0);
    expect(card.x + card.width).toBeLessThanOrEqual(vw + 1);
  });
});
