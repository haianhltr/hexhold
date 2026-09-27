// Tourism and the culture victory.
//
// Every civilization has domestic tourists: one per RULES.tourism.domesticPer culture it has ever
// produced. Tourism builds up toward every civilization you have met, and each
// RULES.tourism.visitorPer of it draws one visitor from them. You win a culture victory when your
// visitors from every other civilization outnumber that civilization's domestic tourists.

import { BUILDINGS } from '../data/buildings.js';
import { RULES } from '../data/rules.js';
import { citiesOf, haveMet } from './query.js';
import { cityYields } from './yields.js';
import { effects } from './effects.js';

// Tourism per turn: RULES.tourism.perTheaterBuilding for each Theater Square building, plus, once
// the civic RULES.tourism.startCivic is done, a share of all culture (RULES.tourism.fromCulture).
// Tourism bonuses from techs, civics, policies and civilizations raise the total. Most of those
// arrive late, so culture victories come late too.
export function tourismOf(state, pid) {
  const share = (state.players[pid].civics || []).includes(RULES.tourism.startCivic) ? RULES.tourism.fromCulture : 0;
  let t = 0;
  for (const c of citiesOf(state, pid)) {
    if (share) t += cityYields(state, c).culture * share;
    for (const b of c.buildings) if (BUILDINGS[b].district === 'theater') t += RULES.tourism.perTheaterBuilding;
  }
  return t * (1 + effects(state, pid).tourismPct / 100);
}

export const domesticTourists = (p) => Math.floor((p.cultureTotal || 0) / RULES.tourism.domesticPer);
export const visitorsFrom = (p, otherId) => Math.floor(((p.tourismTo || {})[otherId] || 0) / RULES.tourism.visitorPer);

// Adds a round of tourism toward every civilization the player has met.
export function addTourism(state, pid, amount) {
  const p = state.players[pid];
  if (!p.tourismTo) p.tourismTo = {};
  for (const o of state.players) if (o.id !== pid && o.alive && haveMet(state, pid, o.id)) p.tourismTo[o.id] = (p.tourismTo[o.id] || 0) + amount;
}

// Where the player stands against every other living civilization.
export function cultureStatus(state, pid) {
  const p = state.players[pid];
  return state.players
    .filter((o) => o.id !== pid && o.alive)
    .map((o) => {
      const visitors = visitorsFrom(p, o.id);
      const domestic = domesticTourists(o);
      return { id: o.id, visitors, domestic, dominant: haveMet(state, pid, o.id) && visitors > domestic };
    });
}

export function hasCultureVictory(state, pid) {
  const status = cultureStatus(state, pid);
  return status.length > 0 && status.every((s) => s.dominant);
}
