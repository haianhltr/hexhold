// Researching the tech tree with science and the civics tree with culture. Both trees work the same
// way, so each function takes a track. Picking a locked tech or civic queues its prerequisites
// automatically. After everything on a track is done, a repeatable "future" item takes over.

import { TECHS, TECH_KEYS } from '../data/techs.js';
import { CIVICS, CIVIC_KEYS } from '../data/civics.js';
import { RULES } from '../data/rules.js';

export const TRACKS = {
  tech: { table: TECHS, keys: TECH_KEYS, done: 'techs', progress: 'progress', current: 'research', path: 'researchPath', overflow: 'sciOverflow', future: 'future', futureKey: 'future', futureName: 'Future Tech', futureCost: () => RULES.futureTechCost, event: 'tech' },
  civic: { table: CIVICS, keys: CIVIC_KEYS, done: 'civics', progress: 'civicProgress', current: 'civic', path: 'civicPath', overflow: 'cultureOverflow', future: 'futureCivics', futureKey: 'futurecivic', futureName: 'Future Civic', futureCost: () => RULES.futureCivicCost, event: 'civic' },
};

const T = (track) => TRACKS[track];

export const studyCost = (key, track = 'tech') => (key === T(track).futureKey ? T(track).futureCost() : T(track).table[key].cost);
export const studyName = (key, track = 'tech') => (key === T(track).futureKey ? T(track).futureName : T(track).table[key].name);
export const allStudied = (p, track = 'tech') => T(track).keys.every((k) => (p[T(track).done] || []).includes(k));

export function canStudyNow(p, key, track = 'tech') {
  const t = T(track);
  if (key === t.futureKey) return allStudied(p, track);
  const done = p[t.done] || [];
  return !done.includes(key) && t.table[key].req.every((r) => done.includes(r));
}

export function studyPath(p, key, track = 'tech') {
  const t = T(track);
  if (key === t.futureKey) return [key];
  const done = p[t.done] || [];
  const out = [];
  const visit = (k) => {
    if (done.includes(k) || out.includes(k)) return;
    for (const r of t.table[k].req) visit(r);
    out.push(k);
  };
  visit(key);
  return out;
}

export function setStudy(p, key, track = 'tech') {
  const t = T(track);
  const done = p[t.done] || [];
  if (key === t.futureKey ? !allStudied(p, track) : !t.table[key] || done.includes(key)) return false;
  p[t.path] = studyPath(p, key, track);
  p[t.current] = p[t.path][0] || null;
  return true;
}

// Adds a turn's science or culture to the current item, finishing as many items as it covers.
// `onDone(key)` runs after each finished item (not for future items).
export function addPoints(state, pid, amount, events, track = 'tech', onDone = null) {
  const t = T(track);
  const p = state.players[pid];
  const fut = t.futureKey;
  if (!p[t.current] && allStudied(p, track)) {
    p[t.current] = fut;
    p[t.path] = [fut];
  }
  let pool = amount + (p[t.overflow] || 0);
  p[t.overflow] = 0;
  while (p[t.current] && pool > 0) {
    const key = p[t.current];
    const have = p[t.progress][key] || 0;
    const need = studyCost(key, track) - have;
    if (pool < need) {
      p[t.progress][key] = have + pool;
      pool = 0;
      break;
    }
    pool -= need;
    if (key === fut) {
      p[t.future] = (p[t.future] || 0) + 1;
      p[t.progress][fut] = 0;
    } else {
      p[t.done].push(key);
      delete p[t.progress][key];
      if (onDone) onDone(key);
    }
    events.push({ type: t.event, player: pid, [t.event]: key });
    p[t.path].shift();
    while (p[t.path].length && p[t.done].includes(p[t.path][0])) p[t.path].shift();
    p[t.current] = p[t.path][0] || null;
    if (!p[t.current] && allStudied(p, track)) {
      p[t.current] = fut;
      p[t.path] = [fut];
    }
  }
  if (pool > 0) p[t.overflow] = pool;
}

export function turnsToStudy(p, key, perTurn, track = 'tech') {
  if (perTurn <= 0) return Infinity;
  const t = T(track);
  let total = 0;
  for (const k of studyPath(p, key, track)) total += studyCost(k, track) - (p[t.progress][k] || 0);
  total -= p[t.overflow] || 0;
  return Math.max(1, Math.ceil(total / perTurn));
}

// ---------- the tech track, by its familiar names ----------

export const techCost = (key) => studyCost(key, 'tech');
export const techName = (key) => studyName(key, 'tech');
export const allResearched = (p) => allStudied(p, 'tech');
export const canResearchNow = (p, key) => canStudyNow(p, key, 'tech');
export const researchPath = (p, key) => studyPath(p, key, 'tech');
export const setResearch = (p, key) => setStudy(p, key, 'tech');
export const turnsToResearch = (p, key, perTurn) => turnsToStudy(p, key, perTurn, 'tech');

export function addScience(state, pid, amount, events) {
  const p = state.players[pid];
  addPoints(state, pid, amount, events, 'tech', (key) => {
    if (TECHS[key].effect?.revealMap) p.explored.fill(1);
  });
}
