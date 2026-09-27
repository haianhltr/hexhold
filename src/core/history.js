// History: a timeline of historic moments for every civilization, built from game events. Each
// moment is worth a few points (the "Historic moments" score row); being the first in the world
// is worth more. Moments are stored in state.history as { t: turn, p: player, pts, i: icon, x: text,
// w: 1 for world firsts } and shown on the History screen.

import { UNITS } from '../data/units.js';
import { DISTRICTS } from '../data/districts.js';
import { TECHS, ERAS, ERA_INDEX } from '../data/techs.js';
import { GOVERNMENTS } from '../data/government.js';
import { CIVS, districtNameFor } from '../data/civs.js';

const VICTORY_NAMES = { domination: 'Domination', science: 'Science', culture: 'Culture', score: 'Score' };

function add(state, pid, pts, icon, text, world = false) {
  if (!state.history) state.history = [];
  state.history.push({ t: state.turn, p: pid, pts, i: icon, x: text, ...(world ? { w: 1 } : {}) });
}

// Marks a first for a player (and for the world); returns [firstForPlayer, firstInWorld].
function first(state, pid, key) {
  const p = state.players[pid];
  if (!p.firsts) p.firsts = [];
  if (!state.firsts) state.firsts = [];
  const mine = !p.firsts.includes(key);
  const world = !state.firsts.includes(key);
  if (mine) p.firsts.push(key);
  if (world) state.firsts.push(key);
  return [mine, world];
}

const name = (state, pid) => state.players[pid]?.name ?? 'Someone';
const cityName = (state, id) => state.cities[id]?.name ?? 'a city';

export function recordHistory(state, events) {
  for (const e of events) {
    if (e.recorded) continue;
    e.recorded = true;
    switch (e.type) {
      case 'cityFounded': {
        const capital = !state.players[e.owner].firsts?.includes('city');
        first(state, e.owner, 'city');
        add(state, e.owner, 1, 'found', capital ? `Founded the capital, ${cityName(state, e.city)}` : `Founded ${cityName(state, e.city)}`);
        break;
      }
      case 'built': {
        const { item } = e;
        if (item.kind === 'district') {
          const [mine, world] = first(state, e.owner, `district:${item.key}`);
          const dn = districtNameFor(state.players[e.owner].civ, item.key, DISTRICTS[item.key].name);
          if (world) add(state, e.owner, 3, 'district', `Built the world's first ${dn}, in ${cityName(state, e.city)}`, true);
          else if (mine) add(state, e.owner, 1, 'district', `Built a first ${dn}, in ${cityName(state, e.city)}`);
        } else if (item.kind === 'unit' && UNITS[item.key].civ) {
          const [mine] = first(state, e.owner, `unit:${item.key}`);
          if (mine) add(state, e.owner, 1, 'strength', `Trained the first ${UNITS[item.key].name}`);
        }
        break;
      }
      case 'tech': {
        if (e.tech === 'future') break;
        const p = state.players[e.player];
        const era = ERA_INDEX[TECHS[e.tech].era];
        const before = Math.max(0, ...p.techs.filter((k) => k !== e.tech).map((k) => ERA_INDEX[TECHS[k].era]));
        if (era > before) {
          const [, world] = first(state, e.player, `era:${era}`);
          if (world) add(state, e.player, 3, 'science', `First civilization to enter the ${ERAS[era].name} Era`, true);
          else add(state, e.player, 1, 'science', `Entered the ${ERAS[era].name} Era`);
        }
        break;
      }
      case 'government': {
        const g = GOVERNMENTS[e.government];
        const [mine, world] = first(state, e.player, `gov:${g.tier}`);
        if (world && g.tier > 0) add(state, e.player, 2, 'culture', `First civilization to adopt a Tier ${g.tier} government: ${g.name}`, true);
        else add(state, e.player, mine ? 1 : 0, 'culture', `Adopted ${g.name}`);
        break;
      }
      case 'met':
        add(state, e.a, 1, 'handshake', `Met ${name(state, e.b)}`);
        add(state, e.b, 1, 'handshake', `Met ${name(state, e.a)}`);
        break;
      case 'war':
        add(state, e.a, 0, 'strength', `Declared war on ${name(state, e.b)}`);
        add(state, e.b, 0, 'strength', `${name(state, e.a)} declared war on us`);
        break;
      case 'peace':
        add(state, e.a, 1, 'handshake', `Made peace with ${name(state, e.b)}`);
        add(state, e.b, 1, 'handshake', `Made peace with ${name(state, e.a)}`);
        break;
      case 'cityCaptured': {
        const capital = state.cities[e.city]?.origCap != null;
        add(state, e.to, capital ? 4 : 2, 'strength', `Captured ${capital ? 'the capital ' : ''}${cityName(state, e.city)} from ${name(state, e.from)}`);
        add(state, e.from, 0, 'strength', `Lost ${cityName(state, e.city)} to ${name(state, e.to)}`);
        break;
      }
      case 'grew':
        for (const size of [10, 20]) {
          if (e.pop !== size) continue;
          const [mine, world] = first(state, e.owner, `pop:${size}`);
          if (world) add(state, e.owner, 3, 'food', `${cityName(state, e.city)} became the world's first city of ${size}`, true);
          else if (mine) add(state, e.owner, 1, 'food', `${cityName(state, e.city)} grew to ${size} citizens`);
        }
        break;
      case 'dominant':
        add(state, e.player, 2, 'culture', `Became the dominant culture over ${name(state, e.over)}`);
        break;
      case 'eliminated':
        add(state, e.player, 0, 'strength', `${name(state, e.player)} fell`);
        break;
      case 'gameOver':
        if (e.winner >= 0 && e.victory !== 'defeat') add(state, e.winner, 0, 'star', `Won a ${VICTORY_NAMES[e.victory] || ''} victory`, true);
        break;
      default:
        break;
    }
  }
}

export const historyPoints = (state, pid) => (state.history || []).reduce((s, m) => s + (m.p === pid ? m.pts : 0), 0);

// A civilization's own one-line summary, for the History screen header.
export const civTitle = (state, pid) => {
  const p = state.players[pid];
  return `${p.name}${CIVS[p.civ] ? ` under ${CIVS[p.civ].leader}` : ''}`;
};
