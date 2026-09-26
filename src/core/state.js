// Creating a new game, and turning a game into a save file and back.
//
// State shape (everything here survives JSON.stringify / JSON.parse; keys starting with "_" are
// caches and are never saved):
//   version, seed, rng (uint32), turn, turnLimit, size, difficulty
//   phase: 'playing' | 'ended' | 'extended'; victory: null | 'domination' | 'score' | 'defeat'; winner
//   map: { w, h, tiles: [{ t, hills, forest, res, imp, owner, city, district }] }
//   players: [{ id, civ, name, color, emblem, human, alive, gold, research, researchPath, techs,
//               progress, sciOverflow, future, civic, civicPath, civics, civicProgress,
//               cultureOverflow, futureCivics, government, policies (one per slot), freeChanges,
//               capital, origCapital, nameIdx, personality, explored: 0/1 per tile, stats,
//               warSince, peaceSince, ai }]
//   units: { id: { id, type, owner, tile, hp, moves, fortified, sleeping, path, acted, bonus, charges } }
//   cities: { id: { id, name, owner, tile, pop, food, prodStock, queue, buildings, districts, worked,
//                   locked, culture, claimed, hp, capital, origCap, founder, founded, struck, lastAttacked } }
//   nextId, war: ['a-b'], met: ['a-b'], offers: [{ from, to, turn }], hints: {}

import { generateMap } from './mapgen.js';
import { CIVS } from '../data/civs.js';
import { RULES, DIFFICULTY, MAP_SIZES } from '../data/rules.js';
import { makeRng, randomSeed } from './rng.js';
import { neighbors } from './hex.js';
import { spawnUnit, touch } from './query.js';
import { canEnter } from './pathfind.js';
import { startPlayerTurn } from './turn.js';
import { refreshVision } from './vision.js';

export const SAVE_VERSION = 3;

// Fields every player starts with for civics and government.
export const civicFields = () => ({ civic: null, civicPath: [], civics: [], civicProgress: {}, cultureOverflow: 0, futureCivics: 0, government: null, policies: [], freeChanges: false });

function freeNeighbor(state, owner, type, tile) {
  const probe = { owner, type, id: -1 };
  return neighbors(state.map, tile).find((n) => canEnter(state, probe, n, true)) ?? -1;
}

export function createGame(opts = {}) {
  const seed = (opts.seed ?? randomSeed()) >>> 0;
  const size = MAP_SIZES[opts.size] ? opts.size : 'small';
  const rivals = Math.max(1, Math.min(3, opts.rivals ?? 2));
  const difficulty = DIFFICULTY[opts.difficulty] ? opts.difficulty : 'normal';
  const allAI = !!opts.allAI;
  const humanCiv = CIVS[opts.civ] ? opts.civ : 0;
  const count = rivals + 1;
  const { w, h } = MAP_SIZES[size];
  const { map, starts } = generateMap(seed, w, h, count);
  const rng = makeRng(seed ^ 0x5bd1e995);

  const civOrder = [humanCiv, ...CIVS.map((_, i) => i).filter((i) => i !== humanCiv)];
  const startOrder = [...starts];
  for (let i = startOrder.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [startOrder[i], startOrder[j]] = [startOrder[j], startOrder[i]];
  }

  const state = {
    version: SAVE_VERSION,
    seed,
    rng: (seed ^ 0x9e3779b9) >>> 0,
    turn: 1,
    turnLimit: opts.turnLimit ?? 100,
    size,
    difficulty,
    phase: 'playing',
    victory: null,
    winner: null,
    map,
    players: [],
    units: {},
    cities: {},
    nextId: 1,
    war: [],
    met: [],
    offers: [],
    hints: {},
  };

  for (let i = 0; i < count; i++) {
    const civ = civOrder[i];
    const human = i === 0 && !allAI;
    state.players.push({
      id: i,
      civ,
      name: CIVS[civ].name,
      color: CIVS[civ].color,
      emblem: CIVS[civ].emblem,
      human,
      alive: true,
      gold: RULES.startGold,
      research: null,
      researchPath: [],
      techs: [],
      progress: {},
      sciOverflow: 0,
      future: 0,
      ...civicFields(),
      capital: null,
      origCapital: null,
      nameIdx: 0,
      personality: human ? null : rng() < 0.5 ? 'builder' : 'conqueror',
      explored: new Array(map.tiles.length).fill(0),
      stats: { kills: 0, lost: 0, citiesCaptured: 0 },
      warSince: {},
      peaceSince: {},
      ai: {},
    });
  }

  for (const p of state.players) {
    const start = startOrder[p.id];
    spawnUnit(state, p.id, 'settler', start);
    spawnUnit(state, p.id, 'warrior', start);
    const scoutTile = freeNeighbor(state, p.id, 'scout', start);
    if (scoutTile >= 0) spawnUnit(state, p.id, 'scout', scoutTile);
    if (!p.human) {
      for (let k = 0; k < DIFFICULTY[difficulty].aiExtraWarriors; k++) {
        const t = freeNeighbor(state, p.id, 'warrior', start);
        if (t >= 0) spawnUnit(state, p.id, 'warrior', t);
      }
    }
  }

  touch(state);
  const events = [];
  for (const p of state.players) refreshVision(state, p.id, events);
  const human = state.players.find((p) => p.human);
  if (human) startPlayerTurn(state, human.id, events);
  return state;
}

export function serialize(state) {
  return JSON.stringify(state, (key, value) => (key.startsWith('_') ? undefined : value));
}

// Upgrades older saves. Each entry turns version n into version n + 1.
const MIGRATIONS = {
  // 1.1 → 1.2: the 76-tech tree. Philosophy is gone (its keys otherwise carry over), and Swordsmen
  // now need Iron Working, which v1 players reached through Bronze Working.
  1(s) {
    for (const p of s.players) {
      p.techs = p.techs.filter((k) => k !== 'philosophy');
      delete p.progress.philosophy;
      p.researchPath = (p.researchPath || []).filter((k) => k !== 'philosophy');
      if (p.research === 'philosophy') p.research = p.researchPath[0] || null;
      if (p.techs.includes('bronze') && Object.values(s.units).some((u) => u.owner === p.id && u.type === 'swordsman')) p.techs.push('ironworking');
    }
    s.version = 2;
    return s;
  },
  // 1.2 → 1.3: civics and government. Everyone starts the tree from the beginning.
  2(s) {
    for (const p of s.players) Object.assign(p, { ...civicFields(), ...p });
    s.version = 3;
    return s;
  },
};

export function deserialize(text) {
  let s;
  try {
    s = JSON.parse(text);
  } catch {
    throw new Error("This file isn't a Hexhold save.");
  }
  if (!s || typeof s !== 'object' || !s.map || !Array.isArray(s.players)) throw new Error("This file isn't a Hexhold save.");
  if (typeof s.version !== 'number' || s.version > SAVE_VERSION) {
    throw new Error(`This save comes from a newer version of Hexhold (save version ${s.version}). Update the game to load it.`);
  }
  while (s.version < SAVE_VERSION) {
    const up = MIGRATIONS[s.version];
    if (!up) throw new Error(`Saves from version ${s.version} can't be loaded any more.`);
    s = up(s);
  }
  touch(s);
  return s;
}
