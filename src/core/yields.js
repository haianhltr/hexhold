// What tiles, cities and players produce each turn.

import { TERRAIN, HILLS, FOREST, RESOURCES, IMPROVEMENTS } from '../data/terrain.js';
import { TECHS } from '../data/techs.js';
import { BUILDINGS } from '../data/buildings.js';
import { DISTRICTS } from '../data/districts.js';
import { UNITS } from '../data/units.js';
import { RULES, DIFFICULTY } from '../data/rules.js';
import { adjacencyBonus } from './placement.js';
import { citiesOf } from './query.js';

export const YIELD_KEYS = ['food', 'prod', 'gold', 'science', 'culture'];
export const zeroYield = () => ({ food: 0, prod: 0, gold: 0, science: 0, culture: 0 });

function addInto(y, src, mult = 1) {
  for (const k of YIELD_KEYS) if (src[k]) y[k] += src[k] * mult;
}

export function tileYield(state, i, pid = state.map.tiles[i].owner) {
  const tile = state.map.tiles[i];
  const y = zeroYield();
  if (tile.district) {
    const d = DISTRICTS[tile.district];
    if (d.yield) y[d.yield] = RULES.districtBase + adjacencyBonus(state, i, tile.district);
    return y;
  }
  addInto(y, TERRAIN[tile.t]);
  if (tile.hills) y.prod += HILLS.prod;
  if (tile.forest) y.prod += FOREST.prod;
  if (tile.res) {
    addInto(y, RESOURCES[tile.res]);
    if (pid >= 0) {
      for (const key of state.players[pid].techs) {
        const bonus = TECHS[key].effect?.resourceBonus?.[tile.res];
        if (bonus) addInto(y, bonus);
      }
    }
  }
  if (tile.imp) addInto(y, IMPROVEMENTS[tile.imp]);
  return y;
}

export function cityYields(state, city) {
  const p = state.players[city.owner];
  const y = zeroYield();
  const center = tileYield(state, city.tile, city.owner);
  y.food += Math.max(2, center.food);
  y.prod += Math.max(1, center.prod);
  y.gold += center.gold;
  for (const t of city.worked) addInto(y, tileYield(state, t, city.owner));
  for (const t of city.districts) addInto(y, tileYield(state, t, city.owner));
  y.science += RULES.sciencePerPop * city.pop;
  y.culture += RULES.culturePerCity;
  if (city.capital) addInto(y, RULES.palace);
  for (const b of city.buildings) addInto(y, BUILDINGS[b]);
  let sciencePct = 0;
  let culturePct = 0;
  for (const key of p.techs) {
    const e = TECHS[key].effect;
    if (e?.sciencePct) sciencePct += e.sciencePct;
    if (e?.culturePct) culturePct += e.culturePct;
  }
  y.science *= 1 + sciencePct / 100;
  y.culture *= 1 + culturePct / 100;
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
  return Math.max(0, military - citiesOf(state, pid).length * RULES.freeUnitsPerCity);
}

export function playerYields(state, pid) {
  const total = zeroYield();
  for (const c of citiesOf(state, pid)) addInto(total, cityYields(state, c));
  total.upkeep = unitUpkeep(state, pid);
  total.goldNet = total.gold - total.upkeep;
  return total;
}
