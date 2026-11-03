/**
 * Lightweight route planner: nearest-neighbour tour improved with 2-opt.
 * Straight-line distances on the map plane (no road graph) — it is a guide,
 * not turn-by-turn navigation.
 */
export interface Point {
  lat: number;
  lng: number;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.lat - b.lat, a.lng - b.lng);
}

export function pathLength(points: readonly Point[]): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) d += distance(points[i - 1]!, points[i]!);
  return d;
}

function nearestNeighbour<T extends Point>(start: Point, points: readonly T[]): T[] {
  const remaining = [...points];
  const out: T[] = [];
  let current: Point = start;
  while (remaining.length) {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = distance(current, remaining[i]!);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    const [next] = remaining.splice(best, 1);
    out.push(next!);
    current = next!;
  }
  return out;
}

/** 2-opt on an open path that starts at `start` (fixed). Bounded iterations for predictable cost. */
function twoOpt<T extends Point>(start: Point, tour: T[], maxPasses = 20): T[] {
  const path: Point[] = [start, ...tour];
  let improved = true;
  let passes = 0;
  while (improved && passes++ < maxPasses) {
    improved = false;
    for (let i = 1; i < path.length - 1; i++) {
      for (let k = i + 1; k < path.length; k++) {
        const a = path[i - 1]!;
        const b = path[i]!;
        const c = path[k]!;
        const d = path[k + 1];
        const before = distance(a, b) + (d ? distance(c, d) : 0);
        const after = distance(a, c) + (d ? distance(b, d) : 0);
        if (after + 1e-9 < before) {
          const reversed = path.slice(i, k + 1).reverse();
          path.splice(i, k - i + 1, ...reversed);
          improved = true;
        }
      }
    }
  }
  return path.slice(1) as T[];
}

export function planRoute<T extends Point>(start: Point, points: readonly T[]): T[] {
  if (points.length <= 1) return [...points];
  return twoOpt(start, nearestNeighbour(start, points));
}
