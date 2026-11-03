import type { GameStrings, MarkerData } from '../data/types.ts';
import { parseMarkerText } from '../data/normalize.ts';

/** Display name of a category, from upstream strings with a UI fallback. */
export function categoryName(game: GameStrings, id: string, fallback: (id: string) => string): string {
  if (id === 'random') return game['menu.random_spots'] ?? fallback(id);
  return game[`menu.${id}`] ?? fallback(id);
}

export function itemName(game: GameStrings, itemId: string): string {
  return game[`${itemId}.name`] ?? humanize(itemId);
}

export function humanize(id: string): string {
  return id
    .replace(/^(provision|consumable|document|collector)_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function markerName(game: GameStrings, m: MarkerData, catName: string): string {
  const { index } = parseMarkerText(m.text);
  if (m.itemId) return `${itemName(game, m.itemId)}${index !== null ? ` #${index}` : ''}`;
  return `${catName}${index !== null ? ` #${index + 1}` : ''}`;
}

export function markerDescription(game: GameStrings, m: MarkerData): string {
  const primary = m.itemId ? game[`${m.id}.desc`] : game[`${m.text}.desc`];
  return primary ?? game[`${m.id}.desc`] ?? '';
}

/** Category-level hint (mirrors upstream `secondaryDescriptionKey`). */
export function markerHint(game: GameStrings, m: MarkerData): string {
  let key = '';
  if (m.category === 'random') {
    key = m.tool === 1 ? 'map.random_spot_shovel.desc' : `map.random_spot_metal_detector_${m.spotType ?? 'shallow'}.desc`;
  } else if (['arrowhead', 'coin', 'fossils_random', 'jewelry_random'].includes(m.category)) {
    key = `${m.category === 'arrowhead' ? 'arrowhead_random' : m.category === 'coin' ? 'coin_random' : m.category}.desc`;
  } else {
    switch (m.itemId) {
      case 'provision_wldflwr_agarita':
      case 'provision_wldflwr_blood_flower':
        key = 'map.flower_type.night_only';
        break;
      case 'provision_wldflwr_creek_plum':
        key = 'map.flower_type.bush';
        break;
      case 'provision_spoonbill_egg':
      case 'provision_heron_egg':
      case 'provision_eagle_egg':
      case 'provision_hawk_egg':
      case 'provision_egret_egg':
        key = 'map.egg_type.tree';
        break;
      case 'provision_vulture_egg':
        key = 'map.egg_type.stump';
        break;
      case 'provision_duck_egg':
      case 'provision_goose_egg':
      case 'provision_loon_egg':
        key = 'map.egg_type.ground';
        break;
    }
  }
  return key ? (game[key] ?? '') : '';
}
