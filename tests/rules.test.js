import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareState, flatMap } from './helpers.js';
import { spawnUnit, cityAt, touch } from '../src/core/query.js';
import { foundCity, growthThreshold, processCity, assignWorkers, buildReason } from '../src/core/city.js';
import { adjacencyBonus, districtLimit, validDistrictTiles } from '../src/core/placement.js';
import { tileYield, cityYields } from '../src/core/yields.js';
import { applyAction } from '../src/core/actions.js';
import { serialize } from '../src/core/state.js';
import { damageRange } from '../src/core/combat.js';
import { findPath, reachableTiles } from '../src/core/pathfind.js';
import { addScience, researchPath } from '../src/core/research.js';
import { neighbors, index } from '../src/core/hex.js';

function world(w = 14, h = 10) {
  const state = bareState(flatMap(w, h), 2);
  touch(state);
  return state;
}

test('founding a city claims the tiles around it and makes it the capital', () => {
  const s = world();
  const tile = index(s.map, 5, 5);
  const city = foundCity(s, 0, tile, []);
  const owned = s.map.tiles.filter((t) => t.city === city.id).length;
  assert.equal(owned, 7);
  assert.ok(city.capital);
  assert.equal(s.players[0].capital, city.id);
  assert.equal(cityAt(s, tile), city);
  assert.equal(city.worked.length, 1);
});

test('growth needs more food at each size', () => {
  assert.equal(growthThreshold(1), 15);
  assert.ok(growthThreshold(2) > growthThreshold(1));
  assert.ok(growthThreshold(6) > growthThreshold(5));
});

test('a fed city grows', () => {
  const s = world();
  const city = foundCity(s, 0, index(s.map, 5, 5), []);
  const events = [];
  for (let i = 0; i < 10; i++) processCity(s, city, events);
  assert.ok(city.pop >= 2, `pop should grow, got ${city.pop}`);
  assert.ok(events.some((e) => e.type === 'grew'));
});

test('production completes a queued warrior', () => {
  const s = world();
  const city = foundCity(s, 0, index(s.map, 5, 5), []);
  assert.ok(applyAction(s, { type: 'setProduction', player: 0, city: city.id, item: { kind: 'unit', key: 'warrior' } }).ok);
  const events = [];
  for (let i = 0; i < 12 && city.queue.length; i++) processCity(s, city, events);
  assert.ok(Object.values(s.units).some((u) => u.type === 'warrior' && u.owner === 0));
});

test('campus adjacency counts mountains and neighboring districts', () => {
  const s = world();
  const center = index(s.map, 6, 5);
  foundCity(s, 0, center, []);
  const spot = neighbors(s.map, center)[0];
  const around = neighbors(s.map, spot).filter((n) => n !== center);
  s.map.tiles[around[0]].t = 'mountain';
  s.map.tiles[around[1]].t = 'mountain';
  assert.equal(adjacencyBonus(s, spot, 'campus'), 2); // 2 mountains, 1 district (city center) rounds down
  s.map.tiles[around[2]].district = 'encampment';
  assert.equal(adjacencyBonus(s, spot, 'campus'), 3); // 2 districts -> +1
  s.map.tiles[spot].district = 'campus';
  assert.equal(tileYield(s, spot).science, 4); // base 1 + adjacency 3
});

test('commercial hubs next to coast get +2', () => {
  const s = world();
  const spot = index(s.map, 5, 5);
  s.map.tiles[neighbors(s.map, spot)[0]].t = 'coast';
  assert.equal(adjacencyBonus(s, spot, 'commercial'), 2);
});

test('districts need population and the right tech', () => {
  const s = world();
  const city = foundCity(s, 0, index(s.map, 6, 5), []);
  assert.equal(districtLimit(city), 1);
  assert.match(buildReason(s, city, { kind: 'district', key: 'campus' }), /Needs Writing/);
  s.players[0].techs.push('writing', 'bronze');
  assert.equal(buildReason(s, city, { kind: 'district', key: 'campus' }), null);
  assert.ok(applyAction(s, { type: 'setProduction', player: 0, city: city.id, item: { kind: 'district', key: 'campus' } }).ok);
  assert.match(buildReason(s, city, { kind: 'district', key: 'encampment' }), /population 4/);
});

test('encampments may not sit next to the city center', () => {
  const s = world();
  const center = index(s.map, 6, 5);
  const city = foundCity(s, 0, center, []);
  city.culture = 1000;
  processCity(s, city, []);
  const tiles = validDistrictTiles(s, city, 'encampment');
  for (const t of tiles) assert.ok(!neighbors(s.map, center).includes(t));
});

test('rejected actions change nothing', () => {
  const s = world();
  const city = foundCity(s, 0, index(s.map, 6, 5), []);
  spawnUnit(s, 1, 'warrior', index(s.map, 1, 1));
  const before = serialize(s);
  const results = [
    applyAction(s, { type: 'setProduction', player: 0, city: city.id, item: { kind: 'building', key: 'library' } }),
    applyAction(s, { type: 'found', player: 0, unit: 999 }),
    applyAction(s, { type: 'research', player: 0, tech: 'nope' }),
    applyAction(s, { type: 'declareWar', player: 0, target: 1 }),
    applyAction(s, { type: 'bogus', player: 0 }),
  ];
  for (const r of results) {
    assert.equal(r.ok, false);
    assert.ok(r.reason.length > 0);
  }
  assert.equal(serialize(s), before);
});

test('cities must be spaced apart', () => {
  const s = world();
  foundCity(s, 0, index(s.map, 6, 5), []);
  const settler = spawnUnit(s, 0, 'settler', index(s.map, 8, 5));
  const r = applyAction(s, { type: 'found', player: 0, unit: settler.id });
  assert.equal(r.ok, false);
  assert.match(r.reason, /Too close/);
});

test('equal strengths deal 24 to 36 damage', () => {
  assert.deepEqual(damageRange(20, 20), [24, 36]);
  const [lo] = damageRange(40, 20);
  assert.ok(lo > 36);
});

test('melee combat at war damages both sides; peace blocks the attack', () => {
  const s = world();
  const a = spawnUnit(s, 0, 'swordsman', index(s.map, 4, 4));
  const b = spawnUnit(s, 1, 'warrior', index(s.map, 5, 4));
  s.met.push('0-1');
  const peace = applyAction(s, { type: 'attack', player: 0, unit: a.id, target: b.tile });
  assert.equal(peace.ok, false);
  assert.match(peace.reason, /peace/);
  assert.ok(applyAction(s, { type: 'declareWar', player: 0, target: 1 }).ok);
  const r = applyAction(s, { type: 'attack', player: 0, unit: a.id, target: index(s.map, 5, 4) });
  assert.ok(r.ok, r.reason);
  const fight = r.events.find((e) => e.type === 'combat');
  assert.ok(fight.dmgToTarget > fight.dmgToSelf, 'the stronger unit should win the exchange');
  assert.equal(a.moves, 0);
});

test('a melee unit captures a city at 0 HP and the defender is eliminated', () => {
  const s = world();
  const city = foundCity(s, 1, index(s.map, 8, 5), []);
  city.hp = 1;
  const a = spawnUnit(s, 0, 'swordsman', index(s.map, 7, 5));
  s.met.push('0-1');
  applyAction(s, { type: 'declareWar', player: 0, target: 1 });
  const r = applyAction(s, { type: 'attack', player: 0, unit: a.id, target: city.tile });
  assert.ok(r.ok, r.reason);
  assert.equal(city.owner, 0);
  assert.equal(a.tile, city.tile);
  assert.equal(s.players[1].alive, false);
  assert.equal(s.phase, 'ended');
  assert.equal(s.victory, 'domination');
});

test('paths avoid mountains and peaceful borders', () => {
  const s = world();
  const u = spawnUnit(s, 0, 'warrior', index(s.map, 1, 5));
  for (let r = 2; r <= 8; r++) s.map.tiles[index(s.map, 5, r)].t = 'mountain';
  const path = findPath(s, u, index(s.map, 9, 5));
  assert.ok(path);
  for (const t of path) assert.notEqual(s.map.tiles[t].t, 'mountain');
  foundCity(s, 1, index(s.map, 11, 5), []);
  assert.equal(findPath(s, u, index(s.map, 11, 4)), null);
  assert.ok(reachableTiles(s, u).size > 0);
});

test('research follows prerequisites and carries overflow', () => {
  const s = world();
  const p = s.players[0];
  assert.deepEqual(researchPath(p, 'currency'), ['pottery', 'writing', 'currency']);
  applyAction(s, { type: 'research', player: 0, tech: 'currency' });
  const events = [];
  addScience(s, 0, 35, events);
  assert.deepEqual(p.techs, ['pottery']);
  assert.equal(p.research, 'writing');
  assert.equal(p.progress.writing, 35 - 22);
});

test('farms add food and builders use up charges', () => {
  const s = world();
  const city = foundCity(s, 0, index(s.map, 6, 5), []);
  const tile = neighbors(s.map, city.tile)[2];
  const b = spawnUnit(s, 0, 'builder', tile);
  const before = tileYield(s, tile).food;
  assert.ok(applyAction(s, { type: 'improve', player: 0, unit: b.id, kind: 'farm' }).ok);
  assert.equal(tileYield(s, tile).food, before + 1);
  assert.equal(b.charges, 2);
  assignWorkers(s, city);
  assert.ok(cityYields(s, city).food > 0);
});
