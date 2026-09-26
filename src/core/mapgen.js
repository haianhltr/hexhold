// World generation: one large continent (so every civ can reach every other by land), mountain
// ranges, hills, forests, climate bands, bonus resources and fair start positions.

import { makeRng } from './rng.js';
import { neighbors, within, distance } from './hex.js';

function makeNoise(rng) {
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) vals[i] = rng();
  const lattice = (x, y) => vals[perm[(x & 255) + perm[y & 255]]];
  const smooth = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = smooth(x - x0);
    const fy = smooth(y - y0);
    const a = lattice(x0, y0);
    const b = lattice(x0 + 1, y0);
    const c = lattice(x0, y0 + 1);
    const d = lattice(x0 + 1, y0 + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

function fbm(noise, x, y, octaves) {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += noise(x * freq + o * 17.3, y * freq + o * 9.1) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

// The given fraction of `ids` with the highest score.
function topFraction(ids, score, fraction) {
  const sorted = [...ids].sort((a, b) => score[b] - score[a]);
  return sorted.slice(0, Math.round(sorted.length * fraction));
}

const walkable = (tile) => tile.t !== 'mountain' && tile.t !== 'coast' && tile.t !== 'ocean';

function largestLandmass(map) {
  const N = map.tiles.length;
  const comp = new Int32Array(N).fill(-1);
  let best = -1;
  let bestSize = 0;
  let id = 0;
  for (let s = 0; s < N; s++) {
    if (comp[s] >= 0 || !walkable(map.tiles[s])) continue;
    let size = 0;
    const stack = [s];
    comp[s] = id;
    while (stack.length) {
      const i = stack.pop();
      size++;
      for (const n of neighbors(map, i)) {
        if (comp[n] < 0 && walkable(map.tiles[n])) {
          comp[n] = id;
          stack.push(n);
        }
      }
    }
    if (size > bestSize) {
      bestSize = size;
      best = id;
    }
    id++;
  }
  const set = new Set();
  for (let i = 0; i < N; i++) if (comp[i] === best) set.add(i);
  return set;
}

function baseYield(tile) {
  const food = { grass: 2, plains: 1, desert: 0, mountain: 0, coast: 1, ocean: 1 }[tile.t];
  let prod = tile.t === 'plains' ? 1 : 0;
  if (tile.hills) prod++;
  if (tile.forest) prod++;
  const res = tile.res === 'wheat' || tile.res === 'fish' ? 1 : 0;
  const resProd = tile.res === 'stone' || tile.res === 'deer' ? 1 : 0;
  return { food: food + res, prod: prod + resProd, gold: tile.t === 'coast' ? 1 : 0 };
}

export function startScore(map, i) {
  let score = 0;
  let goodFood = 0;
  for (const j of within(map, i, 2)) {
    const t = map.tiles[j];
    if (t.t === 'mountain') continue;
    const y = baseYield(t);
    score += y.food + y.prod * 0.8 + y.gold * 0.3 + (t.res ? 1 : 0);
    if (y.food >= 2) goodFood++;
  }
  return { score, goodFood };
}

function pickStarts(map, mainland, count, rng) {
  const cands = [];
  for (const i of mainland) {
    const t = map.tiles[i];
    if (t.t !== 'grass' && t.t !== 'plains') continue;
    const col = i % map.w;
    const row = (i / map.w) | 0;
    if (col < 2 || row < 2 || col > map.w - 3 || row > map.h - 3) continue;
    const s = startScore(map, i);
    if (s.goodFood < 4) continue;
    cands.push({ i, score: s.score });
  }
  if (cands.length < count) return null;
  cands.sort((a, b) => b.score - a.score);
  const top = cands.slice(0, Math.max(1, Math.floor(cands.length * 0.25)));
  const starts = [top[Math.floor(rng() * top.length)].i];
  for (const minSep of [8, 7, 6, 5]) {
    while (starts.length < count) {
      let best = null;
      let bestKey = -Infinity;
      for (const c of cands) {
        let minD = Infinity;
        for (const s of starts) minD = Math.min(minD, distance(map, c.i, s));
        if (minD < minSep) continue;
        const key = Math.min(minD, 14) * 4 + c.score;
        if (key > bestKey) {
          bestKey = key;
          best = c.i;
        }
      }
      if (best === null) break;
      starts.push(best);
    }
    if (starts.length === count) return starts;
  }
  return null;
}

function tryGenerate(seed, w, h, players) {
  const rng = makeRng(seed);
  const nElev = makeNoise(rng);
  const nRidge = makeNoise(rng);
  const nMoist = makeNoise(rng);
  const nForest = makeNoise(rng);
  const N = w * h;
  const elev = new Float32Array(N);
  const ridge = new Float32Array(N);
  const moist = new Float32Array(N);
  const forest = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const col = i % w;
    const row = (i / w) | 0;
    const px = col + 0.5 * (row & 1);
    const py = row * 0.866;
    const dx = (px / w - 0.5) * 2;
    const dy = (row / (h - 1) - 0.5) * 2;
    let e = fbm(nElev, px / 6.5, py / 6.5, 4);
    e += 0.35 * (1 - Math.min(1, dx * dx * 0.9 + dy * dy * 1.1));
    const edge = Math.max(Math.abs(dx), Math.abs(dy));
    if (edge > 0.78) e -= (edge - 0.78) * 2.2;
    elev[i] = e;
    const rn = fbm(nRidge, px / 4, py / 4, 3);
    ridge[i] = 1 - Math.abs(2 * rn - 1);
    moist[i] = fbm(nMoist, px / 7, py / 7, 3);
    forest[i] = fbm(nForest, px / 5, py / 5, 3);
  }

  const all = Array.from({ length: N }, (_, i) => i);
  const land = new Set(topFraction(all, elev, 0.47));
  const landIds = all.filter((i) => land.has(i));
  const heightScore = new Float32Array(N);
  for (const i of landIds) heightScore[i] = elev[i] * 0.5 + ridge[i] * 0.5;
  const byHeight = topFraction(landIds, heightScore, 0.24);
  const mountains = new Set(byHeight.slice(0, Math.round(landIds.length * 0.07)));
  const hills = new Set(byHeight.slice(mountains.size));

  const flat = landIds.filter((i) => !mountains.has(i));
  const dryFirst = [...flat].sort((a, b) => moist[a] - moist[b]);
  const desert = new Set(dryFirst.slice(0, Math.round(flat.length * 0.14)));
  const plains = new Set(dryFirst.slice(desert.size, desert.size + Math.round(flat.length * 0.36)));
  const green = flat.filter((i) => !desert.has(i));
  const forested = new Set(topFraction(green, forest, 0.3));

  const map = { w, h, tiles: new Array(N) };
  for (let i = 0; i < N; i++) {
    let t;
    if (!land.has(i)) t = 'ocean';
    else if (mountains.has(i)) t = 'mountain';
    else if (desert.has(i)) t = 'desert';
    else if (plains.has(i)) t = 'plains';
    else t = 'grass';
    map.tiles[i] = {
      t,
      hills: hills.has(i) && t !== 'mountain',
      forest: forested.has(i),
      res: null,
      imp: null,
      owner: -1,
      city: -1,
      district: null,
    };
  }
  for (let i = 0; i < N; i++) {
    if (map.tiles[i].t === 'ocean' && neighbors(map, i).some((n) => land.has(n))) map.tiles[i].t = 'coast';
  }

  const mainland = largestLandmass(map);
  if (mainland.size < N * 0.28) return null;

  for (let i = 0; i < N; i++) {
    const t = map.tiles[i];
    const r = rng();
    if ((t.t === 'grass' || t.t === 'plains') && !t.hills && !t.forest && r < 0.08) t.res = 'wheat';
    else if (t.hills && !t.forest && t.t !== 'mountain' && r < 0.14) t.res = 'stone';
    else if (t.forest && r < 0.12) t.res = 'deer';
    else if (t.t === 'coast' && r < 0.09) t.res = 'fish';
  }

  const starts = pickStarts(map, mainland, players, rng);
  if (!starts) return null;
  return { map, starts };
}

export function generateMap(seed, w, h, players) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const result = tryGenerate((seed + attempt * 7919) >>> 0, w, h, players);
    if (result) return result;
  }
  throw new Error(`Could not generate a ${w}x${h} map for ${players} players from seed ${seed}`);
}
