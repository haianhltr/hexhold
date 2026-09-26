// Score, elimination and the ways a game ends: domination, science (Offworld Mission), score at
// the turn limit, and defeat.

import { RULES } from '../data/rules.js';
import { TECHS } from '../data/techs.js';
import { citiesOf, removeUnit } from './query.js';

export function scoreBreakdown(state, pid) {
  const S = RULES.score;
  const p = state.players[pid];
  const cities = citiesOf(state, pid);
  let pop = 0;
  let districts = 0;
  for (const c of cities) {
    pop += c.pop;
    districts += c.districts.length;
  }
  let tiles = 0;
  for (const t of state.map.tiles) if (t.owner === pid) tiles++;
  return [
    { label: 'Cities', count: cities.length, points: cities.length * S.city },
    { label: 'Population', count: pop, points: pop * S.pop },
    { label: 'Techs', count: p.techs.length, points: p.techs.length * S.tech },
    { label: 'Civics', count: (p.civics || []).length, points: (p.civics || []).length * S.civic },
    { label: 'Future techs and civics', count: p.future + (p.futureCivics || 0), points: (p.future + (p.futureCivics || 0)) * S.future },
    { label: 'Districts', count: districts, points: districts * S.district },
    { label: 'Territory', count: tiles, points: Math.floor(tiles / S.tilesPer) },
  ];
}

export function score(state, pid) {
  return scoreBreakdown(state, pid).reduce((s, r) => s + r.points, 0);
}

export function rankings(state) {
  return state.players
    .filter((p) => p.alive)
    .map((p) => ({ id: p.id, score: score(state, p.id) }))
    .sort((a, b) => b.score - a.score);
}

// A player with no cities and no settler is out of the game.
export function checkElimination(state, pid, events) {
  const p = state.players[pid];
  if (!p.alive) return;
  if (Object.values(state.cities).some((c) => c.owner === pid)) return;
  if (Object.values(state.units).some((u) => u.owner === pid && u.type === 'settler')) return;
  p.alive = false;
  for (const u of Object.values(state.units)) if (u.owner === pid) removeUnit(state, u);
  state.war = state.war.filter((k) => !k.split('-').map(Number).includes(pid));
  state.offers = state.offers.filter((o) => o.from !== pid && o.to !== pid);
  events.push({ type: 'eliminated', player: pid });
}

function endGame(state, victory, winner, events) {
  state.phase = 'ended';
  state.victory = victory;
  state.winner = winner;
  events.push({ type: 'gameOver', victory, winner });
}

export function checkVictory(state, events) {
  if (state.phase === 'ended') return;
  const human = state.players.find((p) => p.human);
  if (human && !human.alive) {
    if (state.phase === 'playing') endGame(state, 'defeat', rankings(state)[0]?.id ?? -1, events);
    else state.phase = 'ended';
    return;
  }
  if (state.phase !== 'playing') return;
  const alive = state.players.filter((p) => p.alive);
  if (alive.length === 1) {
    endGame(state, 'domination', alive[0].id, events);
    return;
  }
  // Science victory: the first civilization to research a victory tech (Offworld Mission).
  const launcher = alive.find((p) => p.techs.some((k) => TECHS[k]?.effect?.victory === 'science'));
  if (launcher) {
    endGame(state, 'science', launcher.id, events);
    return;
  }
  const everyoneFounded = alive.every((p) => p.origCapital != null);
  const capitals = Object.values(state.cities).filter((c) => c.origCap != null);
  if (everyoneFounded && capitals.length >= 2) {
    const owners = new Set(capitals.map((c) => c.owner));
    if (owners.size === 1) {
      endGame(state, 'domination', capitals[0].owner, events);
      return;
    }
  }
  if (state.turn > state.turnLimit) endGame(state, 'score', rankings(state)[0].id, events);
}
