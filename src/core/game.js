// Runs whole rounds. The human's turn happens in the UI; when they press End Turn,
// finishHumanTurn plays every AI, processes the round and starts the human's next turn.

import { startPlayerTurn, endRound } from './turn.js';
import { checkVictory } from './victory.js';

export function finishHumanTurn(state, runAI) {
  const events = [];
  for (const p of state.players) {
    if (p.human || !p.alive || state.phase === 'ended') continue;
    startPlayerTurn(state, p.id, events);
    runAI(state, p.id, events);
  }
  if (state.phase !== 'ended') endRound(state, events);
  const human = state.players.find((p) => p.human);
  if (human && human.alive && state.phase !== 'ended') startPlayerTurn(state, human.id, events);
  checkVictory(state, events);
  return events;
}

// One round with every player controlled by the AI (used by the soak test).
export function playAIRound(state, runAI) {
  const events = [];
  for (const p of state.players) {
    if (!p.alive || state.phase === 'ended') continue;
    startPlayerTurn(state, p.id, events);
    runAI(state, p.id, events);
  }
  if (state.phase !== 'ended') endRound(state, events);
  return events;
}
