// Read helpers over the game state, plus the few primitives that create, move and remove units.
// Anything that changes positions calls touch(), which invalidates the cached lookups.

import { UNITS } from '../data/units.js';
import { RULES } from '../data/rules.js';
import { effects, maxMoves } from './effects.js';

const EMPTY = Object.freeze([]);

export function touch(state) {
  state._ver = (state._ver || 0) + 1;
}

function occupancy(state) {
  if (state._occ && state._occVer === state._ver) return state._occ;
  const map = new Map();
  for (const id in state.units) {
    const u = state.units[id];
    let list = map.get(u.tile);
    if (!list) map.set(u.tile, (list = []));
    list.push(u);
  }
  state._occ = map;
  state._occVer = state._ver;
  return map;
}

export const unitsAt = (state, tile) => occupancy(state).get(tile) || EMPTY;
export const militaryAt = (state, tile) => unitsAt(state, tile).find((u) => UNITS[u.type].cls !== 'civilian') || null;
export const civilianAt = (state, tile) => unitsAt(state, tile).find((u) => UNITS[u.type].cls === 'civilian') || null;

// The city whose center is on this tile, if any.
export function cityAt(state, tile) {
  const t = state.map.tiles[tile];
  if (t.city < 0) return null;
  const c = state.cities[t.city];
  return c && c.tile === tile ? c : null;
}

// The city that owns this tile, if any.
export function owningCity(state, tile) {
  const t = state.map.tiles[tile];
  return t.city >= 0 ? state.cities[t.city] || null : null;
}

export const citiesOf = (state, pid) => Object.values(state.cities).filter((c) => c.owner === pid);
export const unitsOf = (state, pid) => Object.values(state.units).filter((u) => u.owner === pid);
export const hasTech = (state, pid, tech) => !tech || state.players[pid].techs.includes(tech);
export const humanId = (state) => state.players.findIndex((p) => p.human);

export function pairKey(a, b) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}
export const atWar = (state, a, b) => a !== b && a >= 0 && b >= 0 && state.war.includes(pairKey(a, b));
export const haveMet = (state, a, b) => a === b || state.met.includes(pairKey(a, b));

export function spawnUnit(state, owner, type, tile) {
  const def = UNITS[type];
  const unit = {
    id: state.nextId++,
    type,
    owner,
    tile,
    hp: 100,
    moves: 0,
    fortified: false,
    sleeping: false,
    path: null,
    acted: false,
    bonus: 0,
  };
  unit.moves = maxMoves(state, unit);
  if (def.charges) unit.charges = def.charges + effects(state, owner).builderCharges;
  state.units[unit.id] = unit;
  touch(state);
  return unit;
}

export function placeUnit(state, unit, tile) {
  unit.tile = tile;
  touch(state);
}

export function removeUnit(state, unit) {
  delete state.units[unit.id];
  touch(state);
}

export function year(state, turn = state.turn) {
  return RULES.yearStart + (turn - 1) * RULES.yearsPerTurn;
}

export function yearLabel(state, turn = state.turn) {
  const y = year(state, turn);
  return y < 0 ? `${-y} BC` : y === 0 ? '1 AD' : `${y} AD`;
}
