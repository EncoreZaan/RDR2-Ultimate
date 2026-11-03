/**
 * Original, hand-drawn SVG glyphs (24×24, stroke based). No game asset is used.
 */

export const GLYPHS: Readonly<Record<string, string>> = {
  arrowhead: 'M12 3l6 11-6-2.5L6 14z M12 11.5V21',
  egg: 'M12 3c3.6 0 6 5.2 6 9.6S15.3 21 12 21s-6-4-6-8.4S8.4 3 12 3z',
  coin: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16z M12 7.5a4.5 4.5 0 1 0 0 9a4.5 4.5 0 1 0 0-9z',
  heirlooms: 'M4.5 8.5h15v3h-15z M7 11.5v7 M10 11.5v7 M13 11.5v7 M16 11.5v7',
  bottle: 'M10 3h4v4l2.2 3.2V20a1 1 0 0 1-1 1H8.8a1 1 0 0 1-1-1V10.2L10 7z M8 13h8',
  cups: 'M6.5 3h11v18h-11z M9.5 8.5h5l-.6 3.5h-3.8z M12 12v3 M10.3 15.5h3.4',
  pentacles: 'M6.5 3h11v18h-11z M12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7z M12 9.5l1 2.6h-2.4L12 9.5',
  swords: 'M6.5 3h11v18h-11z M12 6.5v10 M9.8 14h4.4 M12 16.5v1.5',
  wands: 'M6.5 3h11v18h-11z M9.5 17l5-10 M13.5 7.5l1.6.8',
  ring: 'M12 9a5 5 0 1 0 0 10a5 5 0 1 0 0-10z M10 6l2-3 2 3-2 2z',
  earring: 'M12 3a3 3 0 0 1 3 3c0 1.8-3 2.2-3 4.5 M12 12l3 4.2a3 3 0 1 1-6 0z',
  bracelet: 'M12 7c4.7 0 8 2.2 8 5s-3.3 5-8 5-8-2.2-8-5 3.3-5 8-5z M12 9.5c3 0 5 1.1 5 2.5s-2 2.5-5 2.5-5-1.1-5-2.5 2-2.5 5-2.5z',
  necklace: 'M5 4c0 6.5 3.1 10.5 7 10.5S19 10.5 19 4 M12 14.5v1.2 M12 15.7a2.4 2.4 0 1 0 0 4.8a2.4 2.4 0 1 0 0-4.8z',
  jewelry_random: 'M7.5 4h9l4 5-8.5 11.5L3.5 9z M3.5 9h17 M9.5 4l2.5 5 2.5-5',
  flower:
    'M12 10a2 2 0 1 0 0 4a2 2 0 1 0 0-4z M12 10c-1.6-2.4-1-6 0-6.5 1 .5 1.6 4.1 0 6.5 M14 12c2.4-1.6 6-1 6.5 0-.5 1-4.1 1.6-6.5 0 M12 14c1.6 2.4 1 6 0 6.5-1-.5-1.6-4.1 0-6.5 M10 12c-2.4 1.6-6 1-6.5 0 .5-1 4.1-1.6 6.5 0',
  fossils_random: 'M12 12a1.5 1.5 0 1 1 1.5-1.5 3 3 0 1 1-3 3 4.5 4.5 0 1 1 4.5-4.5 6 6 0 1 1-6 6',
  random: 'M9 9a3 3 0 1 1 4.2 2.75c-.75.33-1.2.95-1.2 1.75V15 M12 18.2v.6',
  treasure: 'M4 10.5h16V19H4z M4 10.5c0-3 3.6-5 8-5s8 2 8 5 M12 13v2.5 M4 13.5h16',
  legendary:
    'M8 11a1.6 2 0 1 0 0 .01z M16 11a1.6 2 0 1 0 0 .01z M10.5 7.5a1.5 2 0 1 0 0 .01z M13.5 7.5a1.5 2 0 1 0 0 .01z M12 13c2.5 0 4 2.2 4 4s-1.6 2.2-4 2.2-4-.4-4-2.2 1.5-4 4-4z',
  fastTravel: 'M12 3v18 M12 5h7l2 2.5-2 2.5h-7 M12 12H5l-2 2.5L5 17h7',
  nazar: 'M12 4a6 6 0 1 0 0 12a6 6 0 1 0 0-12z M7 19h10 M8.5 16.5 7 19 M15.5 16.5 17 19 M10 8.5a2.5 2.5 0 0 1 2.5-1.5',
  pin: 'M12 7a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5z',
  shovel: 'M12 3v10 M9 13h6v3.5a3 3 0 0 1-6 0z M10 3h4',
  detector: 'M6 20l9-14 M13 4h5v4 M4 18a3 2 0 1 0 6 0a3 2 0 1 0-6 0z',
};

/** Default colour per category (dark-theme friendly, distinct hues). */
export const CATEGORY_COLORS: Readonly<Record<string, string>> = {
  arrowhead: '#b07a4f',
  egg: '#e4d9b8',
  coin: '#d9b44a',
  heirlooms: '#9c6fb6',
  bottle: '#6fa4a8',
  cups: '#c95f5f',
  pentacles: '#d4a24c',
  swords: '#7c93c9',
  wands: '#7fae5b',
  jewelry_random: '#e07fb3',
  ring: '#e3a6c8',
  earring: '#c98fd6',
  bracelet: '#a98ae0',
  necklace: '#f0b7a4',
  flower: '#e98f5a',
  fossils_random: '#9e9a86',
  random: '#8f8f8f',
  treasure: '#d9b44a',
  legendary: '#c0392b',
  fastTravel: '#5d9bd6',
  nazar: '#a55fd1',
};

export function glyphSvg(name: string, size = 24, stroke = 'currentColor', width = 1.8): string {
  const d = GLYPHS[name] ?? GLYPHS['random'] ?? '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
}

/** Relative luminance, used to pick a readable glyph colour on a marker background. */
export function isLight(hex: string): boolean {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return false;
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => {
    const c = parseInt(h ?? '0', 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45;
}

const cache = new Map<string, string>();

/** Pin-shaped marker HTML (teardrop + glyph). Cached per glyph/colour. */
export function markerHtml(glyph: string, color: string): string {
  const key = `${glyph}|${color}`;
  let html = cache.get(key);
  if (!html) {
    const fg = isLight(color) ? '#1a120b' : '#fff8ec';
    html =
      `<svg class="mk-pin" viewBox="0 0 32 42" aria-hidden="true"><path d="M16 1C7.7 1 1 7.6 1 15.8 1 26.4 16 41 16 41s15-14.6 15-25.2C31 7.6 24.3 1 16 1z" fill="${color}" stroke="#1a120b" stroke-opacity=".75" stroke-width="1.6"/></svg>` +
      `<span class="mk-glyph">${glyphSvg(glyph, 18, fg, 2)}</span>`;
    cache.set(key, html);
  }
  return html;
}
