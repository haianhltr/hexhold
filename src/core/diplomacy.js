// War and peace. At peace, borders are closed: units can't enter the other civ's territory.

import { UNITS } from '../data/units.js';
import { neighbors } from './hex.js';
import { pairKey, atWar, unitsOf, placeUnit, removeUnit, citiesOf } from './query.js';
import { canEnter } from './pathfind.js';

export function declareWar(state, a, b, events) {
  if (atWar(state, a, b)) return;
  state.war.push(pairKey(a, b));
  state.players[a].warSince[b] = state.turn;
  state.players[b].warSince[a] = state.turn;
  state.offers = state.offers.filter((o) => !(o.from === a && o.to === b) && !(o.from === b && o.to === a));
  for (const pid of [a, b]) state.players[pid].stats.wars = (state.players[pid].stats.wars || 0) + 1;
  events.push({ type: 'war', a, b });
}

// Moves every unit of `pid` standing in `other`'s territory to the nearest tile it may stand on.
function expel(state, pid, other) {
  for (const u of unitsOf(state, pid)) {
    if (state.map.tiles[u.tile].owner !== other) continue;
    u.path = null;
    const seen = new Set([u.tile]);
    const queue = [u.tile];
    let dest = -1;
    while (queue.length && dest < 0) {
      const i = queue.shift();
      for (const n of neighbors(state.map, i)) {
        if (seen.has(n)) continue;
        seen.add(n);
        if (canEnter(state, u, n, true)) {
          dest = n;
          break;
        }
        const t = state.map.tiles[n];
        if (t.t !== 'coast' && t.t !== 'ocean' && t.t !== 'mountain') queue.push(n);
      }
    }
    if (dest >= 0) placeUnit(state, u, dest);
    else removeUnit(state, u);
  }
}

export function makePeace(state, a, b, events) {
  if (!atWar(state, a, b)) return;
  state.war = state.war.filter((k) => k !== pairKey(a, b));
  state.players[a].peaceSince = { ...(state.players[a].peaceSince || {}), [b]: state.turn };
  state.players[b].peaceSince = { ...(state.players[b].peaceSince || {}), [a]: state.turn };
  state.offers = state.offers.filter((o) => !(o.from === a && o.to === b) && !(o.from === b && o.to === a));
  expel(state, a, b);
  expel(state, b, a);
  for (const pid of [a, b]) state.players[pid].stats.peace = (state.players[pid].stats.peace || 0) + 1;
  events.push({ type: 'peace', a, b });
}

// Rough military strength: every military unit's strength scaled by its health, plus cities.
export function militaryPower(state, pid) {
  let power = 0;
  for (const u of unitsOf(state, pid)) {
    const def = UNITS[u.type];
    if (def.cls === 'civilian') continue;
    power += Math.max(def.strength, def.ranged || 0) * (u.hp / 100);
  }
  return power + citiesOf(state, pid).length * 10;
}

// Would AI player `ai` accept peace with `other` right now?
export function aiWantsPeace(state, ai, other) {
  if (!atWar(state, ai, other)) return false;
  const since = state.players[ai].warSince[other] ?? state.turn;
  const turns = state.turn - since;
  if (turns < 6) return false;
  const ratio = militaryPower(state, ai) / Math.max(1, militaryPower(state, other));
  return ratio < 0.85 || (turns >= 20 && ratio < 1.5);
}
