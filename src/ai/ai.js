// AI rivals. Each turn the AI decides on war and peace, picks research, fills city build queues
// and moves every unit. It only ever changes the game through applyAction, so it plays by the same
// rules as the human, and it only reacts to what it can see.

import { UNITS, isMilitary } from '../data/units.js';
import { TECHS, TECH_KEYS } from '../data/techs.js';
import { DIFFICULTY, RULES } from '../data/rules.js';
import { improvementValid } from '../data/terrain.js';
import { applyAction } from '../core/actions.js';
import { citiesOf, unitsOf, atWar, haveMet, cityAt, hasTech, militaryAt } from '../core/query.js';
import { distance, neighbors, within } from '../core/hex.js';
import { findPath, canEnter, passable } from '../core/pathfind.js';
import { foundReason, buildOptions, bestDistrictTile, workableTiles, buyCost } from '../core/city.js';
import { attackInfo, inRange, lineOfSight, cityStrikeInfo } from '../core/combat.js';
import { militaryPower, aiWantsPeace } from '../core/diplomacy.js';
import { canResearchNow, allResearched } from '../core/research.js';
import { startScore } from '../core/mapgen.js';
import { visibleTiles } from '../core/vision.js';
import { playerYields } from '../core/yields.js';

const RESEARCH_WEIGHTS = {
  builder: { pottery: 9, writing: 9, animal: 6, mining: 6, currency: 8, masonry: 4, archery: 5, bronze: 5, philosophy: 8, horseback: 3, mathematics: 4, construction: 4 },
  conqueror: { archery: 9, mining: 8, bronze: 9, animal: 6, horseback: 8, masonry: 6, pottery: 5, writing: 5, mathematics: 7, construction: 5, currency: 4, philosophy: 3 },
};

export function runAI(state, pid, events) {
  const p = state.players[pid];
  if (!p.alive || p.human) return;
  const ctx = {
    state,
    pid,
    p,
    diff: DIFFICULTY[state.difficulty],
    get visible() {
      return visibleTiles(state, pid);
    },
    sites: null,
    act(action) {
      const r = applyAction(state, { ...action, player: pid });
      if (r.ok) events.push(...r.events);
      return r.ok;
    },
  };
  diplomacy(ctx);
  if (state.phase === 'ended') return;
  chooseResearch(ctx);
  manageCities(ctx);
  cityStrikes(ctx);
  moveUnits(ctx);
  cityStrikes(ctx);
  spendGold(ctx);
}

// Walled cities shoot at the most damaged enemy in range, preferring kills.
function cityStrikes(ctx) {
  const { state, pid } = ctx;
  for (const c of citiesOf(state, pid)) {
    if (!c.buildings.includes('walls') || c.struck) continue;
    let best = -1;
    let bestScore = -Infinity;
    for (const t of within(state.map, c.tile, RULES.cityStrikeRange)) {
      if (!ctx.visible[t]) continue;
      const info = cityStrikeInfo(state, c, t);
      if (!info || !info.war) continue;
      const s = avg(info.toTarget) - info.unit.hp + (avg(info.toTarget) >= info.unit.hp ? 100 : 0);
      if (s > bestScore) {
        bestScore = s;
        best = t;
      }
    }
    if (best >= 0) ctx.act({ type: 'cityStrike', city: c.id, target: best });
  }
}

// ---------- helpers ----------

const enemiesOf = (ctx) => ctx.state.players.filter((o) => o.alive && atWar(ctx.state, ctx.pid, o.id));
const atWarAny = (ctx) => enemiesOf(ctx).length > 0;
const militaryUnits = (ctx) => unitsOf(ctx.state, ctx.pid).filter((u) => isMilitary(u.type) && u.type !== 'scout');

function cityDistance(state, a, b) {
  let best = Infinity;
  const theirs = citiesOf(state, b);
  for (const c of citiesOf(state, a)) for (const d of theirs) best = Math.min(best, distance(state.map, c.tile, d.tile));
  return best;
}

// Enemy military units the AI can currently see within `radius` of `tile`.
function threatsNear(ctx, tile, radius) {
  const { state } = ctx;
  let n = 0;
  for (const t of within(state.map, tile, radius)) {
    if (!ctx.visible[t]) continue;
    const m = militaryAt(state, t);
    if (m && atWar(state, ctx.pid, m.owner)) n++;
  }
  return n;
}

function avg(range) {
  return (range[0] + range[1]) / 2;
}

// ---------- diplomacy ----------

function diplomacy(ctx) {
  const { state, pid, p, diff } = ctx;
  const enemies = enemiesOf(ctx);
  for (const o of enemies) {
    if (!aiWantsPeace(state, pid, o.id)) continue;
    if (o.human) {
      if ((p.ai.lastOffer ?? -99) + 6 <= state.turn) {
        ctx.act({ type: 'proposePeace', target: o.id });
        p.ai.lastOffer = state.turn;
      }
    } else if (aiWantsPeace(state, o.id, pid)) {
      ctx.act({ type: 'proposePeace', target: o.id });
    }
  }
  if (enemiesOf(ctx).length || state.turn < diff.warTurn) return;
  if (militaryUnits(ctx).length < 3) return;
  const myPower = militaryPower(state, pid);
  const needed = (p.personality === 'conqueror' ? 1.35 : 1.9) / diff.aggression;
  if (p.personality !== 'conqueror' && state.turn < 40) return;
  let best = null;
  let bestRatio = 0;
  for (const o of state.players) {
    if (!o.alive || o.id === pid || !haveMet(state, pid, o.id)) continue;
    if (state.turn - (p.peaceSince?.[o.id] ?? -99) < 12) continue;
    if (cityDistance(state, pid, o.id) > 14) continue;
    const ratio = myPower / Math.max(1, militaryPower(state, o.id));
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = o;
    }
  }
  if (best && bestRatio >= needed) {
    ctx.act({ type: 'declareWar', target: best.id });
    p.ai.targetCity = null;
  }
}

// ---------- research ----------

function chooseResearch(ctx) {
  const { p } = ctx;
  if (p.research) return;
  if (allResearched(p)) {
    ctx.act({ type: 'research', tech: 'future' });
    return;
  }
  const w = RESEARCH_WEIGHTS[p.personality || 'builder'];
  let best = null;
  let bestScore = -Infinity;
  for (const k of TECH_KEYS) {
    if (!canResearchNow(p, k)) continue;
    const s = w[k] - TECHS[k].tier * 1.5;
    if (s > bestScore) {
      bestScore = s;
      best = k;
    }
  }
  if (best) ctx.act({ type: 'research', tech: best });
}

// ---------- cities ----------

function settleSites(ctx) {
  if (ctx.sites) return ctx.sites;
  const { state, pid, p } = ctx;
  const map = state.map;
  const sites = [];
  for (let i = 0; i < map.tiles.length; i++) {
    const t = map.tiles[i];
    if (!p.explored[i] || !passable(t)) continue;
    if (t.owner >= 0 && t.owner !== pid) continue;
    if (foundReason(state, pid, i)) continue;
    const { score, goodFood } = startScore(map, i);
    if (goodFood < 3) continue;
    let s = score + (t.hills ? 2 : 0);
    if (neighbors(map, i).some((n) => map.tiles[n].t === 'coast')) s += 1.5;
    if (within(map, i, 2).some((n) => map.tiles[n].owner >= 0 && map.tiles[n].owner !== pid)) s -= 6;
    sites.push({ i, score: s });
  }
  ctx.sites = sites;
  return sites;
}

function bestMilitary(ctx, opts) {
  const units = opts.filter((o) => o.kind === 'unit' && isMilitary(o.key) && o.key !== 'scout');
  if (!units.length) return null;
  const army = militaryUnits(ctx);
  const ranged = army.filter((u) => UNITS[u.type].cls === 'ranged').length;
  const wantRanged = ranged < (army.length - ranged) / 2;
  const pool = units.filter((o) => (UNITS[o.key].cls === 'ranged') === wantRanged);
  const list = pool.length ? pool : units;
  list.sort((a, b) => Math.max(UNITS[b.key].strength, UNITS[b.key].ranged || 0) - Math.max(UNITS[a.key].strength, UNITS[a.key].ranged || 0));
  const hasCatapult = army.some((u) => u.type === 'catapult');
  if (wantRanged && atWarAny(ctx) && !hasCatapult && list.some((o) => o.key === 'catapult')) {
    return { kind: 'unit', key: 'catapult' };
  }
  return { kind: 'unit', key: list[0].key };
}

function improvementFor(state, pid, i) {
  const t = state.map.tiles[i];
  if (t.owner !== pid || t.district || t.imp || cityAt(state, i)) return null;
  if (hasTech(state, pid, 'mining') && improvementValid(t, 'mine')) return 'mine';
  if (improvementValid(t, 'farm')) return 'farm';
  return null;
}

function chooseProduction(ctx, city, counts) {
  const { state, pid, p } = ctx;
  const opts = buildOptions(state, city).filter((o) => !o.reason);
  const has = (kind, key) => opts.some((o) => o.kind === kind && o.key === key);
  const war = atWarAny(ctx);
  const threatened = threatsNear(ctx, city.tile, 4) > 0;
  const garrisoned = !!militaryAt(state, city.tile);
  const nCities = counts.cities;
  const wantMilitary = Math.max(2, Math.round(nCities * (p.personality === 'conqueror' ? 2 : 1.3))) + (war ? nCities + 1 : 0);
  const broke = counts.goldNet < 0 && p.gold < 25;

  if ((threatened && !garrisoned) || counts.military < 2) return bestMilitary(ctx, opts);
  if (threatened && counts.military < wantMilitary + 2) return bestMilitary(ctx, opts);
  if (!war && city.pop >= 2 && counts.settlers + nCities < counts.targetCities && has('unit', 'settler') && settleSites(ctx).length) {
    return { kind: 'unit', key: 'settler' };
  }
  if (!city.buildings.includes('monument') && has('building', 'monument') && nCities <= 3) return { kind: 'building', key: 'monument' };
  if (counts.builders < Math.ceil(nCities / 2) && has('unit', 'builder') && workableTiles(state, city).some((i) => improvementFor(state, pid, i))) {
    return { kind: 'unit', key: 'builder' };
  }
  if (!broke && counts.military < wantMilitary) return bestMilitary(ctx, opts);
  const districtOrder = p.personality === 'conqueror' ? ['encampment', 'campus', 'commercial'] : ['campus', 'commercial', 'encampment'];
  if (broke && has('district', 'commercial')) districtOrder.unshift('commercial');
  for (const key of districtOrder) {
    if (!has('district', key)) continue;
    const tile = bestDistrictTile(state, city, key);
    if (tile >= 0) return { kind: 'district', key, tile };
  }
  const buildingOrder = broke ? ['market', 'monument', 'library', 'granary', 'barracks'] : ['library', 'market', 'monument', 'granary', 'barracks'];
  if (war || threatened) buildingOrder.unshift('walls');
  for (const key of buildingOrder) if (has('building', key)) return { kind: 'building', key };
  if (has('building', 'walls') && nCities > 1) return { kind: 'building', key: 'walls' };
  if (!broke) return bestMilitary(ctx, opts);
  return has('unit', 'builder') ? { kind: 'unit', key: 'builder' } : null;
}

function manageCities(ctx) {
  const { state, pid, p } = ctx;
  const cities = citiesOf(state, pid);
  const units = unitsOf(state, pid);
  const queued = (key) => cities.reduce((n, c) => n + c.queue.filter((q) => q.key === key).length, 0);
  const yields = playerYields(state, pid);
  const counts = {
    cities: cities.length,
    military: militaryUnits(ctx).length + cities.reduce((n, c) => n + c.queue.filter((q) => q.kind === 'unit' && isMilitary(q.key) && q.key !== 'scout').length, 0),
    settlers: units.filter((u) => u.type === 'settler').length + queued('settler'),
    builders: units.filter((u) => u.type === 'builder').length + queued('builder'),
    targetCities: (p.personality === 'conqueror' ? 4 : 6) + (state.size === 'medium' ? 1 : 0),
    goldNet: yields.goldNet,
  };
  for (const c of cities) {
    if (c.queue.length) continue;
    const item = chooseProduction(ctx, c, counts);
    if (!item) continue;
    if (ctx.act({ type: 'setProduction', city: c.id, item })) {
      if (item.kind === 'unit') {
        if (isMilitary(item.key)) counts.military++;
        if (item.key === 'settler') counts.settlers++;
        if (item.key === 'builder') counts.builders++;
      }
    }
  }
}

function spendGold(ctx) {
  const { state, pid, p } = ctx;
  for (const c of citiesOf(state, pid)) {
    const item = c.queue[0];
    if (!item) continue;
    const cost = buyCost(c, item);
    const urgent = item.kind === 'unit' && isMilitary(item.key) && threatsNear(ctx, c.tile, 4) > 0;
    if ((urgent && p.gold >= cost) || p.gold >= cost + 150) ctx.act({ type: 'buy', city: c.id });
  }
}

// ---------- units ----------

function moveUnits(ctx) {
  const { state, pid } = ctx;
  const order = { settler: 0, builder: 1 };
  const units = unitsOf(state, pid).sort((a, b) => (order[a.type] ?? 2) - (order[b.type] ?? 2));
  assignGarrisons(ctx);
  ctx.target = pickWarTarget(ctx);
  for (const u of units) {
    if (!state.units[u.id] || u.moves <= 0 || state.phase === 'ended') continue;
    if (u.type === 'settler') settlerTurn(ctx, u);
    else if (u.type === 'builder') builderTurn(ctx, u);
    else if (u.type === 'scout') scoutTurn(ctx, u);
    else militaryTurn(ctx, u);
  }
}

function settlerTurn(ctx, u) {
  const { state, pid } = ctx;
  const cities = citiesOf(state, pid);
  if (!cities.length && !foundReason(state, pid, u.tile)) {
    ctx.act({ type: 'found', unit: u.id });
    return;
  }
  const others = unitsOf(state, pid).filter((o) => o.type === 'settler' && o.id !== u.id && o.aiTarget != null).map((o) => o.aiTarget);
  const clash = (t) => others.some((r) => distance(state.map, r, t) < RULES.cityMinDistance);
  let target = u.aiTarget;
  if (target != null && (foundReason(state, pid, target) || clash(target))) target = null;
  if (target == null) {
    let bestScore = -Infinity;
    const homeless = !cities.length;
    for (const s of settleSites(ctx)) {
      if (clash(s.i)) continue;
      const d = distance(state.map, u.tile, s.i);
      if (d > 12 && !homeless) continue;
      const home = homeless ? 0 : Math.min(...cities.map((c) => distance(state.map, c.tile, s.i)));
      if (home > 8) continue;
      const danger = threatsNear(ctx, s.i, 3);
      const v = s.score - d * 1.2 - Math.max(0, home - 5) * 1.5 - danger * 6;
      if (v > bestScore) {
        bestScore = v;
        target = s.i;
      }
    }
    u.aiTarget = target ?? null;
  }
  if (target == null) {
    if (!foundReason(state, pid, u.tile)) ctx.act({ type: 'found', unit: u.id });
    return;
  }
  if (u.tile !== target && !ctx.act({ type: 'move', unit: u.id, to: target })) {
    u.aiTarget = null;
    return;
  }
  if (state.units[u.id] && u.tile === target && u.moves > 0) {
    if (ctx.act({ type: 'found', unit: u.id })) ctx.sites = null;
  }
}

function builderTurn(ctx, u) {
  const { state, pid } = ctx;
  const here = improvementFor(state, pid, u.tile);
  if (here) {
    ctx.act({ type: 'improve', unit: u.id, kind: here });
    return;
  }
  let best = -1;
  let bestScore = -Infinity;
  const taken = new Set(unitsOf(state, pid).filter((o) => o.type === 'builder' && o.id !== u.id).map((o) => o.aiTarget));
  for (const c of citiesOf(state, pid)) {
    for (const i of workableTiles(state, c)) {
      if (taken.has(i) || !improvementFor(state, pid, i)) continue;
      if (threatsNear(ctx, i, 2)) continue;
      const s = (c.worked.includes(i) ? 4 : 1) - distance(state.map, u.tile, i) * 0.5;
      if (s > bestScore) {
        bestScore = s;
        best = i;
      }
    }
  }
  if (best < 0) {
    ctx.act({ type: 'sleep', unit: u.id });
    return;
  }
  u.aiTarget = best;
  ctx.act({ type: 'move', unit: u.id, to: best });
  if (state.units[u.id] && u.tile === best && u.moves > 0) ctx.act({ type: 'improve', unit: u.id, kind: improvementFor(state, pid, best) });
}

function scoutTurn(ctx, u) {
  const { state, pid, p } = ctx;
  const map = state.map;
  const seen = new Map([[u.tile, 0]]);
  const queue = [u.tile];
  let best = -1;
  let bestScore = -Infinity;
  while (queue.length) {
    const i = queue.shift();
    const d = seen.get(i);
    if (d > 14) continue;
    for (const n of neighbors(map, i)) {
      if (seen.has(n) || !canEnter(state, u, n, false)) continue;
      seen.set(n, d + 1);
      queue.push(n);
      if (!canEnter(state, u, n, true)) continue;
      let unknown = 0;
      for (const k of within(map, n, 2)) if (!p.explored[k]) unknown++;
      if (!unknown) continue;
      const s = unknown * 2 - (d + 1) - threatsNear(ctx, n, 2) * 10;
      if (s > bestScore) {
        bestScore = s;
        best = n;
      }
    }
  }
  if (best < 0) {
    militaryTurn(ctx, u);
    return;
  }
  ctx.act({ type: 'move', unit: u.id, to: best });
}

function assignGarrisons(ctx) {
  const { state } = ctx;
  const army = militaryUnits(ctx);
  const taken = new Set();
  ctx.garrison = new Map();
  const cities = citiesOf(state, ctx.pid).sort((a, b) => threatsNear(ctx, b.tile, 5) - threatsNear(ctx, a.tile, 5));
  for (const c of cities) {
    const wanted = threatsNear(ctx, c.tile, 5) > 0 ? 2 : 1;
    const byDistance = army.filter((u) => !taken.has(u.id)).sort((a, b) => distance(state.map, a.tile, c.tile) - distance(state.map, b.tile, c.tile));
    for (const u of byDistance.slice(0, wanted)) {
      if (distance(state.map, u.tile, c.tile) > 8) continue;
      taken.add(u.id);
      ctx.garrison.set(u.id, c);
    }
  }
}

function pickWarTarget(ctx) {
  const { state, pid, p } = ctx;
  const enemies = enemiesOf(ctx);
  if (!enemies.length) return null;
  const current = state.cities[p.ai.targetCity];
  if (current && atWar(state, pid, current.owner) && p.explored[current.tile]) return current;
  const mine = citiesOf(state, pid);
  if (!mine.length) return null;
  let best = null;
  let bestScore = Infinity;
  for (const e of enemies) {
    for (const c of citiesOf(state, e.id)) {
      if (!p.explored[c.tile]) continue;
      const d = Math.min(...mine.map((m) => distance(state.map, m.tile, c.tile)));
      const s = d + c.hp / 40 + (c.buildings.includes('walls') ? 4 : 0) - (c.capital ? 1 : 0);
      if (s < bestScore) {
        bestScore = s;
        best = c;
      }
    }
  }
  p.ai.targetCity = best ? best.id : null;
  return best;
}

// Best attack this unit could make right now, with a value for comparing options.
function bestAttack(ctx, u) {
  const { state } = ctx;
  const def = UNITS[u.type];
  const ranged = def.cls === 'ranged';
  const reach = ranged ? def.range : Math.max(1, def.moves);
  let best = null;
  for (const t of within(state.map, u.tile, reach)) {
    if (!ctx.visible[t] || t === u.tile) continue;
    const info = attackInfo(state, u, t);
    if (!info || !info.war) continue;
    if (ranged && !inRange(state, u, t)) continue;
    if (!ranged && distance(state.map, u.tile, t) > 1 && !findPath(state, u, t, { attack: true, maxCost: u.moves + 1 })) continue;
    let value;
    if (info.kind === 'capture') value = 40;
    else {
      const dealt = avg(info.toTarget);
      const taken = avg(info.toSelf);
      if (!ranged && taken >= u.hp - 5 && dealt < info.targetHp) continue;
      const kills = dealt >= info.targetHp;
      if (info.kind === 'city') {
        if (!ranged && !kills && taken > u.hp * 0.45) continue;
        value = dealt + (kills && info.captures ? 200 : 0);
      } else {
        if (!ranged && !kills && dealt < taken * 0.9) continue;
        value = dealt - taken + (kills ? 60 : 0);
      }
    }
    if (!best || value > best.value) best = { target: t, value };
  }
  return best;
}

function moveToward(ctx, u, goal, stopShort = 0) {
  const { state } = ctx;
  if (distance(state.map, u.tile, goal) <= stopShort) return false;
  const path = findPath(state, u, goal, { attack: !!cityAt(state, goal) || !!militaryAt(state, goal) });
  if (!path) return false;
  let dest = path[Math.max(0, path.length - 1 - stopShort)];
  if (dest === goal && (cityAt(state, goal) || militaryAt(state, goal))) dest = path[path.length - 2] ?? -1;
  if (dest == null || dest < 0 || dest === u.tile) return false;
  return ctx.act({ type: 'move', unit: u.id, to: dest });
}

function nearestOwnCity(ctx, u) {
  let best = null;
  let bestD = Infinity;
  for (const c of citiesOf(ctx.state, ctx.pid)) {
    const d = distance(ctx.state.map, u.tile, c.tile);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

function militaryTurn(ctx, u) {
  const { state, pid } = ctx;
  const def = UNITS[u.type];
  const attack = bestAttack(ctx, u);
  if (attack && (attack.value > 5 || u.hp > 60)) {
    ctx.act({ type: 'attack', unit: u.id, target: attack.target });
    return;
  }
  const home = nearestOwnCity(ctx, u);
  if (u.hp < 45) {
    if (home && u.tile !== home.tile && state.map.tiles[u.tile].owner !== pid) moveToward(ctx, u, home.tile);
    else ctx.act({ type: 'fortify', unit: u.id });
    return;
  }
  const garrison = ctx.garrison.get(u.id);
  if (garrison) {
    if (u.tile === garrison.tile || distance(state.map, u.tile, garrison.tile) <= 1) ctx.act({ type: 'fortify', unit: u.id });
    else if (!ctx.act({ type: 'move', unit: u.id, to: garrison.tile })) moveToward(ctx, u, garrison.tile, 1);
    return;
  }
  const target = ctx.target;
  if (target && state.cities[target.id]) {
    const army = militaryUnits(ctx).filter((a) => !ctx.garrison.has(a.id));
    const near = army.filter((a) => distance(state.map, a.tile, target.tile) <= 4).length;
    const need = Math.max(2, Math.round(3 / ctx.diff.aggression));
    const d = distance(state.map, u.tile, target.tile);
    if (near >= need || d > 4) {
      const stop = def.cls === 'ranged' ? def.range : 1;
      if (d > stop) {
        moveToward(ctx, u, target.tile, stop);
        const after = bestAttack(ctx, u);
        if (state.units[u.id] && u.moves > 0 && after) ctx.act({ type: 'attack', unit: u.id, target: after.target });
      } else ctx.act({ type: 'fortify', unit: u.id });
    } else ctx.act({ type: 'fortify', unit: u.id });
    return;
  }
  if (home && distance(state.map, u.tile, home.tile) > 2) moveToward(ctx, u, home.tile, 2);
  else ctx.act({ type: 'fortify', unit: u.id });
}

export const _test = { chooseProduction, bestAttack, lineOfSight };
