// AI-vs-AI soak test: plays full games headless and checks the rules' invariants every round.
//   node tools/soak.mjs [games=20] [turns=150]
// Fails (exit code 1) on any exception or broken invariant.

import { createGame, serialize, deserialize } from '../src/core/state.js';
import { playAIRound } from '../src/core/game.js';
import { runAI } from '../src/ai/ai.js';
import { UNITS } from '../src/data/units.js';
import { RULES } from '../src/data/rules.js';
import { passable } from '../src/core/pathfind.js';
import { citiesOf } from '../src/core/query.js';
import { score } from '../src/core/victory.js';
import { eraOf } from '../src/data/techs.js';
import { civicEraOf } from '../src/data/civics.js';
import { GOVERNMENTS, slotsOf, fitsSlot, POLICIES } from '../src/data/government.js';
import { policiesReason, governmentUnlocked } from '../src/core/civics.js';

const leadEra = (state) => eraOf(state.players.reduce((a, p) => (p.techs.length > a.length ? p.techs : a), [])).name;

const games = Number(process.argv[2] ?? 20);
const turns = Number(process.argv[3] ?? 150);

function check(state) {
  const problems = [];
  const slots = new Map();
  for (const u of Object.values(state.units)) {
    const tile = state.map.tiles[u.tile];
    if (!tile || !passable(tile)) problems.push(`unit ${u.id} (${u.type}) on impassable tile ${u.tile}`);
    if (!(u.hp > 0 && u.hp <= 100)) problems.push(`unit ${u.id} has hp ${u.hp}`);
    if (!state.players[u.owner]?.alive) problems.push(`unit ${u.id} belongs to an eliminated player`);
    const key = `${u.tile}:${UNITS[u.type].cls === 'civilian' ? 'c' : 'm'}`;
    if (slots.has(key)) problems.push(`two ${key.endsWith('c') ? 'civilian' : 'military'} units on tile ${u.tile}`);
    slots.set(key, u);
  }
  for (const [key, u] of slots) {
    const other = slots.get(key.replace(/[cm]$/, (m) => (m === 'c' ? 'm' : 'c')));
    if (other && other.owner !== u.owner) problems.push(`units of two players share tile ${u.tile}`);
  }
  for (const c of Object.values(state.cities)) {
    const tile = state.map.tiles[c.tile];
    if (tile.city !== c.id || tile.owner !== c.owner) problems.push(`city ${c.name} does not own its tile`);
    if (c.pop < 1) problems.push(`city ${c.name} has pop ${c.pop}`);
    if (c.worked.length > c.pop) problems.push(`city ${c.name} works more tiles than its pop`);
    for (const w of c.worked) if (state.map.tiles[w].city !== c.id) problems.push(`city ${c.name} works a tile it doesn't own`);
    if (c.queue.length > RULES.maxQueue) problems.push(`city ${c.name} queue too long`);
    for (const v of [c.food, c.prodStock, c.culture, c.hp]) if (!Number.isFinite(v)) problems.push(`city ${c.name} has a non-number stock`);
    if (c.hp < 0) problems.push(`city ${c.name} hp ${c.hp}`);
  }
  for (const p of state.players) {
    if (!Number.isFinite(p.gold) || p.gold < 0) problems.push(`${p.name} gold ${p.gold}`);
    if (p.government && !governmentUnlocked(p, p.government)) problems.push(`${p.name} has a locked government`);
    if (p.government) {
      const why = policiesReason(p, p.policies);
      if (why) problems.push(`${p.name} policies: ${why}`);
    } else if (p.policies.some(Boolean)) problems.push(`${p.name} has policies without a government`);
  }
  return problems;
}

const started = performance.now();
let failures = 0;
const rows = [];
for (let g = 1; g <= games; g++) {
  const opts = { seed: g * 7919, size: g % 2 ? 'medium' : 'small', rivals: 3, allAI: true, turnLimit: turns, difficulty: ['easy', 'normal', 'hard'][g % 3] };
  const state = createGame(opts);
  let slowest = 0;
  let wars = 0;
  let captures = 0;
  let era100 = '';
  let civ100 = '';
  try {
    while (state.phase === 'playing' && state.turn <= turns) {
      const t0 = performance.now();
      const events = playAIRound(state, runAI);
      slowest = Math.max(slowest, performance.now() - t0);
      wars += events.filter((e) => e.type === 'war').length;
      captures += events.filter((e) => e.type === 'cityCaptured').length;
      if (state.turn === 101) {
        era100 = leadEra(state);
        civ100 = civicEraOf(state.players.reduce((a, p) => (p.civics.length > a.length ? p.civics : a), [])).name;
      }
      const problems = check(state);
      if (problems.length) throw new Error(`turn ${state.turn}: ${problems.slice(0, 5).join('; ')}`);
    }
    const again = deserialize(serialize(state));
    if (serialize(again) !== serialize(state)) throw new Error('save round-trip changed the game');
  } catch (e) {
    failures++;
    console.error(`FAIL game ${g} (seed ${opts.seed}, ${opts.size}, ${opts.difficulty}): ${e.stack || e.message}`);
  }
  const alive = state.players.filter((p) => p.alive);
  rows.push({
    game: g,
    size: opts.size,
    difficulty: opts.difficulty,
    turn: state.turn,
    result: state.victory ? `${state.victory} → ${state.players[state.winner]?.name}` : 'running',
    alive: alive.length,
    cities: state.players.map((p) => citiesOf(state, p.id).length).join('/'),
    techs: state.players.map((p) => p.techs.length).join('/'),
    civics: state.players.map((p) => p.civics.length).join('/'),
    era100,
    civ100,
    era: leadEra(state),
    scores: state.players.map((p) => (p.alive ? score(state, p.id) : '✗')).join('/'),
    wars,
    captures,
    slowestRoundMs: Math.round(slowest),
  });
}
console.table(rows);
const seconds = ((performance.now() - started) / 1000).toFixed(1);
console.log(`${games} games, ${failures} failed, ${seconds}s`);
process.exit(failures ? 1 : 0);
