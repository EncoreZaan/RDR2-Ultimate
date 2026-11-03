/**
 * Renders the PWA icons (PNG) from src/assets/logo.svg with the pre-installed
 * Chromium (Playwright). Run with `npm run icons` after changing the logo.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = await readFile(join(root, 'src/assets/logo.svg'), 'utf8');
const out = join(root, 'public/icons');
await mkdir(out, { recursive: true });

const targets: { file: string; size: number; maskable?: boolean; background?: string }[] = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, background: '#17110c' },
  { file: 'favicon-32.png', size: 32 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const t of targets) {
  // Maskable icons keep the emblem within the 80% safe zone on a full-bleed background.
  const inner = t.maskable ? Math.round(t.size * 0.72) : t.background ? Math.round(t.size * 0.86) : t.size;
  const bg = t.maskable ? '#17110c' : (t.background ?? 'transparent');
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(
    `<html><body style="margin:0;width:${t.size}px;height:${t.size}px;display:grid;place-items:center;background:${bg}">` +
      `<div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body></html>`,
  );
  const png = await page.screenshot({ omitBackground: bg === 'transparent', type: 'png' });
  await writeFile(join(out, t.file), png);
  console.log(`  public/icons/${t.file} (${t.size}px)`);
}
await browser.close();
await writeFile(join(root, 'public/favicon.svg'), svg);
console.log('Icons OK');
