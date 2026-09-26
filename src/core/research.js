// Researching the tech tree. Picking a locked tech queues its prerequisites automatically.

import { TECHS, TECH_KEYS } from '../data/techs.js';
import { RULES } from '../data/rules.js';

export const techCost = (key) => (key === 'future' ? RULES.futureTechCost : TECHS[key].cost);
export const techName = (key) => (key === 'future' ? 'Future Tech' : TECHS[key].name);
export const allResearched = (p) => TECH_KEYS.every((k) => p.techs.includes(k));

export function canResearchNow(p, key) {
  if (key === 'future') return allResearched(p);
  return !p.techs.includes(key) && TECHS[key].req.every((r) => p.techs.includes(r));
}

export function researchPath(p, key) {
  if (key === 'future') return ['future'];
  const out = [];
  const visit = (k) => {
    if (p.techs.includes(k) || out.includes(k)) return;
    for (const r of TECHS[k].req) visit(r);
    out.push(k);
  };
  visit(key);
  return out;
}

export function setResearch(p, key) {
  if (key === 'future' ? !allResearched(p) : p.techs.includes(key) || !TECHS[key]) return false;
  p.researchPath = researchPath(p, key);
  p.research = p.researchPath[0] || null;
  return true;
}

export function addScience(state, pid, amount, events) {
  const p = state.players[pid];
  if (!p.research && allResearched(p)) {
    p.research = 'future';
    p.researchPath = ['future'];
  }
  let pool = amount + (p.sciOverflow || 0);
  p.sciOverflow = 0;
  while (p.research && pool > 0) {
    const key = p.research;
    const have = p.progress[key] || 0;
    const need = techCost(key) - have;
    if (pool < need) {
      p.progress[key] = have + pool;
      pool = 0;
      break;
    }
    pool -= need;
    if (key === 'future') {
      p.future++;
      p.progress.future = 0;
    } else {
      p.techs.push(key);
      delete p.progress[key];
    }
    events.push({ type: 'tech', player: pid, tech: key });
    p.researchPath.shift();
    while (p.researchPath.length && p.techs.includes(p.researchPath[0])) p.researchPath.shift();
    p.research = p.researchPath[0] || null;
    if (!p.research && allResearched(p)) {
      p.research = 'future';
      p.researchPath = ['future'];
    }
  }
  if (pool > 0) p.sciOverflow = pool;
}

export function turnsToResearch(p, key, perTurn) {
  if (perTurn <= 0) return Infinity;
  let total = 0;
  for (const k of researchPath(p, key)) total += techCost(k) - (p.progress[k] || 0);
  total -= p.sciOverflow || 0;
  return Math.max(1, Math.ceil(total / perTurn));
}
