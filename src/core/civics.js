// Civics, governments and policy cards (data in data/civics.js and data/government.js).
//
// Culture researches civics on its own track (core/research.js). Finishing a civic opens a
// free-change turn: until the end of that round the player can switch government and swap policy
// cards for free. Outside it, each newly slotted card costs gold, and switching government costs
// more. Removing a card is always free. A player's first government is free.

import { CIVICS } from '../data/civics.js';
import { GOVERNMENTS, GOVERNMENT_KEYS, POLICIES, POLICY_KEYS, SLOT_NAMES, slotsFor, fitsSlot } from '../data/government.js';
import { RULES } from '../data/rules.js';
import { addPoints, studyCost, studyName, allStudied, canStudyNow, studyPath, setStudy, turnsToStudy } from './research.js';

// ---------- the civic track ----------

export const civicCost = (key) => studyCost(key, 'civic');
export const civicName = (key) => studyName(key, 'civic');
export const allCivics = (p) => allStudied(p, 'civic');
export const canStudyCivic = (p, key) => canStudyNow(p, key, 'civic');
export const civicPath = (p, key) => studyPath(p, key, 'civic');
export const setCivic = (p, key) => setStudy(p, key, 'civic');
export const turnsToCivic = (p, key, perTurn) => turnsToStudy(p, key, perTurn, 'civic');

export function addCulture(state, pid, amount, events) {
  addPoints(state, pid, amount, events, 'civic', () => onCivicDone(state.players[pid]));
}

// ---------- what a player can use ----------

const known = (p, civic) => (p.civics || []).includes(civic);
export const governmentUnlocked = (p, gov) => known(p, GOVERNMENTS[gov].civic);
export const policyUnlocked = (p, key) => known(p, POLICIES[key].civic);
export function policyObsolete(p, key) {
  const by = POLICIES[key].obsoleteBy;
  return !!by && policyUnlocked(p, by);
}
export const policyAvailable = (p, key) => policyUnlocked(p, key) && !policyObsolete(p, key);
export const availablePolicies = (p) => POLICY_KEYS.filter((k) => policyAvailable(p, k));
export const availableGovernments = (p) => GOVERNMENT_KEYS.filter((g) => governmentUnlocked(p, g));

// ---------- costs ----------

export const policySwapCost = (p) => RULES.policySwapBase + RULES.policySwapPerCivic * (p.civics || []).length;
export const governmentChangeCost = (p) => (p.government && !p.freeChanges ? policySwapCost(p) * RULES.governmentCostMult : 0);
export const changedSlots = (p, policies) => policies.filter((k, i) => k && k !== (p.policies || [])[i]).length;
export const policyChangeCost = (p, policies) => (p.freeChanges ? 0 : changedSlots(p, policies) * policySwapCost(p));

// ---------- rules ----------

// Why `policies` (one entry per slot of the current government, a card key or null) can't be
// slotted, or null if it can.
export function policiesReason(p, policies) {
  const slots = slotsFor(p);
  if (!p.government) return 'Choose a government first';
  if (!Array.isArray(policies) || policies.length !== slots.length) return `${GOVERNMENTS[p.government].name} has ${slots.length} policy slots`;
  const seen = new Set();
  for (let i = 0; i < slots.length; i++) {
    const k = policies[i];
    if (k == null) continue;
    const def = POLICIES[k];
    if (!def) return 'Unknown policy';
    if (seen.has(k)) return `${def.name} is already slotted`;
    seen.add(k);
    if (!policyUnlocked(p, k)) return `${def.name} needs ${CIVICS[def.civic].name}`;
    if (policyObsolete(p, k)) return `${def.name} has been replaced by ${POLICIES[def.obsoleteBy].name}`;
    if (!fitsSlot(def.slot, slots[i])) return `${def.name} doesn't fit a ${SLOT_NAMES[slots[i]]} slot`;
  }
  return null;
}

// Moves the slotted cards into another government's slots. First every card takes a free slot of
// its own kind; then the rest take free wildcard slots, in order. Cards that don't fit are unslotted.
export function refitPolicies(p, gov) {
  const slots = slotsFor(p, gov);
  const out = Array(slots.length).fill(null);
  const cards = (p.policies || []).filter(Boolean);
  const left = [];
  for (const k of cards) {
    const i = slots.findIndex((s, j) => out[j] == null && s === POLICIES[k].slot);
    if (i >= 0) out[i] = k;
    else left.push(k);
  }
  for (const k of left) {
    const i = slots.findIndex((s, j) => out[j] == null && fitsSlot(POLICIES[k].slot, s));
    if (i >= 0) out[i] = k;
  }
  return out;
}

// After a civic: open a free-change turn, and swap slotted cards that just became obsolete for
// their replacement (unless the replacement is already slotted).
function onCivicDone(p) {
  p.freeChanges = true;
  const used = new Set(p.policies || []);
  p.policies = (p.policies || []).map((k) => {
    if (!k || !policyObsolete(p, k)) return k;
    let next = POLICIES[k].obsoleteBy;
    while (policyObsolete(p, next)) next = POLICIES[next].obsoleteBy;
    used.delete(k);
    if (used.has(next)) return null;
    used.add(next);
    return next;
  });
}
