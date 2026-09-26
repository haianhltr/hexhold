// The turn cycle. Each round: every player takes their turn (startPlayerTurn, then they act),
// then endRound processes all cities, research, civics, gold and healing, and the turn number
// advances.

import { RULES } from '../data/rules.js';
import { UNITS } from '../data/units.js';
import { citiesOf, unitsOf, cityAt, removeUnit } from './query.js';
import { processCity } from './city.js';
import { addScience } from './research.js';
import { addCulture } from './civics.js';
import { unitUpkeep } from './yields.js';
import { followPath } from './movement.js';
import { refreshVision } from './vision.js';
import { checkVictory } from './victory.js';
import { effects, maxMoves } from './effects.js';

export function startPlayerTurn(state, pid, events) {
  const p = state.players[pid];
  if (!p.alive) return;
  for (const u of unitsOf(state, pid)) {
    u.moves = maxMoves(state, u);
    u.acted = false;
  }
  for (const c of citiesOf(state, pid)) c.struck = false;
  for (const u of unitsOf(state, pid)) if (u.path && state.units[u.id]) followPath(state, u, events);
  refreshVision(state, pid, events);
}

function disbandForDebt(state, pid, events) {
  const military = unitsOf(state, pid)
    .filter((u) => UNITS[u.type].cls !== 'civilian')
    .sort((a, b) => UNITS[a.type].cost - UNITS[b.type].cost);
  if (!military.length) return;
  const u = military[0];
  removeUnit(state, u);
  events.push({ type: 'disbanded', owner: pid, unitType: u.type, tile: u.tile });
}

export function endRound(state, events) {
  for (const p of state.players) {
    if (!p.alive) continue;
    let science = 0;
    let culture = 0;
    let gold = 0;
    for (const city of citiesOf(state, p.id)) {
      const y = processCity(state, city, events);
      science += y.science;
      culture += y.culture;
      gold += y.gold;
    }
    p.gold += gold - unitUpkeep(state, p.id);
    if (p.gold < 0) {
      disbandForDebt(state, p.id, events);
      p.gold = 0;
    }
    addScience(state, p.id, science, events);
    // The free-change turn from a civic lasts one round; a civic finished now opens the next one.
    p.freeChanges = false;
    addCulture(state, p.id, culture, events);
  }

  for (const id in state.units) {
    const u = state.units[id];
    if (u.acted || u.hp >= 100) continue;
    const city = cityAt(state, u.tile);
    const owner = state.map.tiles[u.tile].owner;
    const heal = city && city.owner === u.owner ? RULES.healCity : owner === u.owner ? RULES.healOwn : RULES.healNeutral;
    u.hp = Math.min(100, u.hp + heal + effects(state, u.owner).heal);
  }

  state.turn++;
  for (const p of state.players) if (p.alive) refreshVision(state, p.id, events);
  checkVictory(state, events);
}
