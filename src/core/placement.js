// District placement rules and adjacency bonuses (the Civ 6 signature mechanic).

import { neighbors, within, distance } from './hex.js';
import { DISTRICTS } from '../data/districts.js';
import { RULES } from '../data/rules.js';
import { cityAt, unitsAt } from './query.js';
import { effects } from './effects.js';

function surroundings(state, i) {
  const map = state.map;
  const s = { mountains: 0, districts: 0, water: 0, mines: 0, fish: 0, center: false };
  for (const n of neighbors(map, i)) {
    const t = map.tiles[n];
    if (t.t === 'mountain') s.mountains++;
    if (t.t === 'coast' || t.t === 'ocean') s.water++;
    if (t.imp === 'mine') s.mines++;
    if (t.res === 'fish') s.fish++;
    const isCenter = !!cityAt(state, n);
    if (isCenter) s.center = true;
    if (t.district || isCenter) s.districts++;
  }
  return s;
}

export function adjacencyBonus(state, i, key, owner = state.map.tiles[i].owner) {
  const s = surroundings(state, i);
  // Neighboring districts give +1 per two, or +1 each with Japan's Meiji Restoration.
  const full = owner >= 0 && effects(state, owner).fullAdjacency;
  const shared = full ? s.districts : Math.floor(s.districts / 2);
  switch (key) {
    case 'campus':
      return s.mountains + shared;
    case 'commercial':
      return (s.water > 0 ? 2 : 0) + shared;
    case 'industrial':
      return s.mines + shared;
    case 'theater':
      return shared;
    case 'harbor':
      return (s.center ? 2 : 0) + s.fish + shared;
    default:
      return 0;
  }
}

// Plain-language reasons behind a tile's bonus, for tooltips.
export function adjacencyReasons(state, i, key, owner = state.map.tiles[i].owner) {
  const s = surroundings(state, i);
  const full = owner >= 0 && effects(state, owner).fullAdjacency;
  const out = [];
  const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;
  if (key === 'campus' && s.mountains) out.push(`+${s.mountains} from ${plural(s.mountains, 'mountain')}`);
  if (key === 'commercial' && s.water) out.push('+2 next to coast');
  if (key === 'industrial' && s.mines) out.push(`+${s.mines} from ${plural(s.mines, 'mine')}`);
  if (key === 'harbor' && s.center) out.push('+2 next to the city center');
  if (key === 'harbor' && s.fish) out.push(`+${s.fish} from Fish`);
  if (key !== 'encampment' && (full ? s.districts >= 1 : s.districts >= 2)) out.push(`+${full ? s.districts : Math.floor(s.districts / 2)} from ${s.districts} neighboring district${s.districts > 1 ? 's' : ''}`);
  return out;
}

export const districtLimit = (city) => Math.ceil(city.pop / 3);
export const districtsUsed = (city) => city.districts.length + city.queue.filter((q) => q.kind === 'district').length;
export const hasDistrict = (state, city, key) => city.districts.some((t) => state.map.tiles[t].district === key);

// Tiles where `city` may place district `key`. `ignore` is a queued item whose reserved tile should
// count as free (used when that item completes).
export function validDistrictTiles(state, city, key, ignore = null) {
  const map = state.map;
  const def = DISTRICTS[key];
  return within(map, city.tile, RULES.workRadius).filter((i) => {
    if (i === city.tile) return false;
    const t = map.tiles[i];
    if (t.city !== city.id || t.district) return false;
    if (def.water) {
      if (t.t !== 'coast' || !neighbors(map, i).some((n) => map.tiles[n].city === city.id && map.tiles[n].t !== 'coast' && map.tiles[n].t !== 'ocean')) return false;
    } else if (t.t === 'mountain' || t.t === 'coast' || t.t === 'ocean') return false;
    if (def.notNextToCenter && distance(map, i, city.tile) <= 1) return false;
    if (city.queue.some((q) => q !== ignore && q.kind === 'district' && q.tile === i)) return false;
    if (unitsAt(state, i).some((u) => u.owner !== city.owner)) return false;
    return true;
  });
}
