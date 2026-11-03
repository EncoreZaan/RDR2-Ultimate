import { clickMarker, closeSidebarOnSmallScreens, ensureSidebar, expect, openApp, test } from './fixtures.ts';

test.describe('core features', () => {
  test('loads the map with today’s markers and no runtime errors', async ({ page, errors }) => {
    await openApp(page);
    await expect(page).toHaveTitle(/Collector’s Ultimate/);
    const count = await page.locator('.mk').count();
    expect(count).toBeGreaterThan(150);
    // The offline schematic base layer is drawn (canvas) even though tiles fail.
    await expect(page.locator('.leaflet-pane canvas').first()).toBeAttached();
    expect(errors).toEqual([]);
  });

  test('marks a marker as collected and keeps it after a reload', async ({ page }) => {
    await openApp(page);
    await closeSidebarOnSmallScreens(page);
    const title = await clickMarker(page);
    const card = page.locator('.detail-card');
    await expect(card).toBeVisible();
    await card.locator('.btn-collect').click();
    await expect(card.locator('.btn-collect')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator(`.mk[title="${title}"]`).first()).toHaveClass(/is-collected/);

    await page.reload();
    await expect(page.locator(`.mk[title="${title}"]`).first()).toHaveClass(/is-collected/, { timeout: 15_000 });
  });

  test('search finds an item accent-insensitively and focuses it', async ({ page }) => {
    await openApp(page);
    const input = page.getByRole('combobox', { name: 'Recherche' });
    await input.fill('oeuf');
    const options = page.getByRole('option');
    await expect(options.first()).toBeVisible();
    expect(await options.count()).toBeGreaterThan(1);
    await input.press('Enter');
    await expect(page.locator('.mk.is-selected')).toHaveCount(1);
  });

  test('category toggle hides and shows markers', async ({ page }) => {
    await openApp(page);
    await ensureSidebar(page);
    const before = await page.locator('.mk').count();
    await page.getByRole('button', { name: /Tout masquer/ }).click();
    await expect(page.locator('.leaflet-marker-pane .mk:not(.mk-user)')).toHaveCount(0);
    await page.getByRole('button', { name: /Tout afficher/ }).click();
    await expect(page.locator('.mk')).toHaveCount(before);
  });

  test('inventory stepper and progress stats', async ({ page }) => {
    await openApp(page);
    await ensureSidebar(page);
    await page.locator('.cat-main').filter({ hasText: /Œuf/ }).click();
    const inc = page.getByRole('button', { name: /^Ajouter un / }).first();
    await inc.click();
    await inc.click();
    await page.getByRole('tab', { name: 'Progrès' }).click();
    await expect(page.locator('.kpi').nth(1)).toContainText('1');
  });

  test('weekly set and Nazar are detected from the community API', async ({ page }) => {
    await openApp(page);
    await ensureSidebar(page);
    await page.getByRole('tab', { name: 'Hebdo' }).click();
    await expect(page.locator('.weekly-card h3')).not.toBeEmpty();
    await expect(page.getByText('Collection détectée en ligne')).toBeVisible();
    await expect(page.locator('.poi-nazar')).toHaveCount(1);
  });

  test('language switch is applied and persisted', async ({ page }) => {
    await openApp(page);
    await ensureSidebar(page);
    await page.getByRole('tab', { name: 'Réglages' }).click();
    await page.getByText('English', { exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Settings' })).toBeVisible();
    await page.waitForTimeout(400); // debounced settings write
    await page.reload();
    await ensureSidebar(page);
    await expect(page.getByRole('tab', { name: 'Settings' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('drops a custom pin with a right-click and keeps it', async ({ page }) => {
    await openApp(page);
    await closeSidebarOnSmallScreens(page);
    const map = page.locator('#map');
    const box = (await map.boundingBox())!;
    await map.click({ button: 'right', position: { x: box.width / 2, y: box.height / 2 }, force: true });
    const dialog = page.getByRole('dialog', { name: 'Nouveau repère' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Titre').fill('Camp de chasse');
    await dialog.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.locator('.mk-user')).toHaveCount(1);
    await page.reload();
    await expect(page.locator('.mk-user')).toHaveCount(1, { timeout: 15_000 });
  });

  test('exports a valid backup file', async ({ page }) => {
    await openApp(page);
    await ensureSidebar(page);
    await page.getByRole('tab', { name: 'Réglages' }).click();
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Exporter/ }).click()]);
    const path = await download.path();
    const { readFile } = await import('node:fs/promises');
    const json = JSON.parse(await readFile(path, 'utf8')) as { format: string; progress: unknown };
    expect(json.format).toBe('rdr2-collectors-ultimate-backup');
    expect(json.progress).toBeTruthy();
  });

  test('every button has an accessible name', async ({ page }) => {
    await openApp(page);
    await ensureSidebar(page);
    const unnamed = await page.evaluate(() =>
      [...document.querySelectorAll('button')].filter((b) => !(b.getAttribute('aria-label') || b.textContent?.trim() || b.title)).map((b) => b.outerHTML.slice(0, 80)),
    );
    expect(unnamed).toEqual([]);
  });
});
