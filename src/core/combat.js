// Combat. Damage = 30 × e^((attacker − defender) / 25) × random(0.8–1.2), on a 100 HP scale.

import { RULES } from '../data/rules.js';
import { UNITS } from '../data/units.js';
import { rand } from './rng.js';
import { distance, neighbors } from './hex.js';
import { cityAt, militaryAt, civilianAt, atWar, removeUnit, placeUnit } from './query.js';
import { cityMaxHp, transferCity } from './city.js';
import { canEnter } from './pathfind.js';
import { checkElimination } from './victory.js';

const total = (base, mods) => Math.max(1, base + mods.reduce((s, m) => s + m[1], 0));
const woundPenalty = (hp) => -Math.floor((100 - hp) / 10);

export function defenseOf(state, unit) {
  const tile = state.map.tiles[unit.tile];
  const base = UNITS[unit.type].strength;
  const mods = [];
  if (unit.bonus) mods.push(['Barracks training', unit.bonus]);
  if (tile.hills) mods.push(['Hills', RULES.hillsDefense]);
  if (tile.forest) mods.push(['Forest', RULES.forestDefense]);
  if (unit.fortified) mods.push(['Fortified', RULES.fortifyBonus]);
  const w = woundPenalty(unit.hp);
  if (w) mods.push(['Wounded', w]);
  return { base, mods, total: total(base, mods) };
}

export function attackOf(state, unit, ranged, vsCity) {
  const def = UNITS[unit.type];
  const base = ranged ? def.ranged : def.strength;
  const mods = [];
  if (unit.bonus && !ranged) mods.push(['Barracks training', unit.bonus]);
  if (vsCity && def.vsCity) mods.push(['Siege', def.vsCity]);
  const w = woundPenalty(unit.hp);
  if (w) mods.push(['Wounded', w]);
  return { base, mods, total: total(base, mods) };
}

export function cityDefense(state, city) {
  const base = RULES.cityStrengthBase;
  const mods = [['Population', RULES.cityStrengthPerPop * city.pop]];
  if (city.buildings.includes('walls')) mods.push(['Walls', RULES.wallsStrength]);
  const garrison = militaryAt(state, city.tile);
  if (garrison && garrison.owner === city.owner) mods.push(['Garrison', Math.round(UNITS[garrison.type].strength / 4)]);
  return { base, mods, total: total(base, mods) };
}

export function damageRange(a, d) {
  const base = RULES.damageBase * Math.exp((a - d) / RULES.strengthDivisor);
  return [Math.round(base * 0.8), Math.round(base * 1.2)];
}

function roll(state, a, d) {
  return Math.round(RULES.damageBase * Math.exp((a - d) / RULES.strengthDivisor) * (0.8 + 0.4 * rand(state)));
}

// A range-2 shot is blocked only when every tile between the two is a mountain.
export function lineOfSight(state, from, to) {
  const map = state.map;
  const d = distance(map, from, to);
  if (d <= 1) return true;
  const between = neighbors(map, from).filter((n) => distance(map, n, to) === d - 1);
  return between.some((n) => map.tiles[n].t !== 'mountain');
}

export function inRange(state, unit, target) {
  const def = UNITS[unit.type];
  const d = distance(state.map, unit.tile, target);
  if (def.cls === 'ranged') return d >= 1 && d <= def.range && lineOfSight(state, unit.tile, target);
  return d === 1;
}

// What attacking tile `target` with `unit` would involve, or null if there's nothing to attack.
// Doesn't check range, moves or war; callers do.
export function attackInfo(state, unit, target) {
  const def = UNITS[unit.type];
  if (def.cls === 'civilian' || target < 0) return null;
  const ranged = def.cls === 'ranged';
  const city = cityAt(state, target);
  if (city && city.owner !== unit.owner) {
    const att = attackOf(state, unit, ranged, true);
    const dfn = cityDefense(state, city);
    return {
      kind: 'city',
      ranged,
      owner: city.owner,
      war: atWar(state, unit.owner, city.owner),
      city,
      att,
      def: dfn,
      toTarget: damageRange(att.total, dfn.total),
      toSelf: ranged ? [0, 0] : damageRange(dfn.total, att.total),
      targetHp: city.hp,
      targetMaxHp: cityMaxHp(state, city),
      captures: !ranged && def.cls === 'melee',
    };
  }
  const mil = militaryAt(state, target);
  if (mil && mil.owner !== unit.owner) {
    const att = attackOf(state, unit, ranged, false);
    const dfn = defenseOf(state, mil);
    return {
      kind: 'unit',
      ranged,
      owner: mil.owner,
      war: atWar(state, unit.owner, mil.owner),
      unit: mil,
      att,
      def: dfn,
      toTarget: damageRange(att.total, dfn.total),
      toSelf: ranged ? [0, 0] : damageRange(dfn.total, att.total),
      targetHp: mil.hp,
      targetMaxHp: 100,
    };
  }
  const civ = civilianAt(state, target);
  if (civ && civ.owner !== unit.owner && !ranged) {
    return { kind: 'capture', ranged: false, owner: civ.owner, war: atWar(state, unit.owner, civ.owner), unit: civ };
  }
  return null;
}

// Carries out an attack that the caller has already validated.
export function resolveAttack(state, unit, target, events) {
  const info = attackInfo(state, unit, target);
  const ev = { type: 'combat', kind: info.kind, attacker: unit.id, attackerType: unit.type, attackerOwner: unit.owner, from: unit.tile, target, ranged: info.ranged, defenderOwner: info.owner, dmgToTarget: 0, dmgToSelf: 0 };
  events.push(ev);
  unit.moves = 0;
  unit.acted = true;
  unit.fortified = false;
  unit.sleeping = false;
  unit.path = null;
  const attacker = state.players[unit.owner];
  const defender = state.players[info.owner];

  if (info.kind === 'capture') {
    info.unit.owner = unit.owner;
    info.unit.path = null;
    info.unit.moves = 0;
    placeUnit(state, unit, target);
    ev.captured = true;
    return ev;
  }

  if (info.kind === 'unit') {
    const d = info.unit;
    const dmg = roll(state, info.att.total, info.def.total);
    const back = info.ranged ? 0 : roll(state, info.def.total, info.att.total);
    d.hp -= dmg;
    unit.hp -= back;
    ev.dmgToTarget = dmg;
    ev.dmgToSelf = back;
    ev.defender = d.id;
    ev.defenderType = d.type;
    if (d.hp <= 0) {
      ev.killed = true;
      removeUnit(state, d);
      attacker.stats.kills++;
      defender.stats.lost++;
      if (unit.hp <= 0) unit.hp = 1;
      if (!info.ranged) {
        const civ = civilianAt(state, target);
        if (civ && civ.owner !== unit.owner) {
          civ.owner = unit.owner;
          civ.path = null;
          ev.capturedCivilian = civ.id;
        }
        if (canEnter(state, unit, target, true)) placeUnit(state, unit, target);
      }
    } else if (unit.hp <= 0) {
      ev.attackerDied = true;
      removeUnit(state, unit);
      attacker.stats.lost++;
      defender.stats.kills++;
    }
    return ev;
  }

  const c = info.city;
  const dmg = roll(state, info.att.total, info.def.total);
  const back = info.ranged ? 0 : roll(state, info.def.total, info.att.total);
  c.hp = Math.max(0, c.hp - dmg);
  c.lastAttacked = state.turn;
  unit.hp -= back;
  ev.dmgToTarget = dmg;
  ev.dmgToSelf = back;
  ev.city = c.id;
  if (unit.hp <= 0) {
    ev.attackerDied = true;
    removeUnit(state, unit);
    attacker.stats.lost++;
  } else if (c.hp <= 0 && info.captures) {
    ev.captured = true;
    transferCity(state, c, unit.owner, events);
    placeUnit(state, unit, target);
    checkElimination(state, info.owner, events);
  }
  return ev;
}

// A walled city's ranged strike at an enemy unit.
export function cityStrikeInfo(state, city, target) {
  const u = militaryAt(state, target);
  if (!u || u.owner === city.owner) return null;
  const att = cityDefense(state, city);
  const dfn = defenseOf(state, u);
  return { unit: u, att, def: dfn, toTarget: damageRange(att.total, dfn.total), war: atWar(state, city.owner, u.owner) };
}

export function cityCanStrike(state, city) {
  return city.buildings.includes('walls') && !city.struck;
}

export function resolveCityStrike(state, city, target, events) {
  const info = cityStrikeInfo(state, city, target);
  const dmg = roll(state, info.att.total, info.def.total);
  info.unit.hp -= dmg;
  city.struck = true;
  const ev = { type: 'combat', kind: 'strike', city: city.id, attackerOwner: city.owner, from: city.tile, target, ranged: true, defenderOwner: info.unit.owner, defender: info.unit.id, defenderType: info.unit.type, dmgToTarget: dmg, dmgToSelf: 0 };
  events.push(ev);
  if (info.unit.hp <= 0) {
    ev.killed = true;
    removeUnit(state, info.unit);
    state.players[city.owner].stats.kills++;
    state.players[ev.defenderOwner].stats.lost++;
  }
  return ev;
}
