/**
 * Normalised data model produced by `scripts/build-data.ts` from the vendored
 * upstream snapshot (`upstream/`). This file must stay import-free: it is shared
 * by the browser bundle and by the Node build scripts.
 */

/** Groups that share a single cycle number in the game (from upstream cycles.json). */
export type CycleGroup =
  | 'flower'
  | 'tarot_cards'
  | 'lost_jewelry'
  | 'bottle'
  | 'egg'
  | 'arrowhead'
  | 'heirlooms'
  | 'coin'
  | 'fossils'
  | 'random';

export const CYCLE_GROUPS: readonly CycleGroup[] = [
  'flower',
  'tarot_cards',
  'lost_jewelry',
  'bottle',
  'egg',
  'arrowhead',
  'heirlooms',
  'coin',
  'fossils',
  'random',
];

export type CycleNumber = 1 | 2 | 3 | 4 | 5 | 6;

/** One day of the published cycle calendar. `date` is a UTC `YYYY-MM-DD` string. */
export interface CycleDay {
  date: string;
  cycles: Record<CycleGroup, CycleNumber>;
}

/** 0 = none, 1 = shovel, 2 = metal detector. */
export type Tool = 0 | 1 | 2;
/** -1 = below ground level / under something, 0 = normal, 1 = elevated. */
export type Height = -1 | 0 | 1;

export interface Category {
  id: string;
  cycleGroup: CycleGroup;
  /** True when the markers of this category can be any item (random spots). */
  random: boolean;
  /** Ids of the collection items belonging to this category (may be empty). */
  itemIds: string[];
}

export interface Collection {
  id: string;
  /** Total sell value of a full set (RDO$). */
  value: number;
  itemIds: string[];
}

export interface Item {
  id: string;
  collection: string;
  price: number;
}

export interface MarkerData {
  /** Unique, stable id: `${text}_${cycle}` (matches upstream marker ids). */
  id: string;
  text: string;
  category: string;
  itemId: string | null;
  cycle: CycleNumber;
  lat: number;
  lng: number;
  tool: Tool;
  height: Height;
  video?: string;
  /** Random spots only: `mounds` | `chest` | `shallow`. */
  spotType?: string;
}

export interface CollectiblesFile {
  schema: 1;
  upstreamCommit: string;
  generatedAt: string;
  categories: Category[];
  collections: Collection[];
  items: Item[];
  markers: MarkerData[];
}

export interface WeeklySet {
  id: string;
  value: number;
  itemIds: string[];
}

export interface PointOfInterest {
  id: string;
  lat: number;
  lng: number;
}

export interface AreaOfInterest extends PointOfInterest {
  radius: number;
  locations: PointOfInterest[];
}

export interface NazarLocation extends PointOfInterest {
  /** Key used by the community APIs, e.g. `MPSW_LOCATION_04`. */
  key: string;
}

export interface WorldFile {
  schema: 1;
  weeklySets: WeeklySet[];
  treasures: AreaOfInterest[];
  legendaryAnimals: AreaOfInterest[];
  fastTravel: PointOfInterest[];
  nazar: NazarLocation[];
}

export interface RoadRegion {
  id: string;
  /** Label anchor (centroid of the region's road network). */
  label: [number, number];
  /** Polylines as flat [lat, lng, lat, lng, ...] arrays (compact). */
  lines: number[][];
}

export interface BasemapFile {
  schema: 1;
  bounds: [[number, number], [number, number]];
  regions: RoadRegion[];
  railroads: number[][];
}

export interface CyclesFile {
  schema: 1;
  days: CycleDay[];
}

/** Flat key -> string dictionary for game strings. */
export type GameStrings = Record<string, string>;
