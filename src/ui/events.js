// Turns game events into notifications and sound cues for the human player.

import { UNITS } from '../data/units.js';
import { BUILDINGS } from '../data/buildings.js';
import { DISTRICTS } from '../data/districts.js';
import { IMPROVEMENTS } from '../data/terrain.js';
import { TECHS, TECH_KEYS } from '../data/techs.js';
import { itemName } from '../core/city.js';
import { techName, canResearchNow } from '../core/research.js';
import { haveMet } from '../core/query.js';

export function unlocksOf(tech) {
  const out = [];
  for (const [k, d] of Object.entries(DISTRICTS)) if (d.tech === tech) out.push({ kind: 'district', key: k, name: d.name });
  for (const [k, d] of Object.entries(BUILDINGS)) if (d.tech === tech) out.push({ kind: 'building', key: k, name: d.name });
  for (const [k, d] of Object.entries(UNITS)) if (d.tech === tech) out.push({ kind: 'unit', key: k, name: d.name });
  for (const [k, d] of Object.entries(IMPROVEMENTS)) if (d.tech === tech) out.push({ kind: 'improvement', key: k, name: d.name });
  if (TECHS[tech]?.effectText) out.push({ kind: 'effect', name: TECHS[tech].effectText });
  return out;
}

export function describeEvent(s, e, hid) {
  const P = (id) => s.players[id]?.name ?? 'Someone';
  const cityName = (id) => s.cities[id]?.name ?? 'a city';
  const cityTile = (id) => s.cities[id]?.tile;
  switch (e.type) {
    case 'tech': {
      if (e.player !== hid) {
        // Warn when a rival is one tech away from a science victory.
        const goal = TECH_KEYS.find((k) => TECHS[k].effect?.victory);
        if (goal && TECHS[goal].req.includes(e.tech) && canResearchNow(s.players[e.player], goal)) {
          return { kind: 'bad', icon: 'science', text: `${haveMet(s, hid, e.player) ? P(e.player) : 'A rival'} can now research ${TECHS[goal].name}. If they finish it, they win.`, open: 'tech' };
        }
        return null;
      }
      const unlocked = unlocksOf(e.tech).map((u) => u.name);
      return { kind: 'good', icon: 'science', text: `Researched ${techName(e.tech)}.${unlocked.length ? ` Unlocks ${unlocked.join(', ')}.` : ''}`, open: 'tech' };
    }
    case 'built':
      if (e.owner !== hid) return null;
      return { kind: 'info', icon: 'prod', text: `${cityName(e.city)} finished ${itemName(e.item)}.`, tile: e.unit && s.units[e.unit] ? s.units[e.unit].tile : cityTile(e.city), city: e.city };
    case 'queueEmpty':
      if (e.owner !== hid) return null;
      return { kind: 'warn', icon: 'prod', text: `${cityName(e.city)} needs something to build.`, city: e.city, tile: cityTile(e.city) };
    case 'combat': {
      if (e.defenderOwner !== hid || e.attackerOwner === hid) return null;
      const who = e.kind === 'strike' ? `${P(e.attackerOwner)}'s ${cityName(e.city)}` : `${P(e.attackerOwner)}'s ${UNITS[e.attackerType]?.name || 'unit'}`;
      if (e.kind === 'city') return { kind: 'bad', icon: 'strength', text: `${who} attacked ${cityName(e.city)} (−${e.dmgToTarget} HP).`, tile: e.target };
      if (e.kind === 'capture') return { kind: 'bad', icon: 'strength', text: `${who} captured one of your civilians.`, tile: e.target };
      const target = UNITS[e.defenderType]?.name || 'unit';
      return { kind: 'bad', icon: 'strength', text: e.killed ? `${who} destroyed your ${target}.` : `${who} attacked your ${target} (−${e.dmgToTarget} HP).`, tile: e.target };
    }
    case 'cityCaptured':
      if (e.to === hid) return { kind: 'good', icon: 'strength', text: `You captured ${cityName(e.city)}!`, tile: e.tile };
      if (e.from === hid) return { kind: 'bad', icon: 'strength', text: `${P(e.to)} captured ${cityName(e.city)}.`, tile: e.tile };
      if (haveMet(s, hid, e.to) && haveMet(s, hid, e.from)) return { kind: 'info', icon: 'strength', text: `${P(e.to)} captured ${cityName(e.city)} from ${P(e.from)}.`, tile: e.tile };
      return null;
    case 'war':
      if (e.b === hid) return { kind: 'bad', icon: 'strength', text: `${P(e.a)} declared war on you!`, open: 'diplomacy' };
      if (e.a === hid) return { kind: 'warn', icon: 'strength', text: `You declared war on ${P(e.b)}.`, open: 'diplomacy' };
      if (haveMet(s, hid, e.a) && haveMet(s, hid, e.b)) return { kind: 'info', icon: 'strength', text: `${P(e.a)} declared war on ${P(e.b)}.`, open: 'diplomacy' };
      return null;
    case 'peace':
      if (e.a === hid || e.b === hid) return { kind: 'good', icon: 'handshake', text: `Peace with ${P(e.a === hid ? e.b : e.a)}.`, open: 'diplomacy' };
      if (haveMet(s, hid, e.a) && haveMet(s, hid, e.b)) return { kind: 'info', icon: 'handshake', text: `${P(e.a)} and ${P(e.b)} made peace.` };
      return null;
    case 'met':
      if (e.a !== hid && e.b !== hid) return null;
      return { kind: 'info', icon: 'handshake', text: `You met ${P(e.a === hid ? e.b : e.a)}.`, open: 'diplomacy' };
    case 'eliminated':
      if (e.player === hid) return { kind: 'bad', icon: 'strength', text: 'Your civilization has fallen.' };
      return { kind: 'info', icon: 'strength', text: `${P(e.player)} has been eliminated.` };
    case 'disbanded':
      if (e.owner !== hid || e.voluntary) return null;
      return { kind: 'bad', icon: 'gold', text: `Your treasury ran dry, so a ${UNITS[e.unitType]?.name || 'unit'} was disbanded.`, tile: e.tile };
    case 'starving':
      if (e.owner !== hid) return null;
      return { kind: 'bad', icon: 'food', text: `${cityName(e.city)} is starving and lost population.`, tile: cityTile(e.city), city: e.city };
    case 'grew':
      if (e.owner !== hid || e.pop < 4 || (e.pop - 1) % 3 !== 0) return null;
      return { kind: 'good', icon: 'pop', text: `${cityName(e.city)} grew to ${e.pop} and can hold another district.`, tile: cityTile(e.city), city: e.city };
    default:
      return null;
  }
}

export function eventSound(e, hid, rivalsTurn) {
  switch (e.type) {
    case 'tech':
      return e.player === hid ? 'tech' : null;
    case 'built':
      return e.owner === hid && rivalsTurn ? 'built' : null;
    case 'cityCaptured':
      return e.to === hid || e.from === hid ? 'captured' : null;
    case 'war':
      return e.a === hid || e.b === hid ? 'war' : null;
    case 'peace':
      return e.a === hid || e.b === hid ? 'peace' : null;
    case 'combat':
      return e.attackerOwner === hid || e.defenderOwner === hid ? 'attack' : null;
    case 'cityFounded':
      return e.owner === hid ? 'found' : null;
    default:
      return null;
  }
}
