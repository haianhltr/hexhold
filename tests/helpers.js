// Small builders for tests: a hand-made map so rules can be checked on known terrain.

import { SAVE_VERSION, civicFields } from '../src/core/state.js';
import { CIVS } from '../src/data/civs.js';

export function flatMap(w, h, t = 'grass') {
  const tiles = [];
  for (let i = 0; i < w * h; i++) tiles.push({ t, hills: false, forest: false, res: null, imp: null, owner: -1, city: -1, district: null });
  return { w, h, tiles };
}

export function bareState(map, players = 2) {
  const state = {
    version: SAVE_VERSION,
    seed: 1,
    rng: 12345,
    turn: 1,
    turnLimit: 100,
    size: 'small',
    difficulty: 'normal',
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
  for (let i = 0; i < players; i++) {
    state.players.push({
      id: i, civ: i, name: CIVS[i].name, color: CIVS[i].color, emblem: CIVS[i].emblem, human: i === 0, alive: true,
      gold: 10, research: null, researchPath: [], techs: [], progress: {}, sciOverflow: 0, future: 0, ...civicFields(), capital: null,
      origCapital: null, nameIdx: 0, personality: i ? 'builder' : null, explored: new Array(map.tiles.length).fill(0),
      stats: { kills: 0, lost: 0, citiesCaptured: 0 }, warSince: {}, peaceSince: {}, ai: {},
    });
  }
  return state;
}
