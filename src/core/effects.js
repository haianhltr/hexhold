// Civilization-wide bonuses from researched techs, summed into one object per player. Cached on the
// player (as _fx, which saves skip) and rebuilt whenever the number of known techs changes.

import { TECHS } from '../data/techs.js';
import { UNITS } from '../data/units.js';

const YIELDS = ['food', 'prod', 'gold', 'science', 'culture'];

function addYields(into, src) {
  for (const k of YIELDS) if (src[k]) into[k] = (into[k] || 0) + src[k];
}

function addNested(into, src) {
  for (const key in src) {
    if (!into[key]) into[key] = {};
    addYields(into[key], src[key]);
  }
}

function empty() {
  return {
    resourceBonus: {},
    improvementBonus: {},
    terrainBonus: {},
    districtBonus: {},
    buildingBonus: {},
    cityYield: {},
    yieldPct: {},
    builderCharges: 0,
    wallsHp: 0,
    cityStrength: 0,
    moves: 0,
    sight: 0,
    heal: 0,
    strength: { melee: 0, ranged: 0, defense: 0, all: 0 },
    revealMap: false,
    victory: null,
  };
}

export function effects(state, pid) {
  const p = state.players[pid];
  if (!p) return empty();
  const cached = p._fx;
  if (cached && cached.n === p.techs.length) return cached.fx;
  const fx = empty();
  for (const key of p.techs) {
    const e = TECHS[key]?.effect;
    if (!e) continue;
    for (const field of ['resourceBonus', 'improvementBonus', 'terrainBonus', 'districtBonus', 'buildingBonus']) {
      if (e[field]) addNested(fx[field], e[field]);
    }
    if (e.cityYield) addYields(fx.cityYield, e.cityYield);
    if (e.yieldPct) addYields(fx.yieldPct, e.yieldPct);
    for (const n of ['builderCharges', 'wallsHp', 'cityStrength', 'moves', 'sight', 'heal']) if (e[n]) fx[n] += e[n];
    if (e.strength) for (const k in e.strength) fx.strength[k] += e.strength[k];
    if (e.revealMap) fx.revealMap = true;
    if (e.victory) fx.victory = e.victory;
  }
  p._fx = { n: p.techs.length, fx };
  return fx;
}

export function maxMoves(state, unit) {
  return UNITS[unit.type].moves + effects(state, unit.owner).moves;
}
