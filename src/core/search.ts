/** Accent- and case-insensitive search helpers. */

export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/gi, 'oe')
    .replace(/æ/gi, 'ae')
    .toLowerCase()
    .replace(/[^a-z0-9#]+/g, ' ')
    .trim();
}

export interface SearchEntry<T> {
  label: string;
  /** Extra text that should match but is not displayed (e.g. category name). */
  keywords?: string;
  value: T;
}

interface Indexed<T> {
  entry: SearchEntry<T>;
  label: string;
  hay: string;
}

export class SearchIndex<T> {
  private readonly items: Indexed<T>[];
  constructor(entries: readonly SearchEntry<T>[]) {
    this.items = entries.map((entry) => {
      const label = normalizeText(entry.label);
      return { entry, label, hay: `${label} ${normalizeText(entry.keywords ?? '')}` };
    });
  }

  /**
   * All query words must appear in the entry. Ranking: exact label > label prefix >
   * word prefix in label > anywhere; ties broken by shorter label.
   */
  search(query: string, limit = 20): SearchEntry<T>[] {
    const words = normalizeText(query).split(' ').filter(Boolean);
    if (words.length === 0) return [];
    const q = words.join(' ');
    const scored: { score: number; item: Indexed<T> }[] = [];
    for (const item of this.items) {
      if (!words.every((w) => item.hay.includes(w))) continue;
      let score = 3;
      if (item.label === q) score = 0;
      else if (item.label.startsWith(q)) score = 1;
      else if (words.every((w) => item.label.split(' ').some((lw) => lw.startsWith(w)))) score = 2;
      scored.push({ score, item });
    }
    scored.sort((a, b) => a.score - b.score || a.item.label.length - b.item.label.length || a.item.label.localeCompare(b.item.label));
    return scored.slice(0, limit).map((s) => s.item.entry);
  }
}
