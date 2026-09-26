import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareState, flatMap } from './helpers.js';
import { CIVICS, CIVIC_KEYS } from '../src/data/civics.js';
import { ERA_INDEX } from '../src/data/techs.js';
import { GOVERNMENTS, GOVERNMENT_KEYS, POLICIES, POLICY_KEYS, SLOT_TYPES, slotsOf } from '../src/data/government.js';
import { BUILDINGS } from '../src/data/buildings.js';
import { DISTRICTS } from '../src/data/districts.js';
import { spawnUnit, touch } from '../src/core/query.js';
import { foundCity, buildReason, productionRate, buyTileCost, upgradeCost, cityGrowthThreshold, growthThreshold } from '../src/core/city.js';
import { tileYield, cityYields, unitUpkeep } from '../src/core/yields.js';
import { applyAction } from '../src/core/actions.js';
import { addCulture, policySwapCost, availablePolicies } from '../src/core/civics.js';
import { effects } from '../src/core/effects.js';
import { endRound } from '../src/core/turn.js';
import { score } from '../src/core/victory.js';
import { neighbors, index } from '../src/core/hex.js';

function world(w = 14, h = 10) {
  const state = bareState(flatMap(w, h), 2);
  touch(state);
  return state;
}

// Gives player 0 these civics (and their prerequisites) outright.
function learn(s, ...keys) {
  const p = s.players[0];
  const visit = (k) => {
    if (p.civics.includes(k)) return;
    for (const r of CIVICS[k].req) visit(r);
    p.civics.push(k);
  };
  keys.forEach(visit);
}

// ---------- the dictionary ----------

test('the civics tree has 59 civics in 9 eras, and prerequisites never point forward', () => {
  assert.equal(CIVIC_KEYS.length, 59);
  assert.equal(new Set(CIVIC_KEYS.map((k) => CIVICS[k].era)).size, 9);
  for (const k of CIVIC_KEYS) {
    for (const r of CIVICS[k].req) {
      assert.ok(CIVICS[r], `${k} needs unknown civic ${r}`);
      assert.ok(ERA_INDEX[CIVICS[r].era] <= ERA_INDEX[CIVICS[k].era], `${k} needs ${r} from a later era`);
      assert.ok(CIVIC_KEYS.indexOf(r) < CIVIC_KEYS.indexOf(k), `${r} is listed after ${k}`);
    }
  }
});

test('every government and card names a real civic, and replacements come later', () => {
  assert.equal(GOVERNMENT_KEYS.length, 13);
  for (const [k, g] of Object.entries(GOVERNMENTS)) {
    assert.ok(CIVICS[g.civic], `${k} needs unknown civic`);
    assert.equal(g.slots.length, SLOT_TYPES.length);
  }
  for (const [k, c] of Object.entries(POLICIES)) {
    assert.ok(CIVICS[c.civic], `${k} needs unknown civic`);
    assert.ok(SLOT_TYPES.includes(c.slot));
    if (c.obsoleteBy) {
      const next = POLICIES[c.obsoleteBy];
      assert.ok(next, `${k} is replaced by an unknown card`);
      assert.equal(next.slot, c.slot, `${k} and its replacement use the same slot`);
      assert.ok(ERA_INDEX[CIVICS[next.civic].era] >= ERA_INDEX[CIVICS[c.civic].era]);
    }
  }
  for (const d of [...Object.values(BUILDINGS), ...Object.values(DISTRICTS)]) if (d.civic) assert.ok(CIVICS[d.civic]);
  // Every civic unlocks something or has an effect of its own.
  for (const k of CIVIC_KEYS) {
    const unlocks = Object.values(GOVERNMENTS).some((g) => g.civic === k) || Object.values(POLICIES).some((c) => c.civic === k)
      || Object.values(BUILDINGS).some((b) => b.civic === k) || Object.values(DISTRICTS).some((d) => d.civic === k) || CIVICS[k].effect;
    assert.ok(unlocks || CIVIC_KEYS.some((c) => CIVICS[c].req.includes(k)), `${k} does nothing`);
  }
});

// ---------- research ----------

test('culture researches civics, and finishing one opens a free-change turn', () => {
  const s = world();
  const p = s.players[0];
  assert.ok(applyAction(s, { type: 'civic', player: 0, civic: 'craftsmanship' }).ok);
  assert.deepEqual(p.civicPath, ['code', 'craftsmanship']);
  const events = [];
  addCulture(s, 0, 25, events);
  assert.deepEqual(p.civics, ['code']);
  assert.equal(p.civicProgress.craftsmanship, 5);
  assert.equal(p.freeChanges, true);
  assert.equal(events[0].type, 'civic');
  assert.equal(events[0].civic, 'code');
});

test('each round turns city culture into civic progress and closes the free-change turn', () => {
  const s = world();
  foundCity(s, 0, index(s.map, 5, 5), []);
  const p = s.players[0];
  p.civic = 'code';
  p.civicPath = ['code'];
  p.freeChanges = true;
  endRound(s, []);
  assert.ok(p.civicProgress.code > 0);
  assert.equal(p.freeChanges, false);
});

// ---------- governments and policies ----------

test('the first government is free; later switches cost gold outside a free-change turn', () => {
  const s = world();
  const p = s.players[0];
  assert.match(applyAction(s, { type: 'government', player: 0, government: 'chiefdom' }).reason, /Code of Laws/);
  learn(s, 'code', 'politicalphilosophy');
  p.gold = 0;
  assert.ok(applyAction(s, { type: 'government', player: 0, government: 'chiefdom' }).ok);
  assert.deepEqual(p.policies, [null, null]);
  p.freeChanges = false;
  const r = applyAction(s, { type: 'government', player: 0, government: 'autocracy' });
  assert.equal(r.ok, false);
  assert.match(r.reason, /gold/);
  p.gold = 1000;
  assert.ok(applyAction(s, { type: 'government', player: 0, government: 'autocracy' }).ok);
  assert.equal(p.gold, 1000 - policySwapCost(p) * 3);
  assert.deepEqual(slotsOf('autocracy'), ['military', 'military', 'economic', 'wildcard']);
});

test('cards must fit their slot: wildcards take any card, wildcard cards need a wildcard slot', () => {
  const s = world();
  const p = s.players[0];
  learn(s, 'politicalphilosophy', 'mysticism');
  applyAction(s, { type: 'government', player: 0, government: 'autocracy' });
  const set = (policies) => applyAction(s, { type: 'policies', player: 0, policies });
  assert.match(set(['urbanplanning', null, null, null]).reason, /Military slot/);
  assert.match(set([null, null, 'revelation', null]).reason, /Economic slot/);
  assert.match(set(['discipline', 'discipline', null, null]).reason, /already slotted/);
  assert.match(set(['discipline', null]).reason, /4 policy slots/);
  assert.match(set([null, null, null, 'bastions']).reason, /Defensive Tactics/);
  assert.ok(set(['discipline', 'conscription', 'urbanplanning', 'godking']).ok);
  assert.ok(set(['discipline', null, 'urbanplanning', 'revelation']).ok);
});

test('outside a free-change turn each newly slotted card costs gold, and removing is free', () => {
  const s = world();
  const p = s.players[0];
  learn(s, 'code');
  applyAction(s, { type: 'government', player: 0, government: 'chiefdom' });
  p.freeChanges = false;
  p.gold = 100;
  const cost = policySwapCost(p);
  assert.ok(applyAction(s, { type: 'policies', player: 0, policies: ['discipline', 'urbanplanning'] }).ok);
  assert.equal(p.gold, 100 - 2 * cost);
  assert.ok(applyAction(s, { type: 'policies', player: 0, policies: [null, 'urbanplanning'] }).ok);
  assert.equal(p.gold, 100 - 2 * cost);
  p.gold = 0;
  assert.equal(applyAction(s, { type: 'policies', player: 0, policies: ['discipline', 'urbanplanning'] }).ok, false);
});

test('a slotted card that becomes obsolete is swapped for its replacement', () => {
  const s = world();
  const p = s.players[0];
  learn(s, 'code', 'craftsmanship');
  applyAction(s, { type: 'government', player: 0, government: 'chiefdom' });
  applyAction(s, { type: 'policies', player: 0, policies: ['agoge', 'ilkum'] });
  learn(s, 'mercenaries', 'faires');
  p.civic = 'exploration';
  p.civicPath = ['exploration'];
  addCulture(s, 0, CIVICS.exploration.cost, []);
  assert.deepEqual(p.policies, ['feudalcontract', 'ilkum']);
  assert.ok(!availablePolicies(p).includes('agoge'));
});

test('switching government keeps the cards that still fit', () => {
  const s = world();
  const p = s.players[0];
  learn(s, 'politicalphilosophy', 'mysticism');
  applyAction(s, { type: 'government', player: 0, government: 'autocracy' });
  applyAction(s, { type: 'policies', player: 0, policies: ['discipline', 'conscription', 'urbanplanning', 'revelation'] });
  applyAction(s, { type: 'government', player: 0, government: 'classicalrepublic' });
  // Classical Republic has economic and wildcard slots only: Revelation keeps a wildcard slot, one
  // military card takes the other, and the second military card is unslotted.
  assert.deepEqual(p.policies, ['urbanplanning', null, 'revelation', 'discipline']);
});

// ---------- effects ----------

test('policy and government effects change yields, production and costs', () => {
  const s = world();
  const p = s.players[0];
  const center = index(s.map, 6, 5);
  const city = foundCity(s, 0, center, []);
  learn(s, 'politicalphilosophy', 'recordedhistory', 'earlyempire', 'craftsmanship', 'miltradition', 'mercenaries');
  const prod = cityYields(s, city).prod;
  const tileCost = buyTileCost(s, city);
  const warriorRate = productionRate(s, city, { kind: 'unit', key: 'warrior' });

  applyAction(s, { type: 'government', player: 0, government: 'autocracy' });
  applyAction(s, { type: 'policies', player: 0, policies: ['agoge', 'professionalarmy', 'urbanplanning', 'landsurveyors'] });
  const after = cityYields(s, city);
  assert.ok(after.prod >= prod + 2, 'Urban Planning and Autocracy each add production in the capital');
  assert.equal(buyTileCost(s, city), Math.round(tileCost * 0.7));
  assert.ok(productionRate(s, city, { kind: 'unit', key: 'warrior' }) > warriorRate * 1.4);
  assert.ok(productionRate(s, city, { kind: 'unit', key: 'horseman' }) < productionRate(s, city, { kind: 'unit', key: 'warrior' }) * 1.01);
  assert.equal(upgradeCost('warrior', 'swordsman', effects(s, 0).upgradeDiscount), (60 - 20) * 2 / 2);
  assert.ok(score(s, 0) > 0);
});

test('Natural Philosophy doubles Campus adjacency; Conscription cuts upkeep; Colonial Offices speeds growth', () => {
  const s = world();
  const p = s.players[0];
  const center = index(s.map, 6, 5);
  const city = foundCity(s, 0, center, []);
  const spot = neighbors(s.map, center)[0];
  for (const n of neighbors(s.map, spot).filter((n) => n !== center).slice(0, 2)) s.map.tiles[n].t = 'mountain';
  s.map.tiles[spot].district = 'campus';
  city.districts.push(spot);
  const before = tileYield(s, spot).science;
  for (let k = 0; k < 4; k++) spawnUnit(s, 0, 'warrior', index(s.map, 1 + k, 1));
  const upkeep = unitUpkeep(s, 0);
  learn(s, 'recordedhistory', 'stateworkforce', 'exploration');
  applyAction(s, { type: 'government', player: 0, government: 'merchantrepublic' });
  applyAction(s, { type: 'policies', player: 0, policies: ['conscription', 'naturalphilosophy', 'colonialoffices', null, null, null] });
  assert.equal(tileYield(s, spot).science, 1 + (before - 1) * 2);
  assert.equal(unitUpkeep(s, 0), upkeep - 1);
  assert.ok(cityGrowthThreshold(s, city) < growthThreshold(city.pop));
});

test('the Theater Square and its first buildings come from civics', () => {
  const s = world();
  const city = foundCity(s, 0, index(s.map, 6, 5), []);
  s.players[0].techs.push('mining', 'masonry', 'animal', 'horseback', 'construction');
  assert.match(buildReason(s, city, { kind: 'district', key: 'theater' }), /Drama and Poetry/);
  learn(s, 'drama');
  assert.equal(buildReason(s, city, { kind: 'district', key: 'theater' }), null);
});
