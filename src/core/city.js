// Cities: founding, worked tiles, growth, border growth, production and capture.

import { RULES } from '../data/rules.js';
import { UNITS, isMilitary } from '../data/units.js';
import { BUILDINGS } from '../data/buildings.js';
import { DISTRICTS, ENCAMPMENT_PRODUCTION_BONUS } from '../data/districts.js';
import { CIVS, districtNameFor } from '../data/civs.js';
import { TECHS } from '../data/techs.js';
import { CIVICS } from '../data/civics.js';
import { within, distance, neighbors } from './hex.js';
import { touch, citiesOf, unitsAt, spawnUnit, hasTech, hasCivic, hasUnlock, removeUnit, cityAt } from './query.js';
import { IMPROVEMENTS, improvementValid } from '../data/terrain.js';
import { tileYield, cityYields } from './yields.js';
import { validDistrictTiles, districtLimit, districtsUsed, hasDistrict, adjacencyBonus } from './placement.js';
import { canEnter, passable } from './pathfind.js';
import { effects, prodBonusPct } from './effects.js';

export function nextCityName(state, pid) {
  const p = state.players[pid];
  const list = CIVS[p.civ].cities;
  const n = p.nameIdx++;
  return n < list.length ? list[n] : `New ${list[n % list.length]}`;
}

// Why a city can't be founded here, or null if it can.
export function foundReason(state, pid, i) {
  const tile = state.map.tiles[i];
  if (!passable(tile)) return 'Cities must be built on open land';
  if (tile.owner >= 0 && tile.owner !== pid) return "You can't settle inside another civilization's borders";
  for (const id in state.cities) {
    if (distance(state.map, state.cities[id].tile, i) < RULES.cityMinDistance) {
      return `Too close to ${state.cities[id].name}. Cities must be ${RULES.cityMinDistance} tiles apart.`;
    }
  }
  return null;
}

export function claimTile(state, city, i) {
  const t = state.map.tiles[i];
  const previous = t.city >= 0 && t.city !== city.id ? state.cities[t.city] : null;
  t.owner = city.owner;
  t.city = city.id;
  if (previous) {
    previous.worked = previous.worked.filter((w) => w !== i);
    previous.locked = previous.locked.filter((w) => w !== i);
  }
  touch(state);
  return previous;
}

export function foundCity(state, pid, i, events) {
  const p = state.players[pid];
  const first = p.origCapital == null;
  const city = {
    id: state.nextId++,
    name: nextCityName(state, pid),
    owner: pid,
    tile: i,
    pop: 1,
    food: 0,
    prodStock: 0,
    queue: [],
    buildings: [],
    districts: [],
    worked: [],
    locked: [],
    culture: 0,
    claimed: 0,
    hp: RULES.cityHp,
    capital: false,
    origCap: first ? pid : null,
    founder: pid,
    founded: state.turn,
    struck: false,
    lastAttacked: -99,
  };
  state.cities[city.id] = city;
  if (p.capital == null) {
    city.capital = true;
    p.capital = city.id;
  }
  if (first) p.origCapital = city.id;
  const touched = new Set();
  const prev = claimTile(state, city, i);
  if (prev) touched.add(prev);
  for (const t of within(state.map, i, 1)) {
    if (state.map.tiles[t].owner === -1) claimTile(state, city, t);
  }
  assignWorkers(state, city);
  for (const c of touched) assignWorkers(state, c);
  for (const b of effects(state, pid).freeBuildings) {
    const key = buildingFor(state, pid, b);
    if (!city.buildings.includes(key)) city.buildings.push(key);
  }
  events.push({ type: 'cityFounded', city: city.id, owner: pid, tile: i });
  return city;
}

export function workableTiles(state, city) {
  const tiles = state.map.tiles;
  return within(state.map, city.tile, RULES.workRadius).filter((i) => {
    const t = tiles[i];
    return i !== city.tile && t.city === city.id && !t.district && t.t !== 'mountain';
  });
}

export function assignWorkers(state, city) {
  const cands = workableTiles(state, city);
  city.locked = city.locked.filter((i) => cands.includes(i)).slice(0, city.pop);
  const worked = [...city.locked];
  const growing = city.pop < 3;
  const scored = cands
    .filter((i) => !worked.includes(i))
    .map((i) => {
      const y = tileYield(state, i, city.owner);
      return [i, y.food * (growing ? 3 : 2.2) + y.prod * 2 + y.gold * 1.1 + y.science + y.culture];
    })
    .sort((a, b) => b[1] - a[1]);
  for (const [i] of scored) {
    if (worked.length >= city.pop) break;
    worked.push(i);
  }
  city.worked = worked;
}

export function growthThreshold(pop) {
  const k = pop - 1;
  return Math.round(RULES.growthBase + RULES.growthPerPop * k + Math.pow(k, RULES.growthExp));
}

// Food a city needs to grow, after growth bonuses such as Colonial Offices.
export const cityGrowthThreshold = (state, city) => Math.round((growthThreshold(city.pop) * 100) / (100 + effects(state, city.owner).growthPct));

export const borderThreshold = (city) => RULES.borderBase + RULES.borderPerTile * city.claimed;

export function cityTileCount(state, city) {
  let n = 0;
  for (const t of state.map.tiles) if (t.city === city.id) n++;
  return n;
}

export const buyTileCost = (state, city) => Math.round((RULES.buyTileBase + RULES.buyTilePerTile * Math.max(0, cityTileCount(state, city) - 7)) * (1 - effects(state, city.owner).tileDiscount / 100));

export function borderCandidates(state, city) {
  const map = state.map;
  const out = [];
  for (const i of within(map, city.tile, RULES.workRadius)) {
    if (map.tiles[i].owner !== -1) continue;
    if (neighbors(map, i).some((n) => map.tiles[n].city === city.id)) out.push(i);
  }
  return out;
}

export function tileValue(state, i, pid) {
  const y = tileYield(state, i, pid);
  const t = state.map.tiles[i];
  return y.food * 2 + y.prod * 2 + y.gold + (t.res ? 3 : 0);
}

function growBorders(state, city, events) {
  let grew = false;
  for (let guard = 0; guard < 3 && city.culture >= borderThreshold(city); guard++) {
    const cands = borderCandidates(state, city);
    if (!cands.length) {
      city.culture = Math.min(city.culture, borderThreshold(city));
      break;
    }
    let best = cands[0];
    let bestScore = -Infinity;
    for (const i of cands) {
      const s = tileValue(state, i, city.owner) - distance(state.map, i, city.tile) * 0.5;
      if (s > bestScore) {
        bestScore = s;
        best = i;
      }
    }
    city.culture -= borderThreshold(city);
    city.claimed++;
    claimTile(state, city, best);
    events.push({ type: 'border', city: city.id, owner: city.owner, tile: best });
    grew = true;
  }
  if (grew) assignWorkers(state, city);
}

export function cityMaxHp(state, city) {
  let hp = RULES.cityHp;
  for (const b of city.buildings) hp += BUILDINGS[b].defense?.hp || 0;
  if (city.buildings.includes('walls')) hp += effects(state, city.owner).wallsHp;
  return hp;
}

export const cityHasStrike = (city) => city.buildings.some((b) => BUILDINGS[b].defense?.strike);

// ---------- unique units and buildings ----------

// A civilization's own version of a standard unit or building (its unique replacement), or the
// key itself.
export function unitFor(state, pid, key) {
  const civ = state.players[pid]?.civ;
  for (const k in UNITS) if (UNITS[k].civ === civ && UNITS[k].replaces === key) return k;
  return key;
}
export function buildingFor(state, pid, key) {
  const civ = state.players[pid]?.civ;
  for (const k in BUILDINGS) if (BUILDINGS[k].civ === civ && BUILDINGS[k].replaces === key) return k;
  return key;
}

// Why this civilization can't use a unit or building at all (another civ's unique, or a standard
// one its own unique replaces), or null.
function civReason(state, pid, table, key) {
  const def = table[key];
  const civ = state.players[pid]?.civ;
  if (def.civ) return def.civ === civ ? null : `Only ${CIVS[def.civ].name} can build the ${def.name}`;
  const mine = Object.values(table).find((d) => d.civ === civ && d.replaces === key);
  return mine ? `Replaced by your ${mine.name}` : null;
}

// Why player `pid` can't build improvement `kind` on tile `i`, or null if they can.
export function improvementReason(state, pid, i, kind) {
  const tile = state.map.tiles[i];
  const imp = IMPROVEMENTS[kind];
  if (!imp) return 'Unknown improvement';
  if (imp.civ && imp.civ !== state.players[pid].civ) return `Only ${CIVS[imp.civ].name} can build a ${imp.name}`;
  if (tile.owner !== pid) return 'Only inside your borders';
  if (tile.district || cityAt(state, i)) return "Cities and districts can't be improved";
  if (!hasTech(state, pid, imp.tech)) return `Needs ${TECHS[imp.tech].name}`;
  if (!hasCivic(state, pid, imp.civic)) return `Needs ${CIVICS[imp.civic].name}`;
  if (!improvementValid(tile, kind)) return imp.hint;
  if (tile.imp === kind) return 'Already built here';
  return null;
}

// ---------- unit lines ----------

// A unit type can't be built once its owner knows the tech for the next unit in its line.
export function isObsoleteUnit(state, pid, type) {
  const next = UNITS[type].upgradesTo;
  return !!next && hasTech(state, pid, UNITS[next].tech);
}

// The best unit this unit can upgrade to right now (skipping steps already researched), or null.
export function upgradeTarget(state, unit) {
  let target = null;
  let next = UNITS[unit.type].upgradesTo && unitFor(state, unit.owner, UNITS[unit.type].upgradesTo);
  while (next && hasTech(state, unit.owner, UNITS[next].tech)) {
    target = next;
    next = UNITS[next].upgradesTo && unitFor(state, unit.owner, UNITS[next].upgradesTo);
  }
  return target;
}

// `discount` is a percent off, from policies such as Professional Army.
export const upgradeCost = (from, to, discount = 0) => Math.max(10, Math.round((UNITS[to].cost - UNITS[from].cost) * 2 * (1 - discount / 100)));

// ---------- production ----------

export function itemDef(item) {
  if (item.kind === 'unit') return UNITS[item.key];
  if (item.kind === 'building') return BUILDINGS[item.key];
  return DISTRICTS[item.key];
}
export const itemCost = (item) => itemDef(item).cost;
export const itemName = (item) => itemDef(item).name;
export const sameItem = (a, b) => a.kind === b.kind && a.key === b.key;

// Why this city can't build `item` right now, or null if it can. With `inQueue`, the item is
// already queued and is being checked for completion rather than for adding.
export function buildReason(state, city, item, inQueue = false) {
  const def = itemDef(item);
  if (!def) return 'Unknown item';
  if (!hasTech(state, city.owner, def.tech)) return `Needs ${TECHS[def.tech].name}`;
  if (!hasCivic(state, city.owner, def.civic)) return `Needs ${CIVICS[def.civic].name}`;
  const queued = !inQueue && city.queue.some((q) => sameItem(q, item));
  if (item.kind !== 'district') {
    const why = civReason(state, city.owner, item.kind === 'unit' ? UNITS : BUILDINGS, item.key);
    if (why) return why;
  }
  if (item.kind === 'unit' && isObsoleteUnit(state, city.owner, item.key)) return `Replaced by ${UNITS[unitFor(state, city.owner, UNITS[item.key].upgradesTo)].name}`;
  if (item.kind === 'building') {
    if (city.buildings.includes(item.key)) return 'Already built';
    if (queued) return 'Already in the queue';
    if (def.district && !hasDistrict(state, city, def.district) && !city.queue.some((q) => q.kind === 'district' && q.key === def.district)) {
      return `Needs a ${DISTRICTS[def.district].name}`;
    }
    if (def.requires && !city.buildings.includes(def.requires) && !city.queue.some((q) => q.kind === 'building' && q.key === def.requires)) {
      return `Needs ${BUILDINGS[def.requires].name} first`;
    }
  }
  if (item.kind === 'district') {
    if (hasDistrict(state, city, item.key)) return 'Already built';
    if (queued) return 'Already in the queue';
    if (!inQueue && districtsUsed(city) >= districtLimit(city)) return `Needs population ${districtLimit(city) * 3 + 1} for another district`;
    if (!inQueue && !validDistrictTiles(state, city, item.key).length) return 'No valid tile in this city';
  }
  return null;
}

export function buildOptions(state, city) {
  const out = [];
  const add = (kind, key, def) => {
    if (!hasUnlock(state, city.owner, def)) return;
    if (kind !== 'district' && civReason(state, city.owner, kind === 'unit' ? UNITS : BUILDINGS, key)) return;
    const item = { kind, key };
    const name = kind === 'district' ? districtNameFor(state.players[city.owner].civ, key, def.name) : def.name;
    out.push({ ...item, name, cost: def.cost, info: def.info, reason: buildReason(state, city, item) });
  };
  for (const key in DISTRICTS) add('district', key, DISTRICTS[key]);
  for (const key in BUILDINGS) add('building', key, BUILDINGS[key]);
  for (const key in UNITS) {
    if (isObsoleteUnit(state, city.owner, key) && !city.queue.some((q) => q.kind === 'unit' && q.key === key)) continue;
    add('unit', key, UNITS[key]);
  }
  return out;
}

export function productionRate(state, city, item, yields = cityYields(state, city)) {
  let p = yields.prod;
  if (item && item.kind === 'unit' && isMilitary(item.key) && hasDistrict(state, city, 'encampment')) {
    p *= 1 + ENCAMPMENT_PRODUCTION_BONUS;
  }
  return p * (1 + prodBonusPct(effects(state, city.owner), item) / 100);
}

export function turnsLeft(state, city, item, yields = cityYields(state, city), stock = city.prodStock) {
  const rate = productionRate(state, city, item, yields);
  const remaining = itemCost(item) - stock;
  if (remaining <= 0) return 1;
  return rate > 0 ? Math.ceil(remaining / rate) : Infinity;
}

export const buyCost = (state, city, item) => Math.ceil(Math.max(0, itemCost(item) - city.prodStock) * RULES.goldPerProduction * (1 - effects(state, city.owner).buyDiscount / 100));

// Where a newly built unit appears: the city tile if its slot is free, else a free neighbor.
export function spawnTile(state, city, type) {
  const probe = { owner: city.owner, type, id: -1 };
  if (canEnter(state, probe, city.tile, true)) return city.tile;
  for (const n of neighbors(state.map, city.tile)) {
    const t = state.map.tiles[n];
    if (t.owner !== -1 && t.owner !== city.owner) continue;
    if (canEnter(state, probe, n, true)) return n;
  }
  return -1;
}

export function bestDistrictTile(state, city, key, ignore = null) {
  let best = -1;
  let bestScore = -Infinity;
  for (const i of validDistrictTiles(state, city, key, ignore)) {
    const d = distance(state.map, i, city.tile);
    let s = adjacencyBonus(state, i, key) * 10 - tileValue(state, i, city.owner);
    if (key === 'encampment') s += d * 2;
    else s -= d;
    if (s > bestScore) {
      bestScore = s;
      best = i;
    }
  }
  return best;
}

function isObsolete(state, city, item) {
  if (item.kind === 'building') return city.buildings.includes(item.key);
  if (item.kind === 'district') return hasDistrict(state, city, item.key);
  return false;
}

// Finishes `item` in `city`. Returns false if it can't finish yet (no room for the unit, too
// small for a settler, no valid district tile), in which case production waits.
export function completeItem(state, city, item, events) {
  if (item.kind === 'unit') {
    if (item.key === 'settler' && city.pop < RULES.settlerMinPop) return false;
    const tile = spawnTile(state, city, item.key);
    if (tile < 0) return false;
    const unit = spawnUnit(state, city.owner, item.key, tile);
    unit.moves = 0;
    const stats = state.players[city.owner].stats;
    stats.built = { ...(stats.built || {}), [item.key]: ((stats.built || {})[item.key] || 0) + 1 };
    if (isMilitary(item.key)) unit.bonus = city.buildings.reduce((s, b) => s + (BUILDINGS[b].unitBonus || 0), 0);
    if (item.key === 'settler') {
      city.pop--;
      city.food = Math.min(city.food, cityGrowthThreshold(state, city) - 1);
      assignWorkers(state, city);
    }
    events.push({ type: 'built', city: city.id, owner: city.owner, item: { ...item }, unit: unit.id });
    return true;
  }
  if (item.kind === 'building') {
    city.buildings.push(item.key);
    if (BUILDINGS[item.key].defense) city.hp = cityMaxHp(state, city);
    events.push({ type: 'built', city: city.id, owner: city.owner, item: { ...item } });
    return true;
  }
  let tile = item.tile;
  if (tile == null || !validDistrictTiles(state, city, item.key, item).includes(tile)) tile = bestDistrictTile(state, city, item.key, item);
  if (tile < 0) return false;
  state.map.tiles[tile].district = item.key;
  state.map.tiles[tile].imp = null;
  city.districts.push(tile);
  city.worked = city.worked.filter((t) => t !== tile);
  city.locked = city.locked.filter((t) => t !== tile);
  assignWorkers(state, city);
  touch(state);
  events.push({ type: 'built', city: city.id, owner: city.owner, item: { ...item, tile } });
  return true;
}

// Start-of-round processing for one city. Returns its yields for the player totals.
export function processCity(state, city, events) {
  const y = cityYields(state, city);

  city.food += y.surplus;
  if (city.food < 0) {
    if (city.pop > 1) {
      city.pop--;
      events.push({ type: 'starving', city: city.id, owner: city.owner });
      assignWorkers(state, city);
    }
    city.food = 0;
  } else if (city.food >= cityGrowthThreshold(state, city)) {
    city.food -= cityGrowthThreshold(state, city);
    city.pop++;
    events.push({ type: 'grew', city: city.id, owner: city.owner, pop: city.pop });
    assignWorkers(state, city);
  }

  while (city.queue.length && isObsolete(state, city, city.queue[0])) city.queue.shift();
  // Queued units that a new tech has replaced turn into their replacement, keeping the progress.
  for (const q of city.queue) if (q.kind === 'unit' && isObsoleteUnit(state, city.owner, q.key)) q.key = upgradeTarget(state, { type: q.key, owner: city.owner });
  const item = city.queue[0];
  city.prodStock += productionRate(state, city, item, y);
  if (item) {
    const cost = itemCost(item);
    if (city.prodStock >= cost) {
      if (completeItem(state, city, item, events)) {
        city.prodStock -= cost;
        city.queue.shift();
        if (!city.queue.length) events.push({ type: 'queueEmpty', city: city.id, owner: city.owner });
      } else {
        city.prodStock = Math.min(city.prodStock, cost);
      }
    }
  } else {
    city.prodStock = Math.min(city.prodStock, RULES.idleProductionCap);
  }

  city.culture += y.culture;
  growBorders(state, city, events);

  if (city.lastAttacked < state.turn) city.hp = Math.min(cityMaxHp(state, city), city.hp + RULES.cityHpRegen);
  return y;
}

// A captured city changes hands with its territory; units of other players on it are destroyed.
export function transferCity(state, city, newOwner, events) {
  const oldOwner = city.owner;
  for (const u of [...unitsAt(state, city.tile)]) if (u.owner !== newOwner) removeUnit(state, u);
  city.owner = newOwner;
  for (const t of state.map.tiles) if (t.city === city.id) t.owner = newOwner;
  city.pop = Math.max(1, city.pop - 1);
  city.queue = [];
  city.prodStock = 0;
  city.food = 0;
  city.locked = [];
  city.culture = 0;
  city.hp = RULES.capturedCityHp;
  const oldP = state.players[oldOwner];
  if (city.capital) {
    city.capital = false;
    oldP.capital = null;
    const rest = citiesOf(state, oldOwner).sort((a, b) => b.pop - a.pop);
    if (rest.length) {
      rest[0].capital = true;
      oldP.capital = rest[0].id;
    }
  }
  const newP = state.players[newOwner];
  if (newP.capital == null) {
    city.capital = true;
    newP.capital = city.id;
  }
  newP.stats.citiesCaptured++;
  assignWorkers(state, city);
  touch(state);
  events.push({ type: 'cityCaptured', city: city.id, from: oldOwner, to: newOwner, tile: city.tile });
}
