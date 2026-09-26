import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareState, flatMap } from './helpers.js';
import { TECHS, TECH_KEYS, ERAS, ERA_INDEX, eraOf } from '../src/data/techs.js';
import { UNITS } from '../src/data/units.js';
import { BUILDINGS } from '../src/data/buildings.js';
import { DISTRICTS } from '../src/data/districts.js';
import { IMPROVEMENTS } from '../src/data/terrain.js';
import { spawnUnit, touch } from '../src/core/query.js';
import { foundCity, buildReason, buildOptions, processCity, cityMaxHp, upgradeTarget } from '../src/core/city.js';
import { validDistrictTiles } from '../src/core/placement.js';
import { tileYield, cityYields } from '../src/core/yields.js';
import { applyAction } from '../src/core/actions.js';
import { createGame, serialize, deserialize, SAVE_VERSION } from '../src/core/state.js';
import { defenseOf, cityDefense } from '../src/core/combat.js';
import { addScience } from '../src/core/research.js';
import { checkVictory } from '../src/core/victory.js';
import { maxMoves } from '../src/core/effects.js';
import { neighbors, index } from '../src/core/hex.js';

function world(w = 14, h = 10) {
  const state = bareState(flatMap(w, h), 2);
  touch(state);
  return state;
}

// ---------- the dictionary itself ----------

test('the tech tree has 76 techs in 9 eras, and prerequisites never point forward', () => {
  assert.equal(TECH_KEYS.length, 76);
  assert.equal(ERAS.length, 9);
  for (const k of TECH_KEYS) {
    const t = TECHS[k];
    assert.ok(ERA_INDEX[t.era] != null, `${k} has a known era`);
    for (const r of t.req) {
      assert.ok(TECHS[r], `${k} needs unknown tech ${r}`);
      assert.ok(ERA_INDEX[TECHS[r].era] <= ERA_INDEX[t.era], `${k} needs ${r} from a later era`);
      assert.ok(TECH_KEYS.indexOf(r) < TECH_KEYS.indexOf(k), `${r} is listed after ${k}, which needs it`);
    }
  }
  assert.equal(TECH_KEYS.filter((k) => TECHS[k].effect?.victory).length, 1, 'exactly one victory tech');
  // Costs rise era by era.
  for (let e = 1; e < ERAS.length; e++) {
    const prev = Math.max(...TECH_KEYS.filter((k) => ERA_INDEX[TECHS[k].era] === e - 1).map((k) => TECHS[k].cost));
    const min = Math.min(...TECH_KEYS.filter((k) => ERA_INDEX[TECHS[k].era] === e).map((k) => TECHS[k].cost));
    assert.ok(min > prev, `${ERAS[e].name} techs cost more than ${ERAS[e - 1].name} techs`);
  }
});

test('everything names a real tech, and unit lines only move forward', () => {
  for (const [kind, table] of Object.entries({ UNITS, BUILDINGS, DISTRICTS, IMPROVEMENTS })) {
    for (const [k, d] of Object.entries(table)) if (d.tech) assert.ok(TECHS[d.tech], `${kind}.${k} names unknown tech ${d.tech}`);
  }
  for (const [k, d] of Object.entries(UNITS)) {
    if (!d.upgradesTo) continue;
    const next = UNITS[d.upgradesTo];
    assert.ok(next, `${k} upgrades to unknown unit`);
    assert.equal(next.cls === 'civilian', false);
    assert.ok(next.strength > d.strength, `${d.upgradesTo} is stronger than ${k}`);
    if (d.tech) assert.ok(ERA_INDEX[TECHS[next.tech].era] >= ERA_INDEX[TECHS[d.tech].era]);
  }
  for (const [k, d] of Object.entries(BUILDINGS)) {
    if (d.district) assert.ok(DISTRICTS[d.district], `${k} needs unknown district`);
    if (d.requires) assert.ok(BUILDINGS[d.requires], `${k} requires unknown building`);
  }
});

test('the era follows the most advanced tech known', () => {
  assert.equal(eraOf([]).key, 'ancient');
  assert.equal(eraOf(['pottery', 'currency']).key, 'classical');
  assert.equal(eraOf(['offworld']).key, 'future');
});

// ---------- effects ----------

test('Irrigation adds food to farms and Buttress adds production to every city', () => {
  const s = world();
  const city = foundCity(s, 0, index(s.map, 6, 5), []);
  const tile = neighbors(s.map, city.tile)[2];
  s.map.tiles[tile].imp = 'farm';
  const farm = tileYield(s, tile).food;
  const prod = cityYields(s, city).prod;
  s.players[0].techs.push('pottery', 'irrigation');
  touch(s);
  assert.equal(tileYield(s, tile).food, farm + 1);
  s.players[0].techs.push('buttress');
  touch(s);
  assert.ok(cityYields(s, city).prod >= prod + 1);
});

test('tech effects raise moves, builder uses and wall HP', () => {
  const s = world();
  const p = s.players[0];
  const city = foundCity(s, 0, index(s.map, 6, 5), []);
  city.buildings.push('walls');
  const hp = cityMaxHp(s, city);
  const scout = spawnUnit(s, 0, 'scout', index(s.map, 2, 2));
  const moves = maxMoves(s, scout);
  p.techs.push('wheel', 'engineering', 'masonry', 'horseback', 'construction');
  assert.equal(cityMaxHp(s, city), hp + 50);
  const b = spawnUnit(s, 0, 'builder', index(s.map, 3, 3));
  assert.equal(b.charges, UNITS.builder.charges + 1);
  p.techs.push(...TECH_KEYS.filter((k) => TECHS[k].effect?.moves));
  assert.ok(maxMoves(s, scout) > moves);
});

test('Satellites reveal the whole map', () => {
  const s = world();
  const p = s.players[0];
  p.techs.push(...TECHS.satellites.req);
  p.research = 'satellites';
  p.researchPath = ['satellites'];
  addScience(s, 0, TECHS.satellites.cost, []);
  assert.ok(p.techs.includes('satellites'));
  assert.ok(p.explored.every((x) => x === 1));
});

// ---------- units ----------

test('a new tech replaces the old unit: it can no longer be built, and queued ones switch over', () => {
  const s = world();
  const city = foundCity(s, 0, index(s.map, 6, 5), []);
  const p = s.players[0];
  assert.equal(buildReason(s, city, { kind: 'unit', key: 'warrior' }), null);
  city.queue.push({ kind: 'unit', key: 'warrior' });
  p.techs.push('mining', 'bronze', 'ironworking');
  assert.match(buildReason(s, city, { kind: 'unit', key: 'warrior' }), /Replaced by Swordsman/);
  assert.ok(!buildOptions(s, city).some((o) => o.key === 'warrior' && o.kind === 'unit' && !city.queue.length));
  processCity(s, city, []);
  assert.equal(city.queue[0].key, 'swordsman');
});

test('units upgrade for gold inside your borders, skipping steps already researched', () => {
  const s = world();
  foundCity(s, 0, index(s.map, 6, 5), []);
  const p = s.players[0];
  const home = spawnUnit(s, 0, 'warrior', index(s.map, 7, 5));
  const away = spawnUnit(s, 0, 'warrior', index(s.map, 12, 8));
  assert.equal(applyAction(s, { type: 'upgrade', player: 0, unit: home.id }).ok, false);
  p.techs.push('mining', 'bronze', 'ironworking', 'pottery', 'writing', 'currency', 'animal', 'horseback', 'apprenticeship');
  assert.equal(upgradeTarget(s, home), 'manatarms');
  p.gold = 500;
  const far = applyAction(s, { type: 'upgrade', player: 0, unit: away.id });
  assert.equal(far.ok, false);
  assert.match(far.reason, /borders/);
  const r = applyAction(s, { type: 'upgrade', player: 0, unit: home.id });
  assert.ok(r.ok, r.reason);
  assert.equal(home.type, 'manatarms');
  assert.equal(p.gold, 500 - (UNITS.manatarms.cost - UNITS.warrior.cost) * 2);
  assert.equal(home.moves, 0);
  p.gold = 0;
  const broke = applyAction(s, { type: 'upgrade', player: 0, unit: away.id });
  assert.equal(broke.ok, false);
});

test('spearmen get +10 against mounted units only', () => {
  const s = world();
  const spear = spawnUnit(s, 0, 'spearman', index(s.map, 4, 4));
  const horse = spawnUnit(s, 1, 'horseman', index(s.map, 5, 4));
  const sword = spawnUnit(s, 1, 'warrior', index(s.map, 6, 6));
  assert.equal(defenseOf(s, spear, horse).total, UNITS.spearman.strength + 10);
  assert.equal(defenseOf(s, spear, sword).total, UNITS.spearman.strength);
});

test('city defense keeps pace with the era', () => {
  const s = world();
  const city = foundCity(s, 0, index(s.map, 6, 5), []);
  const early = cityDefense(s, city).total;
  s.players[0].techs.push(...TECH_KEYS.filter((k) => ERA_INDEX[TECHS[k].era] <= ERA_INDEX.modern));
  assert.ok(cityDefense(s, city).total >= early + 40);
});

// ---------- districts ----------

test('harbors go on coast next to the city, and need Celestial Navigation', () => {
  const s = world();
  const center = index(s.map, 6, 5);
  const coastNear = neighbors(s.map, center)[0];
  s.map.tiles[coastNear].t = 'coast';
  const city = foundCity(s, 0, center, []);
  assert.match(buildReason(s, city, { kind: 'district', key: 'harbor' }), /Needs Celestial Navigation/);
  s.players[0].techs.push('sailing', 'astrology', 'celestial');
  const tiles = validDistrictTiles(s, city, 'harbor');
  assert.deepEqual(tiles, [coastNear]);
  assert.ok(!validDistrictTiles(s, city, 'campus').includes(coastNear));
  s.map.tiles[coastNear].district = 'harbor';
  city.districts.push(coastNear);
  assert.ok(tileYield(s, coastNear).gold >= 2, 'harbor next to the city center gets its adjacency gold');
});

// ---------- victory and saves ----------

test('the first civilization to finish Offworld Mission wins a science victory', () => {
  const s = world();
  foundCity(s, 0, index(s.map, 3, 3), []);
  foundCity(s, 1, index(s.map, 10, 6), []);
  const p = s.players[1];
  p.techs = TECH_KEYS.filter((k) => k !== 'offworld');
  p.research = 'offworld';
  p.researchPath = ['offworld'];
  const events = [];
  addScience(s, 1, TECHS.offworld.cost, events);
  checkVictory(s, events);
  assert.equal(s.phase, 'ended');
  assert.equal(s.victory, 'science');
  assert.equal(s.winner, 1);
});

test('saves from 1.1 load with Philosophy removed and the civics tree added', () => {
  const s = createGame({ seed: 42 });
  const old = JSON.parse(serialize(s));
  old.version = 1;
  for (const p of old.players) for (const k of ['civic', 'civicPath', 'civics', 'civicProgress', 'cultureOverflow', 'futureCivics', 'government', 'policies', 'freeChanges']) delete p[k];
  old.players[0].techs = ['pottery', 'writing', 'philosophy'];
  old.players[0].progress = { philosophy: 10 };
  old.players[0].research = 'philosophy';
  old.players[0].researchPath = ['philosophy'];
  const loaded = deserialize(JSON.stringify(old));
  assert.equal(loaded.version, SAVE_VERSION);
  assert.deepEqual(loaded.players[0].civics, []);
  assert.equal(loaded.players[0].government, null);
  assert.deepEqual(loaded.players[0].techs, ['pottery', 'writing']);
  assert.equal(loaded.players[0].research, null);
  assert.equal(loaded.players[0].progress.philosophy, undefined);
});
