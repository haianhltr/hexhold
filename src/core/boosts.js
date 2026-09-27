// Eurekas and Inspirations: meeting a tech's or civic's goal (data/boosts.js) gives
// RULES.boostPct of its cost at once, plus any boost bonus (China's Mandate of Heaven). Goals are
// checked after every action and at the end of every round, against a snapshot of the empire.

import { EUREKAS, INSPIRATIONS } from '../data/boosts.js';
import { TECHS, TECH_KEYS } from '../data/techs.js';
import { CIVICS, CIVIC_KEYS } from '../data/civics.js';
import { UNITS } from '../data/units.js';
import { BUILDINGS } from '../data/buildings.js';
import { DISTRICTS } from '../data/districts.js';
import { IMPROVEMENTS, RESOURCES } from '../data/terrain.js';
import { GOVERNMENTS } from '../data/government.js';
import { RULES } from '../data/rules.js';
import { neighbors } from './hex.js';
import { citiesOf, unitsOf } from './query.js';
import { effects } from './effects.js';
import { tourismOf } from './tourism.js';

const KEYED = new Set(['building', 'district', 'improve', 'resource', 'built', 'tech', 'civic']);
const TRACK = {
  tech: { goals: EUREKAS, keys: TECH_KEYS, table: TECHS, done: 'techs', boosted: 'eurekas', progress: 'progress' },
  civic: { goals: INSPIRATIONS, keys: CIVIC_KEYS, table: CIVICS, done: 'civics', boosted: 'inspirations', progress: 'civicProgress' },
};

export function boostGoal(track, key) {
  const raw = TRACK[track].goals[key];
  if (!raw) return null;
  return KEYED.has(raw[0]) ? { type: raw[0], key: raw[1], n: raw[2] ?? 1 } : { type: raw[0], n: raw[1] };
}

export const isBoosted = (p, track, key) => (p[TRACK[track].boosted] || []).includes(key);
export const boostShare = (state, pid) => RULES.boostPct + effects(state, pid).boostPct;

// ---------- goal text ----------

const vowel = (s) => /^[AEIOU]/.test(s);
function plural(name) {
  if (/(man)$/.test(name)) return name.replace(/man$/, 'men');
  if (name === 'Man-at-Arms') return 'Men-at-Arms';
  if (/(Infantry|Artillery|Cavalry|Armor|s)$/.test(name)) return name;
  if (/[^aeiou]y$/.test(name)) return `${name.slice(0, -1)}ies`;
  if (/(x|ch|sh)$/.test(name)) return `${name}es`;
  return `${name}s`;
}
const count = (n, name) => (n === 1 ? (name.endsWith('s') ? name : `${vowel(name) ? 'an' : 'a'} ${name}`) : `${n} ${plural(name)}`);

export function goalText(goal) {
  const { type, key, n } = goal;
  switch (type) {
    case 'found': return n === 1 ? 'Found a city' : `Found ${n} cities`;
    case 'coastCity': return n === 1 ? 'Found a city on the coast' : `Have ${n} cities on the coast`;
    case 'pop': return `Grow a city to ${n} population`;
    case 'tiles': return `Own ${n} tiles`;
    case 'building': return `Build ${count(n, BUILDINGS[key].name)}`;
    case 'district': return `Build ${count(n, DISTRICTS[key].name)}`;
    case 'districts': return n === 1 ? 'Build a district' : `Have ${n} districts`;
    case 'improve': return `Build ${count(n, IMPROVEMENTS[key].name)}`;
    case 'improvements': return `Improve ${n} tiles`;
    case 'resource': return n === 1 ? `Improve a ${RESOURCES[key].name} resource` : `Improve ${n} ${RESOURCES[key].name} resources`;
    case 'built': return `Train ${count(n, UNITS[key].name)}`;
    case 'kills': return n === 1 ? 'Destroy an enemy unit' : `Destroy ${n} enemy units`;
    case 'meet': return n === 1 ? 'Meet another civilization' : `Meet ${n} civilizations`;
    case 'war': return n === 1 ? 'Go to war' : `Go to war ${n} times`;
    case 'peace': return 'Make peace';
    case 'army': return `Have ${n} military units`;
    case 'tech': return `Research ${TECHS[key].name}`;
    case 'civic': return `Complete ${CIVICS[key].name}`;
    case 'gov': return `Adopt a Tier ${n} government`;
    case 'gold': return `Have ${n} Gold`;
    case 'explored': return `Explore ${n}% of the map`;
    case 'tourism': return `Reach ${n} Tourism per turn`;
    default: return 'Unknown goal';
  }
}

// ---------- goal progress ----------

// Counts over the whole empire, gathered in one pass.
function snapshot(state, pid) {
  const p = state.players[pid];
  const s = { cities: 0, coastCities: 0, maxPop: 0, buildings: {}, districts: {}, districtsTotal: 0, imps: {}, impsTotal: 0, res: {}, tiles: 0, explored: 0 };
  const isWater = (i) => ['coast', 'ocean'].includes(state.map.tiles[i].t);
  for (const c of citiesOf(state, pid)) {
    s.cities++;
    s.maxPop = Math.max(s.maxPop, c.pop);
    if (neighbors(state.map, c.tile).some(isWater)) s.coastCities++;
    for (const b of c.buildings) {
      s.buildings[b] = (s.buildings[b] || 0) + 1;
      const base = BUILDINGS[b].replaces;
      if (base) s.buildings[base] = (s.buildings[base] || 0) + 1;
    }
    for (const t of c.districts) {
      const d = state.map.tiles[t].district;
      s.districts[d] = (s.districts[d] || 0) + 1;
      s.districtsTotal++;
    }
  }
  const tiles = state.map.tiles;
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    if (p.explored[i]) s.explored++;
    if (t.owner !== pid) continue;
    s.tiles++;
    if (t.imp && !t.district) {
      s.imps[t.imp] = (s.imps[t.imp] || 0) + 1;
      s.impsTotal++;
      if (t.res) s.res[t.res] = (s.res[t.res] || 0) + 1;
    }
  }
  s.explored = Math.floor((s.explored * 100) / tiles.length);
  return s;
}

function goalValue(state, pid, goal, snap) {
  const p = state.players[pid];
  const s = snap();
  const stats = p.stats || {};
  switch (goal.type) {
    case 'found': return s.cities;
    case 'coastCity': return s.coastCities;
    case 'pop': return s.maxPop;
    case 'tiles': return s.tiles;
    case 'building': return s.buildings[goal.key] || 0;
    case 'district': return s.districts[goal.key] || 0;
    case 'districts': return s.districtsTotal;
    case 'improve': return s.imps[goal.key] || 0;
    case 'improvements': return s.impsTotal;
    case 'resource': return s.res[goal.key] || 0;
    case 'built': {
      let n = 0;
      for (const [k, v] of Object.entries(stats.built || {})) if (k === goal.key || UNITS[k]?.replaces === goal.key) n += v;
      return n;
    }
    case 'kills': return stats.kills || 0;
    case 'meet': return state.met.filter((k) => k.split('-').map(Number).includes(pid)).length;
    case 'war': return stats.wars || 0;
    case 'peace': return stats.peace || 0;
    case 'army': return unitsOf(state, pid).filter((u) => UNITS[u.type].cls !== 'civilian').length;
    case 'tech': return p.techs.includes(goal.key) ? 1 : 0;
    case 'civic': return (p.civics || []).includes(goal.key) ? 1 : 0;
    case 'gov': return p.government ? GOVERNMENTS[p.government].tier : 0;
    case 'gold': return Math.floor(p.gold);
    case 'explored': return s.explored;
    case 'tourism': return Math.floor(tourismOf(state, pid));
    default: return 0;
  }
}

// How far the player is toward a goal, for the tree screens: { have, need }.
export function goalProgress(state, pid, goal) {
  let cached = null;
  const snap = () => (cached ||= snapshot(state, pid));
  return { have: Math.min(goal.n, goalValue(state, pid, goal, snap)), need: goal.n };
}

// ---------- checking and applying ----------

export function checkBoosts(state, pid, events) {
  const p = state.players[pid];
  if (!p || !p.alive) return;
  let cached = null;
  const snap = () => (cached ||= snapshot(state, pid));
  for (const track of ['tech', 'civic']) {
    const T = TRACK[track];
    if (!p[T.boosted]) p[T.boosted] = [];
    for (const key of T.keys) {
      if (p[T.done].includes(key) || p[T.boosted].includes(key)) continue;
      const goal = boostGoal(track, key);
      if (goal && goalValue(state, pid, goal, snap) >= goal.n) applyBoost(state, pid, track, key, events);
    }
  }
}

function applyBoost(state, pid, track, key, events) {
  const p = state.players[pid];
  const T = TRACK[track];
  p[T.boosted].push(key);
  const cost = T.table[key].cost;
  const have = p[T.progress][key] || 0;
  p[T.progress][key] = Math.min(cost, have + Math.round((cost * boostShare(state, pid)) / 100));
  events.push({ type: 'boost', player: pid, track, key });
}
