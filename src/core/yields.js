// What tiles, cities and players produce each turn. Tech, civic, government and policy bonuses come
// from core/effects.js.

import { TERRAIN, HILLS, FOREST, RESOURCES, IMPROVEMENTS } from '../data/terrain.js';
import { BUILDINGS } from '../data/buildings.js';
import { DISTRICTS } from '../data/districts.js';
import { UNITS } from '../data/units.js';
import { RULES, DIFFICULTY } from '../data/rules.js';
import { adjacencyBonus } from './placement.js';
import { citiesOf } from './query.js';
import { effects } from './effects.js';

export const YIELD_KEYS = ['food', 'prod', 'gold', 'science', 'culture'];
export const zeroYield = () => ({ food: 0, prod: 0, gold: 0, science: 0, culture: 0 });

function addInto(y, src, mult = 1) {
  if (!src) return;
  for (const k of YIELD_KEYS) if (src[k]) y[k] += src[k] * mult;
}

export function tileYield(state, i, pid = state.map.tiles[i].owner) {
  const tile = state.map.tiles[i];
  const y = zeroYield();
  const fx = pid >= 0 ? effects(state, pid) : null;
  if (tile.district) {
    const d = DISTRICTS[tile.district];
    if (d.yield) y[d.yield] = RULES.districtBase + adjacencyBonus(state, i, tile.district) * (1 + (fx?.adjacencyPct[tile.district] || 0) / 100);
    if (fx) addInto(y, fx.districtBonus[tile.district]);
    return y;
  }
  addInto(y, TERRAIN[tile.t]);
  if (tile.hills) y.prod += HILLS.prod;
  if (tile.forest) y.prod += FOREST.prod;
  if (tile.res) addInto(y, RESOURCES[tile.res]);
  if (tile.imp) addInto(y, IMPROVEMENTS[tile.imp]);
  if (fx) {
    if (tile.res) addInto(y, fx.resourceBonus[tile.res]);
    if (tile.imp) addInto(y, fx.improvementBonus[tile.imp]);
    addInto(y, fx.terrainBonus[tile.t]);
  }
  return y;
}

export function cityYields(state, city) {
  const p = state.players[city.owner];
  const fx = effects(state, city.owner);
  const y = zeroYield();
  const center = tileYield(state, city.tile, city.owner);
  y.food += Math.max(2, center.food);
  y.prod += Math.max(1, center.prod);
  y.gold += center.gold;
  for (const t of city.worked) addInto(y, tileYield(state, t, city.owner));
  for (const t of city.districts) addInto(y, tileYield(state, t, city.owner));
  y.science += RULES.sciencePerPop * city.pop;
  y.culture += RULES.culturePerCity;
  if (city.capital) {
    addInto(y, RULES.palace);
    addInto(y, fx.capitalYield);
  }
  for (const b of city.buildings) {
    const def = BUILDINGS[b];
    addInto(y, def, 1 + (def.district ? fx.buildingPct[def.district] || 0 : 0) / 100);
    addInto(y, fx.buildingBonus[b]);
  }
  addInto(y, fx.cityYield);
  addInto(y, fx.perDistrict, city.districts.length);
  for (const k of YIELD_KEYS) if (fx.yieldPct[k]) y[k] *= 1 + fx.yieldPct[k] / 100;
  if (!p.human) {
    const m = DIFFICULTY[state.difficulty].aiYield;
    y.prod *= m;
    y.gold *= m;
    y.science *= m;
    y.culture *= m;
  }
  y.eaten = city.pop * RULES.foodPerPop;
  y.surplus = y.food - y.eaten;
  return y;
}

export function unitUpkeep(state, pid) {
  let military = 0;
  for (const id in state.units) {
    const u = state.units[id];
    if (u.owner === pid && UNITS[u.type].cls !== 'civilian') military++;
  }
  return Math.max(0, military - citiesOf(state, pid).length * (RULES.freeUnitsPerCity + effects(state, pid).freeUnits));
}

export function playerYields(state, pid) {
  const total = zeroYield();
  for (const c of citiesOf(state, pid)) addInto(total, cityYields(state, c));
  total.upkeep = unitUpkeep(state, pid);
  total.goldNet = total.gold - total.upkeep;
  return total;
}
