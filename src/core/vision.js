// Fog of war: what each player can see now, what they have explored, and whom they have met.

import { within, neighbors } from './hex.js';
import { UNITS } from '../data/units.js';
import { pairKey, unitsAt } from './query.js';

export function sightOf(state, unit) {
  return UNITS[unit.type].sight + (state.map.tiles[unit.tile].hills ? 1 : 0);
}

function computeVisible(state, pid) {
  const map = state.map;
  const vis = new Uint8Array(map.tiles.length);
  for (const id in state.units) {
    const u = state.units[id];
    if (u.owner !== pid) continue;
    for (const t of within(map, u.tile, sightOf(state, u))) vis[t] = 1;
  }
  for (const id in state.cities) {
    const c = state.cities[id];
    if (c.owner !== pid) continue;
    for (const t of within(map, c.tile, 3)) vis[t] = 1;
  }
  for (let i = 0; i < map.tiles.length; i++) {
    if (map.tiles[i].owner !== pid) continue;
    vis[i] = 1;
    for (const n of neighbors(map, i)) vis[n] = 1;
  }
  return vis;
}

// Cached per player until anything moves (see touch()).
export function visibleTiles(state, pid) {
  if (!state._vis) state._vis = {};
  const cached = state._vis[pid];
  if (cached && cached.ver === state._ver) return cached.vis;
  const vis = computeVisible(state, pid);
  state._vis[pid] = { ver: state._ver, vis };
  return vis;
}

export function revealAround(state, pid, tile, radius) {
  const explored = state.players[pid].explored;
  for (const t of within(state.map, tile, radius)) explored[t] = 1;
}

export function meet(state, a, b, events) {
  if (a === b) return;
  const key = pairKey(a, b);
  if (state.met.includes(key)) return;
  state.met.push(key);
  events.push({ type: 'met', a, b });
}

export function refreshVision(state, pid, events) {
  const p = state.players[pid];
  if (!p.alive) return;
  const vis = visibleTiles(state, pid);
  const explored = p.explored;
  const tiles = state.map.tiles;
  for (let i = 0; i < vis.length; i++) {
    if (!vis[i]) continue;
    explored[i] = 1;
    const owner = tiles[i].owner;
    if (owner >= 0 && owner !== pid) meet(state, pid, owner, events);
    for (const u of unitsAt(state, i)) if (u.owner !== pid) meet(state, pid, u.owner, events);
  }
}
