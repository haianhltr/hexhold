// Movement costs, who may stand where, A* pathfinding and this-turn reach.
// Movement rule: a unit with any moves left may enter a tile, even one costing more than it has.

import { neighbors, distance } from './hex.js';
import { UNITS } from '../data/units.js';
import { atWar, cityAt, unitsAt, militaryAt } from './query.js';

export const passable = (tile) => tile.t !== 'mountain' && tile.t !== 'coast' && tile.t !== 'ocean';
export const moveCost = (tile) => Math.min(3, 1 + (tile.hills ? 1 : 0) + (tile.forest ? 1 : 0));

// May `unit` step onto tile i? With `end`, the unit would stop there, so it also needs a free slot:
// one military and one civilian unit may share a tile.
export function canEnter(state, unit, i, end = false) {
  const tile = state.map.tiles[i];
  if (!passable(tile)) return false;
  if (tile.owner >= 0 && tile.owner !== unit.owner && !atWar(state, unit.owner, tile.owner)) return false;
  const city = cityAt(state, i);
  if (city && city.owner !== unit.owner) return false;
  const civilian = UNITS[unit.type].cls === 'civilian';
  for (const o of unitsAt(state, i)) {
    if (o.owner !== unit.owner) return false;
    if (end && o.id !== unit.id && (UNITS[o.type].cls === 'civilian') === civilian) return false;
  }
  return true;
}

// Is tile i next to an enemy military unit or city? Moving between two such tiles costs all
// remaining moves (zone of control).
export function inZoc(state, unit, i) {
  for (const n of neighbors(state.map, i)) {
    const m = militaryAt(state, n);
    if (m && atWar(state, unit.owner, m.owner)) return true;
    const c = cityAt(state, n);
    if (c && atWar(state, unit.owner, c.owner)) return true;
  }
  return false;
}

class MinHeap {
  constructor() {
    this.items = [];
    this.prios = [];
  }
  get size() {
    return this.items.length;
  }
  push(item, prio) {
    const a = this.items;
    const p = this.prios;
    let i = a.length;
    a.push(item);
    p.push(prio);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (p[parent] <= prio) break;
      a[i] = a[parent];
      p[i] = p[parent];
      i = parent;
    }
    a[i] = item;
    p[i] = prio;
  }
  pop() {
    const a = this.items;
    const p = this.prios;
    const top = a[0];
    const lastItem = a.pop();
    const lastPrio = p.pop();
    if (a.length) {
      let i = 0;
      const n = a.length;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        let mp = lastPrio;
        if (l < n && p[l] < mp) {
          m = l;
          mp = p[l];
        }
        if (r < n && p[r] < mp) m = r;
        if (m === i) break;
        a[i] = a[m];
        p[i] = p[m];
        i = m;
      }
      a[i] = lastItem;
      p[i] = lastPrio;
    }
    return top;
  }
}

// Shortest path (by move cost) from the unit to `target`, excluding the start tile, or null.
// With `attack`, the target may hold an enemy (the last step is the attack).
export function findPath(state, unit, target, { attack = false, maxCost = Infinity } = {}) {
  const map = state.map;
  const start = unit.tile;
  if (target === start || target < 0) return null;
  const N = map.tiles.length;
  const g = new Float64Array(N).fill(Infinity);
  const prev = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const heap = new MinHeap();
  g[start] = 0;
  heap.push(start, distance(map, start, target));
  while (heap.size) {
    const i = heap.pop();
    if (closed[i]) continue;
    closed[i] = 1;
    if (i === target) break;
    for (const n of neighbors(map, i)) {
      if (closed[n]) continue;
      const isTarget = n === target;
      const ok = isTarget && attack ? passable(map.tiles[n]) : canEnter(state, unit, n, isTarget);
      if (!ok) continue;
      const cost = g[i] + (isTarget && attack ? 1 : moveCost(map.tiles[n]));
      if (cost > maxCost || cost >= g[n]) continue;
      g[n] = cost;
      prev[n] = i;
      heap.push(n, cost + distance(map, n, target));
    }
  }
  if (g[target] === Infinity) return null;
  const path = [];
  for (let i = target; i !== start; i = prev[i]) path.push(i);
  return path.reverse();
}

// Tiles the unit can end its move on this turn.
export function reachableTiles(state, unit) {
  const map = state.map;
  const N = map.tiles.length;
  const spent = new Float64Array(N).fill(Infinity);
  const heap = new MinHeap();
  const result = new Set();
  const budget = unit.moves;
  if (budget <= 0) return result;
  spent[unit.tile] = 0;
  heap.push(unit.tile, 0);
  while (heap.size) {
    const i = heap.pop();
    const s = spent[i];
    if (s >= budget) continue;
    const fromZoc = inZoc(state, unit, i);
    for (const n of neighbors(map, i)) {
      if (!canEnter(state, unit, n, false)) continue;
      const ns = fromZoc && inZoc(state, unit, n) ? budget : Math.min(budget, s + moveCost(map.tiles[n]));
      if (ns >= spent[n]) continue;
      spent[n] = ns;
      if (canEnter(state, unit, n, true)) result.add(n);
      heap.push(n, ns);
    }
  }
  return result;
}

// For each step of a path, the turn on which the unit arrives there (0 = this turn).
export function pathTurns(state, unit, path) {
  const max = UNITS[unit.type].moves;
  let left = unit.moves;
  let turn = 0;
  return path.map((i) => {
    if (left <= 0) {
      turn++;
      left = max;
    }
    left -= moveCost(state.map.tiles[i]);
    return turn;
  });
}
