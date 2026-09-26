import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, serialize } from '../src/core/state.js';
import { playAIRound } from '../src/core/game.js';
import { runAI } from '../src/ai/ai.js';
import { citiesOf } from '../src/core/query.js';

test('the same seed replays the same AI game exactly', () => {
  const run = () => {
    const s = createGame({ seed: 4242, size: 'small', rivals: 3, allAI: true });
    for (let i = 0; i < 40; i++) playAIRound(s, runAI);
    return serialize(s);
  };
  assert.equal(run(), run());
});

test('AI players expand, research and stay within save limits', () => {
  const s = createGame({ seed: 99, size: 'medium', rivals: 3, allAI: true, turnLimit: 150 });
  for (let i = 0; i < 60; i++) playAIRound(s, runAI);
  for (const p of s.players.filter((p) => p.alive)) {
    assert.ok(citiesOf(s, p.id).length >= 2, `${p.name} should have settled more than one city by turn 60`);
    assert.ok(p.techs.length >= 4, `${p.name} should have researched several techs`);
  }
  for (let i = 0; i < 90 && s.phase === 'playing'; i++) playAIRound(s, runAI);
  const size = serialize(s).length;
  assert.ok(size < 1_000_000, `late-game save is ${size} bytes`);
});
