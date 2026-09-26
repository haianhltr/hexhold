// The single entry point for changing the game: applyAction(state, action).
// The human player (through the UI) and the AI both use it, so rules are enforced in one place.
// A rejected action leaves the state untouched and explains why.

import { UNITS } from '../data/units.js';
import { IMPROVEMENTS, improvementValid } from '../data/terrain.js';
import { TECHS } from '../data/techs.js';
import { RULES } from '../data/rules.js';
import { distance, within } from './hex.js';
import { touch, removeUnit, owningCity, hasTech, atWar, haveMet, cityAt } from './query.js';
import { findPath } from './pathfind.js';
import { followPath } from './movement.js';
import { attackInfo, inRange, resolveAttack, cityStrikeInfo, cityCanStrike, resolveCityStrike } from './combat.js';
import {
  foundReason, foundCity, assignWorkers, buildReason, sameItem, completeItem, buyCost,
  borderCandidates, buyTileCost, claimTile, workableTiles, bestDistrictTile, cityHasStrike,
  upgradeTarget, upgradeCost,
} from './city.js';
import { validDistrictTiles } from './placement.js';
import { setResearch, techName } from './research.js';
import { declareWar, makePeace, aiWantsPeace } from './diplomacy.js';
import { refreshVision } from './vision.js';
import { checkVictory, checkElimination } from './victory.js';

const civName = (state, pid) => state.players[pid].name;

function ownUnit(state, a) {
  const u = state.units[a.unit];
  return u && u.owner === a.player ? u : null;
}

function ownCity(state, a) {
  const c = state.cities[a.city];
  return c && c.owner === a.player ? c : null;
}

function cleanItem(item) {
  if (!item || !['unit', 'building', 'district'].includes(item.kind)) return null;
  const out = { kind: item.kind, key: item.key };
  if (item.kind === 'district' && Number.isInteger(item.tile)) out.tile = item.tile;
  return out;
}

function prepareItem(state, city, raw) {
  const item = cleanItem(raw);
  if (!item) return { reason: 'Unknown item' };
  const why = buildReason(state, city, item);
  if (why) return { reason: why };
  if (item.kind === 'district') {
    if (item.tile == null) item.tile = bestDistrictTile(state, city, item.key);
    else if (!validDistrictTiles(state, city, item.key).includes(item.tile)) return { reason: "That tile can't hold this district" };
  }
  return { item };
}

const HANDLERS = {
  move(state, a, ev) {
    const u = ownUnit(state, a);
    if (!u) return 'That unit is not yours';
    if (a.to === u.tile) {
      u.path = null;
      return null;
    }
    if (attackInfo(state, u, a.to)) return HANDLERS.attack(state, { ...a, target: a.to }, ev);
    const path = findPath(state, u, a.to);
    if (!path) return "That tile can't be reached";
    u.path = path;
    u.fortified = false;
    u.sleeping = false;
    followPath(state, u, ev);
    return null;
  },

  attack(state, a, ev) {
    const u = ownUnit(state, a);
    if (!u) return 'That unit is not yours';
    const info = attackInfo(state, u, a.target);
    if (!info) return 'There is nothing to attack there';
    if (!info.war) return `You are at peace with ${civName(state, info.owner)}. Declare war first.`;
    if (u.moves <= 0) return 'This unit has no moves left this turn';
    if (UNITS[u.type].cls === 'ranged') {
      if (distance(state.map, u.tile, a.target) > UNITS[u.type].range) return 'Out of range';
      if (!inRange(state, u, a.target)) return 'A mountain blocks the shot';
      resolveAttack(state, u, a.target, ev);
      return null;
    }
    if (distance(state.map, u.tile, a.target) > 1) {
      const path = findPath(state, u, a.target, { attack: true });
      if (!path) return "The target can't be reached";
      u.path = path.slice(0, -1);
      u.fortified = false;
      u.sleeping = false;
      followPath(state, u, ev);
      if (!state.units[u.id] || u.moves <= 0 || distance(state.map, u.tile, a.target) > 1) return null;
    }
    if (!attackInfo(state, u, a.target)) return null;
    resolveAttack(state, u, a.target, ev);
    return null;
  },

  found(state, a, ev) {
    const u = ownUnit(state, a);
    if (!u || u.type !== 'settler') return 'Only settlers can found cities';
    if (u.moves <= 0) return 'This settler has no moves left this turn';
    const why = foundReason(state, u.owner, u.tile);
    if (why) return why;
    removeUnit(state, u);
    foundCity(state, u.owner, u.tile, ev);
    return null;
  },

  improve(state, a, ev) {
    const u = ownUnit(state, a);
    if (!u || u.type !== 'builder') return 'Only builders can build improvements';
    if (u.moves <= 0) return 'This builder has no moves left this turn';
    const tile = state.map.tiles[u.tile];
    const imp = IMPROVEMENTS[a.kind];
    if (!imp) return 'Unknown improvement';
    if (tile.owner !== u.owner) return 'Builders can only work inside your borders';
    if (tile.district || cityAt(state, u.tile)) return "Cities and districts can't be improved";
    if (!hasTech(state, u.owner, imp.tech)) return `Needs ${TECHS[imp.tech].name}`;
    if (!improvementValid(tile, a.kind)) return `${imp.name}: ${imp.hint}`;
    if (tile.imp === a.kind) return `There's already a ${imp.name} here`;
    tile.imp = a.kind;
    u.charges--;
    u.moves = 0;
    u.acted = true;
    if (u.charges <= 0) removeUnit(state, u);
    const city = owningCity(state, u.tile);
    if (city) assignWorkers(state, city);
    ev.push({ type: 'improved', tile: u.tile, kind: a.kind, owner: u.owner });
    return null;
  },

  fortify(state, a) {
    const u = ownUnit(state, a);
    if (!u || UNITS[u.type].cls === 'civilian') return 'Only military units can fortify';
    u.fortified = true;
    u.sleeping = false;
    u.path = null;
    return null;
  },

  sleep(state, a) {
    const u = ownUnit(state, a);
    if (!u) return 'That unit is not yours';
    u.sleeping = true;
    u.path = null;
    return null;
  },

  wake(state, a) {
    const u = ownUnit(state, a);
    if (!u) return 'That unit is not yours';
    u.sleeping = false;
    u.fortified = false;
    return null;
  },

  skip(state, a) {
    const u = ownUnit(state, a);
    if (!u) return 'That unit is not yours';
    u.skipped = state.turn;
    return null;
  },

  cancelOrders(state, a) {
    const u = ownUnit(state, a);
    if (!u) return 'That unit is not yours';
    u.path = null;
    return null;
  },

  disband(state, a, ev) {
    const u = ownUnit(state, a);
    if (!u) return 'That unit is not yours';
    removeUnit(state, u);
    ev.push({ type: 'disbanded', owner: u.owner, unitType: u.type, tile: u.tile, voluntary: true });
    checkElimination(state, u.owner, ev);
    return null;
  },

  upgrade(state, a, ev) {
    const u = ownUnit(state, a);
    if (!u) return 'That unit is not yours';
    const next = UNITS[u.type].upgradesTo;
    if (!next) return `${UNITS[u.type].name} has no upgrade`;
    const target = upgradeTarget(state, u);
    if (!target) return `Needs ${TECHS[UNITS[next].tech].name}`;
    if (state.map.tiles[u.tile].owner !== u.owner) return 'Units can only upgrade inside your borders';
    if (u.moves <= 0) return 'This unit has no moves left this turn';
    const cost = upgradeCost(u.type, target);
    const p = state.players[a.player];
    if (p.gold < cost) return `Needs ${cost} gold`;
    p.gold -= cost;
    const from = u.type;
    u.type = target;
    u.moves = 0;
    u.acted = true;
    u.fortified = false;
    ev.push({ type: 'upgraded', unit: u.id, owner: u.owner, from, to: target, tile: u.tile });
    return null;
  },

  setProduction(state, a) {
    const c = ownCity(state, a);
    if (!c) return 'That city is not yours';
    const raw = cleanItem(a.item);
    if (!raw) return 'Unknown item';
    const k = c.queue.findIndex((q) => sameItem(q, raw));
    if (k >= 0) {
      const [q] = c.queue.splice(k, 1);
      if (raw.tile != null) {
        if (!validDistrictTiles(state, c, raw.key, q).includes(raw.tile)) {
          c.queue.splice(k, 0, q);
          return "That tile can't hold this district";
        }
        q.tile = raw.tile;
      }
      c.queue.unshift(q);
      return null;
    }
    const { item, reason } = prepareItem(state, c, raw);
    if (reason) return reason;
    c.queue.unshift(item);
    if (c.queue.length > RULES.maxQueue) c.queue.length = RULES.maxQueue;
    return null;
  },

  enqueue(state, a) {
    const c = ownCity(state, a);
    if (!c) return 'That city is not yours';
    if (c.queue.length >= RULES.maxQueue) return `The queue holds up to ${RULES.maxQueue} items`;
    const { item, reason } = prepareItem(state, c, a.item);
    if (reason) return reason;
    c.queue.push(item);
    return null;
  },

  dequeue(state, a) {
    const c = ownCity(state, a);
    if (!c) return 'That city is not yours';
    if (!(a.index >= 0 && a.index < c.queue.length)) return 'No such queue item';
    c.queue.splice(a.index, 1);
    return null;
  },

  buy(state, a, ev) {
    const c = ownCity(state, a);
    if (!c) return 'That city is not yours';
    const item = c.queue[0];
    if (!item) return 'Choose something to build first';
    const cost = buyCost(c, item);
    const p = state.players[a.player];
    if (p.gold < cost) return `Needs ${cost} gold`;
    if (!completeItem(state, c, item, ev)) {
      return item.key === 'settler' ? 'The city needs population 2 to train a settler' : 'There is no free tile to place it';
    }
    p.gold -= cost;
    c.queue.shift();
    c.prodStock = 0;
    return null;
  },

  buyTile(state, a, ev) {
    const c = ownCity(state, a);
    if (!c) return 'That city is not yours';
    if (!borderCandidates(state, c).includes(a.tile)) return 'Only unclaimed tiles next to this city can be bought';
    const cost = buyTileCost(state, c);
    const p = state.players[a.player];
    if (p.gold < cost) return `Needs ${cost} gold`;
    p.gold -= cost;
    claimTile(state, c, a.tile);
    assignWorkers(state, c);
    ev.push({ type: 'border', city: c.id, owner: c.owner, tile: a.tile, bought: true });
    return null;
  },

  lockTile(state, a) {
    const c = ownCity(state, a);
    if (!c) return 'That city is not yours';
    if (!workableTiles(state, c).includes(a.tile)) return "This city can't work that tile";
    if (c.locked.includes(a.tile)) c.locked = c.locked.filter((t) => t !== a.tile);
    else {
      c.locked.push(a.tile);
      if (c.locked.length > c.pop) c.locked.shift();
    }
    assignWorkers(state, c);
    return null;
  },

  research(state, a) {
    const p = state.players[a.player];
    if (a.tech !== 'future' && !TECHS[a.tech]) return 'Unknown tech';
    if (!setResearch(p, a.tech)) return a.tech === 'future' ? 'Research every other tech first' : `${techName(a.tech)} is already researched`;
    return null;
  },

  cityStrike(state, a, ev) {
    const c = ownCity(state, a);
    if (!c) return 'That city is not yours';
    if (!cityHasStrike(c)) return 'Only cities with walls can strike';
    if (!cityCanStrike(state, c)) return 'This city has already struck this turn';
    if (distance(state.map, c.tile, a.target) > RULES.cityStrikeRange) return 'Out of range';
    const info = cityStrikeInfo(state, c, a.target);
    if (!info) return 'There is no enemy unit there';
    if (!info.war) return `You are at peace with ${civName(state, info.unit.owner)}`;
    resolveCityStrike(state, c, a.target, ev);
    return null;
  },

  declareWar(state, a, ev) {
    const t = state.players[a.target];
    if (!t || !t.alive || a.target === a.player) return 'No such civilization';
    if (!haveMet(state, a.player, a.target)) return `You haven't met ${t.name} yet`;
    if (atWar(state, a.player, a.target)) return `You are already at war with ${t.name}`;
    declareWar(state, a.player, a.target, ev);
    return null;
  },

  proposePeace(state, a, ev) {
    const t = state.players[a.target];
    if (!t || !t.alive) return 'No such civilization';
    if (!atWar(state, a.player, a.target)) return `You aren't at war with ${t.name}`;
    if (t.human) {
      if (!state.offers.some((o) => o.from === a.player && o.to === a.target)) {
        state.offers.push({ from: a.player, to: a.target, turn: state.turn });
        ev.push({ type: 'peaceOffer', from: a.player, to: a.target });
      }
      return null;
    }
    if (!aiWantsPeace(state, a.target, a.player)) return `${t.name} refuses peace for now`;
    makePeace(state, a.player, a.target, ev);
    return null;
  },

  respondPeace(state, a, ev) {
    const offer = state.offers.find((o) => o.from === a.from && o.to === a.player);
    if (!offer) return 'That offer is no longer open';
    state.offers = state.offers.filter((o) => o !== offer);
    if (a.accept) makePeace(state, a.player, a.from, ev);
    else ev.push({ type: 'peaceDeclined', from: a.from, to: a.player });
    return null;
  },

  rename(state, a) {
    const c = ownCity(state, a);
    if (!c) return 'That city is not yours';
    const name = String(a.name || '').trim().slice(0, 24);
    if (!name) return 'City names need at least one character';
    c.name = name;
    return null;
  },

  keepPlaying(state) {
    if (state.phase !== 'ended' || state.victory === 'defeat') return 'The game is still running';
    state.phase = 'extended';
    return null;
  },
};

export function applyAction(state, action) {
  const handler = HANDLERS[action?.type];
  if (!handler) return { ok: false, reason: `Unknown action "${action?.type}"`, events: [] };
  const p = state.players[action.player];
  if (!p || !p.alive) return { ok: false, reason: 'That player is not in the game', events: [] };
  const events = [];
  const reason = handler(state, action, events);
  if (reason) return { ok: false, reason, events };
  touch(state);
  refreshVision(state, action.player, events);
  checkVictory(state, events);
  if (!state._log) state._log = [];
  state._log.push({ turn: state.turn, ...action });
  if (state._log.length > 200) state._log.shift();
  return { ok: true, events };
}

export const ACTION_TYPES = Object.keys(HANDLERS);
