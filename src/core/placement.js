// District placement rules and adjacency bonuses (the Civ 6 signature mechanic).

import { neighbors, within, distance } from './hex.js';
import { DISTRICTS } from '../data/districts.js';
import { RULES } from '../data/rules.js';
import { cityAt, unitsAt } from './query.js';

export function adjacencyBonus(state, i, key) {
  const map = state.map;
  let mountains = 0;
  let districts = 0;
  let water = 0;
  for (const n of neighbors(map, i)) {
    const t = map.tiles[n];
    if (t.t === 'mountain') mountains++;
    if (t.t === 'coast' || t.t === 'ocean') water++;
    if (t.district || cityAt(state, n)) districts++;
  }
  if (key === 'campus') return mountains + Math.floor(districts / 2);
  if (key === 'commercial') return (water > 0 ? 2 : 0) + Math.floor(districts / 2);
  return 0;
}

// Plain-language reasons behind a tile's bonus, for tooltips.
export function adjacencyReasons(state, i, key) {
  const map = state.map;
  let mountains = 0;
  let districts = 0;
  let water = 0;
  for (const n of neighbors(map, i)) {
    const t = map.tiles[n];
    if (t.t === 'mountain') mountains++;
    if (t.t === 'coast' || t.t === 'ocean') water++;
    if (t.district || cityAt(state, n)) districts++;
  }
  const out = [];
  if (key === 'campus' && mountains) out.push(`+${mountains} from ${mountains} mountain${mountains > 1 ? 's' : ''}`);
  if (key === 'commercial' && water) out.push('+2 next to coast');
  if ((key === 'campus' || key === 'commercial') && districts >= 2) out.push(`+${Math.floor(districts / 2)} from ${districts} neighboring districts`);
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
    if (t.t === 'mountain' || t.t === 'coast' || t.t === 'ocean') return false;
    if (def.notNextToCenter && distance(map, i, city.tile) <= 1) return false;
    if (city.queue.some((q) => q !== ignore && q.kind === 'district' && q.tile === i)) return false;
    if (unitsAt(state, i).some((u) => u.owner !== city.owner)) return false;
    return true;
  });
}
