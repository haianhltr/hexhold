// Walking a unit along its path, step by step, respecting moves, blockers and zones of control.
// Units may pass through friendly units but never end a move stacked on one of the same kind.

import { findPath, canEnter, moveCost, inZoc } from './pathfind.js';
import { placeUnit } from './query.js';
import { revealAround, sightOf } from './vision.js';

export function followPath(state, unit, events) {
  if (!unit.path || !unit.path.length) {
    unit.path = null;
    return 0;
  }
  const from = unit.tile;
  const trail = [{ tile: unit.tile, moves: unit.moves }];
  let guard = 0;
  while (unit.path && unit.path.length && unit.moves > 0 && guard++ < 64) {
    const next = unit.path[0];
    if (!canEnter(state, unit, next, unit.path.length === 1)) {
      // Something moved into the way; route around it or give up the order.
      const repath = findPath(state, unit, unit.path[unit.path.length - 1]);
      if (!repath) {
        unit.path = null;
        break;
      }
      unit.path = repath;
      continue;
    }
    const wasInZoc = inZoc(state, unit, unit.tile);
    const movesAfter = Math.max(0, unit.moves - moveCost(state.map.tiles[next]));
    const stopsThere = movesAfter <= 0 || (wasInZoc && inZoc(state, unit, next));
    if (stopsThere && !canEnter(state, unit, next, true)) break;
    unit.moves = movesAfter;
    placeUnit(state, unit, next);
    unit.path.shift();
    trail.push({ tile: next, moves: unit.moves });
    unit.fortified = false;
    unit.sleeping = false;
    unit.acted = true;
    revealAround(state, unit.owner, next, sightOf(state, unit));
    // Zone of control: moving from one tile next to an enemy to another costs all remaining moves.
    if (stopsThere) unit.moves = 0;
  }
  // If the unit got stuck partway on a friendly unit's tile, step back to the last free tile.
  while (trail.length > 1 && !canEnter(state, unit, unit.tile, true)) {
    const undone = trail.pop();
    const back = trail[trail.length - 1];
    unit.path = [undone.tile, ...(unit.path || [])];
    unit.moves = back.moves;
    placeUnit(state, unit, back.tile);
  }
  if (unit.path && !unit.path.length) unit.path = null;
  const steps = trail.slice(1).map((s) => s.tile);
  if (steps.length) events.push({ type: 'move', unit: unit.id, owner: unit.owner, from, steps });
  return steps.length;
}
