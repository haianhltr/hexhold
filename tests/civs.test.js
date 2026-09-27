import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareState, flatMap } from './helpers.js';
import { CIVS, CIV_KEYS } from '../src/data/civs.js';
import { EMBLEMS } from '../src/data/emblems.js';
import { UNITS } from '../src/data/units.js';
import { BUILDINGS } from '../src/data/buildings.js';
import { IMPROVEMENTS } from '../src/data/terrain.js';
import { EUREKAS, INSPIRATIONS } from '../src/data/boosts.js';
import { TECHS } from '../src/data/techs.js';
import { CIVICS } from '../src/data/civics.js';
import { slotsFor } from '../src/data/government.js';
import { spawnUnit, touch } from '../src/core/query.js';
import { foundCity, buildReason, upgradeTarget } from '../src/core/city.js';
import { tileYield } from '../src/core/yields.js';
import { applyAction } from '../src/core/actions.js';
import { maxMoves } from '../src/core/effects.js';
import { defenseOf, resolveAttack } from '../src/core/combat.js';
import { boostGoal, goalText, checkBoosts } from '../src/core/boosts.js';
import { tourismOf, cultureStatus } from '../src/core/tourism.js';
import { checkVictory, scoreBreakdown } from '../src/core/victory.js';
import { recordHistory, historyPoints } from '../src/core/history.js';
import { createGame, serialize, deserialize, SAVE_VERSION } from '../src/core/state.js';
import { neighbors, index } from '../src/core/hex.js';

// A two-player world where player 0 plays `civ`.
function world(civ = 'rome', w = 14, h = 10) {
  const s = bareState(flatMap(w, h), 2);
  const p = s.players[0];
  Object.assign(p, { civ, name: CIVS[civ].name, color: CIVS[civ].color, emblem: CIVS[civ].emblem });
  touch(s);
  return s;
}

// ---------- the dictionary ----------

test('12 civilizations, each with a leader, emblem, cities and three unique traits', () => {
  assert.equal(CIV_KEYS.length, 12);
  const colors = new Set();
  for (const k of CIV_KEYS) {
    const c = CIVS[k];
    assert.ok(c.leader && c.ability.name && c.ability.text, `${k} has a leader and ability`);
    assert.ok(EMBLEMS[c.emblem], `${k} has an emblem`);
    assert.ok(c.cities.length >= 15, `${k} has city names`);
    colors.add(c.color);
    const unit = UNITS[c.unit];
    assert.equal(unit.civ, k, `${k}'s unique unit belongs to it`);
    assert.ok(UNITS[unit.replaces] && !UNITS[unit.replaces].civ, `${c.unit} replaces a standard unit`);
    const { kind, key } = c.infra;
    if (kind === 'building') assert.equal(BUILDINGS[key].civ, k);
    else if (kind === 'improvement') assert.equal(IMPROVEMENTS[key].civ, k);
    else assert.ok(c.districtNames[key] && c.infraEffect);
  }
  assert.equal(colors.size, 12, 'every civilization has its own color');
});

test('boost goals name real things, and nearly every tech and civic has one', () => {
  for (const [track, goals, table] of [['tech', EUREKAS, TECHS], ['civic', INSPIRATIONS, CIVICS]]) {
    for (const key of Object.keys(goals)) {
      assert.ok(table[key], `${key} is a real ${track}`);
      const goal = boostGoal(track, key);
      assert.ok(goal.n > 0);
      assert.doesNotMatch(goalText(goal), /Unknown|undefined/, `${key}: ${goalText(goal)}`);
    }
    assert.ok(Object.keys(goals).length >= Object.keys(table).length - 4);
  }
  assert.equal(goalText(boostGoal('tech', 'education')), 'Build 2 Libraries');
  assert.equal(goalText(boostGoal('tech', 'tactics')), 'Train 2 Spearmen');
  assert.equal(goalText(boostGoal('tech', 'masonry')), 'Build a Mine');
});

// ---------- unique traits ----------

test("Rome's Legion replaces the Swordsman, and new Roman cities start with a Monument", () => {
  const s = world('rome');
  const city = foundCity(s, 0, index(s.map, 6, 5), []);
  assert.ok(city.buildings.includes('monument'));
  s.players[0].techs.push('mining', 'bronze', 'ironworking');
  assert.equal(buildReason(s, city, { kind: 'unit', key: 'legion' }), null);
  assert.match(buildReason(s, city, { kind: 'unit', key: 'swordsman' }), /Replaced by your Legion/);
  const w = spawnUnit(s, 0, 'warrior', index(s.map, 7, 5));
  assert.equal(upgradeTarget(s, w), 'legion');
  const other = world('egypt');
  const c2 = foundCity(other, 0, index(other.map, 6, 5), []);
  other.players[0].techs.push('mining', 'bronze', 'ironworking');
  assert.match(buildReason(other, c2, { kind: 'unit', key: 'legion' }), /Only Rome/);
  assert.ok(!c2.buildings.includes('monument'));
});

test('unique improvements are only for their own civilization', () => {
  const s = world('egypt');
  const city = foundCity(s, 0, index(s.map, 6, 5), []);
  const tile = neighbors(s.map, city.tile)[1];
  const b = spawnUnit(s, 0, 'builder', tile);
  assert.match(applyAction(s, { type: 'improve', player: 0, unit: b.id, kind: 'sphinx' }).reason, /Craftsmanship/);
  s.players[0].civics.push('code', 'craftsmanship');
  assert.ok(applyAction(s, { type: 'improve', player: 0, unit: b.id, kind: 'sphinx' }).ok);
  assert.equal(tileYield(s, tile).culture, 1);
  const r = world('rome');
  const c2 = foundCity(r, 0, index(r.map, 6, 5), []);
  r.players[0].civics.push('code', 'craftsmanship');
  const b2 = spawnUnit(r, 0, 'builder', neighbors(r.map, c2.tile)[1]);
  assert.match(applyAction(r, { type: 'improve', player: 0, unit: b2.id, kind: 'sphinx' }).reason, /Only Egypt/);
});

test('civilization abilities: Greek slots, Japanese adjacency, Mongol riders, Chinese boosts', () => {
  const greece = world('greece');
  greece.players[0].government = 'autocracy';
  assert.equal(slotsFor(greece.players[0]).length, 5);
  assert.equal(slotsFor(greece.players[0]).filter((k) => k === 'wildcard').length, 2);

  const japan = world('japan');
  const rome = world('rome');
  for (const s of [japan, rome]) {
    const center = index(s.map, 6, 5);
    foundCity(s, 0, center, []);
    const spot = neighbors(s.map, center)[0];
    s.map.tiles[spot].district = 'campus';
    // The city center is one neighboring district.
    s.map.tiles[spot].t = 'grass';
  }
  const spotJ = neighbors(japan.map, index(japan.map, 6, 5))[0];
  const spotR = neighbors(rome.map, index(rome.map, 6, 5))[0];
  assert.equal(tileYield(japan, spotJ).science, tileYield(rome, spotR).science + 1);

  const mongolia = world('mongolia');
  const horse = spawnUnit(mongolia, 0, 'horseman', index(mongolia.map, 3, 3));
  assert.equal(maxMoves(mongolia, horse), UNITS.horseman.moves + 1);
  assert.equal(defenseOf(mongolia, horse).total, UNITS.horseman.strength + 3);

  const china = world('china');
  china.players[0].techs.push('pottery');
  foundCity(china, 0, index(china.map, 6, 5), []);
  china.map.tiles[neighbors(china.map, index(china.map, 6, 5))[2]].imp = 'mine';
  china.map.tiles[neighbors(china.map, index(china.map, 6, 5))[2]].hills = true;
  checkBoosts(china, 0, []);
  assert.equal(china.players[0].progress.masonry, Math.round(TECHS.masonry.cost * 0.55));
});

test('the Aztec Flower War turns kills into culture toward civics', () => {
  const s = world('aztec');
  s.met.push('0-1');
  s.war.push('0-1');
  s.players[0].civic = 'code';
  s.players[0].civicPath = ['code'];
  const a = spawnUnit(s, 0, 'swordsman', index(s.map, 4, 4));
  const d = spawnUnit(s, 1, 'scout', index(s.map, 5, 4));
  d.hp = 1;
  resolveAttack(s, a, d.tile, []);
  assert.equal(s.players[0].civicProgress.code, UNITS.scout.strength / 2);
});

// ---------- boosts ----------

test('meeting a goal gives a Eureka or Inspiration once', () => {
  const s = world('rome');
  const p = s.players[0];
  const city = foundCity(s, 0, index(s.map, 6, 5), []);
  const tile = neighbors(s.map, city.tile)[2];
  s.map.tiles[tile].hills = true;
  p.techs.push('mining');
  const b = spawnUnit(s, 0, 'builder', tile);
  const r = applyAction(s, { type: 'improve', player: 0, unit: b.id, kind: 'mine' });
  assert.ok(r.ok, r.reason);
  const boost = r.events.find((e) => e.type === 'boost' && e.key === 'masonry');
  assert.ok(boost, 'building a mine gives the Masonry Eureka');
  assert.equal(p.progress.masonry, Math.round(TECHS.masonry.cost * 0.4));
  assert.ok(p.eurekas.includes('masonry'));
  const again = [];
  checkBoosts(s, 0, again);
  assert.ok(!again.some((e) => e.key === 'masonry'));
});

// ---------- tourism and culture victory ----------

test('tourism starts with Humanism, and dominating every rival wins a culture victory', () => {
  const s = world('france');
  const p = s.players[0];
  foundCity(s, 0, index(s.map, 3, 3), []);
  foundCity(s, 1, index(s.map, 10, 6), []);
  s.met.push('0-1');
  assert.equal(tourismOf(s, 0), 0);
  p.civics.push('humanism');
  assert.ok(tourismOf(s, 0) > 0);
  s.players[1].cultureTotal = 500; // 5 tourists at home
  p.tourismTo = { 1: 5 * 200 };
  assert.equal(cultureStatus(s, 0)[0].dominant, false);
  p.tourismTo = { 1: 6 * 200 };
  assert.equal(cultureStatus(s, 0)[0].dominant, true);
  checkVictory(s, []);
  assert.equal(s.victory, 'culture');
  assert.equal(s.winner, 0);
});

// ---------- history ----------

test('history records moments, world firsts score more, and they count toward score', () => {
  const s = world('rome');
  const events = [];
  const city = foundCity(s, 0, index(s.map, 6, 5), events);
  events.push({ type: 'built', owner: 0, city: city.id, item: { kind: 'district', key: 'campus' } });
  events.push({ type: 'built', owner: 1, city: city.id, item: { kind: 'district', key: 'campus' } });
  s.players[0].techs.push('pottery', 'writing', 'currency');
  events.push({ type: 'tech', player: 0, tech: 'currency' });
  recordHistory(s, events);
  recordHistory(s, events); // already recorded: no duplicates
  const mine = s.history.filter((m) => m.p === 0);
  assert.deepEqual(mine.map((m) => m.x), ['Founded the capital, Roma', "Built the world's first Campus, in Roma", 'First civilization to enter the Classical Era']);
  assert.equal(historyPoints(s, 0), 1 + 3 + 3);
  assert.equal(s.history.filter((m) => m.p === 1)[0].x, 'Built a first Campus, in Roma');
  assert.equal(scoreBreakdown(s, 0).find((r) => r.label === 'Historic moments').points, 7);
});

// ---------- saves ----------

test('saves from 1.3 load with real civilizations', () => {
  const s = createGame({ seed: 5, civ: 'korea' });
  assert.equal(s.players[0].civ, 'korea');
  assert.equal(s.players[0].leader, 'Sejong');
  const old = JSON.parse(serialize(s));
  old.version = 3;
  old.players.forEach((p, i) => {
    p.civ = i;
    for (const k of ['eurekas', 'inspirations', 'cultureTotal', 'tourismTo', 'firsts', 'leader']) delete p[k];
  });
  delete old.history;
  delete old.firsts;
  const loaded = deserialize(JSON.stringify(old));
  assert.equal(loaded.version, SAVE_VERSION);
  assert.equal(loaded.players[0].civ, 'rome');
  assert.equal(loaded.players[0].name, 'Rome');
  assert.deepEqual(loaded.players[0].eurekas, []);
  assert.deepEqual(loaded.history, []);
});
