// Empire-wide bonuses, summed into one object per player from five sources: the civilization's
// ability and unique district, researched techs, researched civics, the current government, and
// slotted policy cards. Cached on the player (as
// _fx, which saves skip) and rebuilt whenever any of those change.
//
// Fields (all optional in the data):
//   resourceBonus / improvementBonus / terrainBonus / districtBonus / buildingBonus: { key: yields }
//   cityYield, capitalYield, perDistrict: yields added to every city, the capital, or per district
//   yieldPct: { yield: percent } on a city's total
//   prodBonus: { key: percent } production toward matching items (see prodKeys)
//   adjacencyPct / buildingPct: { district: percent } on that district's adjacency / its buildings
//   classMoves: { class or tag: moves }
//   builderCharges, wallsHp, cityStrength, moves, sight, heal, freeUnits: plain numbers
//   upgradeDiscount, tileDiscount, buyDiscount, growthPct, boostPct, tourismPct, killCulture: percents
//   classStrength: { class or tag: strength }; extraSlots: { slot kind: count }
//   freeBuildings: [building keys every new city gets]; fullAdjacency: districts count every
//   neighboring district, not every two
//   strength: { melee, ranged, defense, all }; revealMap; victory

import { TECHS } from '../data/techs.js';
import { CIVICS } from '../data/civics.js';
import { GOVERNMENTS, POLICIES } from '../data/government.js';
import { UNITS, hasTag } from '../data/units.js';
import { BUILDINGS } from '../data/buildings.js';
import { CIVS } from '../data/civs.js';

const YIELDS = ['food', 'prod', 'gold', 'science', 'culture'];
const NUMBERS = ['builderCharges', 'wallsHp', 'cityStrength', 'moves', 'sight', 'heal', 'freeUnits', 'upgradeDiscount', 'tileDiscount', 'buyDiscount', 'growthPct', 'boostPct', 'tourismPct', 'killCulture'];
const NESTED = ['resourceBonus', 'improvementBonus', 'terrainBonus', 'districtBonus', 'buildingBonus'];
const FLAT_YIELDS = ['cityYield', 'capitalYield', 'perDistrict', 'yieldPct'];
const FLAT_NUMBERS = ['prodBonus', 'adjacencyPct', 'buildingPct', 'classMoves', 'classStrength', 'extraSlots'];

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
  const fx = { strength: { melee: 0, ranged: 0, defense: 0, all: 0 }, revealMap: false, victory: null, freeBuildings: [], fullAdjacency: false };
  for (const f of [...NESTED, ...FLAT_YIELDS, ...FLAT_NUMBERS]) fx[f] = {};
  for (const n of NUMBERS) fx[n] = 0;
  return fx;
}

export function addEffect(fx, e) {
  if (!e) return;
  for (const f of NESTED) if (e[f]) addNested(fx[f], e[f]);
  for (const f of FLAT_YIELDS) if (e[f]) addYields(fx[f], e[f]);
  for (const f of FLAT_NUMBERS) if (e[f]) for (const k in e[f]) fx[f][k] = (fx[f][k] || 0) + e[f][k];
  for (const n of NUMBERS) if (e[n]) fx[n] += e[n];
  if (e.strength) for (const k in e.strength) fx.strength[k] += e.strength[k];
  if (e.revealMap) fx.revealMap = true;
  if (e.victory) fx.victory = e.victory;
  if (e.freeBuildings) fx.freeBuildings.push(...e.freeBuildings);
  if (e.fullAdjacency) fx.fullAdjacency = true;
}

const signature = (p) => `${p.techs.length}|${(p.civics || []).length}|${p.government || ''}|${(p.policies || []).join(',')}`;

export function effects(state, pid) {
  const p = state.players[pid];
  if (!p) return empty();
  const sig = signature(p);
  const cached = p._fx;
  if (cached && cached.sig === sig) return cached.fx;
  const fx = empty();
  const civ = CIVS[p.civ];
  if (civ) {
    addEffect(fx, civ.ability.effect);
    addEffect(fx, civ.infraEffect);
  }
  for (const key of p.techs) addEffect(fx, TECHS[key]?.effect);
  for (const key of p.civics || []) addEffect(fx, CIVICS[key]?.effect);
  if (p.government) addEffect(fx, GOVERNMENTS[p.government]?.effect);
  for (const key of p.policies || []) if (key) addEffect(fx, POLICIES[key]?.effect);
  for (const n of ['upgradeDiscount', 'tileDiscount', 'buyDiscount']) fx[n] = Math.min(90, fx[n]);
  p._fx = { sig, fx };
  return fx;
}

// The keys a production bonus can name for an item: the item itself, its unit class (mounted units
// count as 'mounted' rather than 'melee') and tags, 'defense' for defensive buildings, and the
// district a building belongs to (a district's own key covers the district too).
export function prodKeys(item) {
  if (item.kind === 'unit') {
    const def = UNITS[item.key];
    return [item.key, ...(def.replaces ? [def.replaces] : []), ...unitClassKeys(item.key)];
  }
  if (item.kind === 'building') {
    const def = BUILDINGS[item.key];
    return [item.key, ...(def.replaces ? [def.replaces] : []), ...(def.district ? [def.district] : []), ...(def.defense ? ['defense'] : [])];
  }
  return [item.key, 'district'];
}

// The class and tag keys a unit matches for class bonuses (mounted units count as 'mounted').
export function unitClassKeys(type) {
  const def = UNITS[type];
  return [...new Set([hasTag(type, 'mounted') ? 'mounted' : def.cls, ...(def.tags || [])])];
}

export function prodBonusPct(fx, item) {
  if (!item) return 0;
  let pct = 0;
  for (const k of new Set(prodKeys(item))) pct += fx.prodBonus[k] || 0;
  return pct;
}

export function maxMoves(state, unit) {
  const fx = effects(state, unit.owner);
  const def = UNITS[unit.type];
  let extra = fx.moves;
  if (def.cls !== 'civilian') for (const k of unitClassKeys(unit.type)) extra += fx.classMoves[k] || 0;
  return def.moves + extra;
}
