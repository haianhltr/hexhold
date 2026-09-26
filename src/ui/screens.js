// Full-screen and modal screens: title, setup, tech and civics trees, government, diplomacy, menu,
// saves, settings, help, game over, and small confirmation dialogs.

import { CIVS } from '../data/civs.js';
import { TECHS, TECH_KEYS, ERAS, ERA_INDEX, eraOf } from '../data/techs.js';
import { CIVICS, CIVIC_KEYS, civicEraOf } from '../data/civics.js';
import { GOVERNMENTS, GOVERNMENT_KEYS, POLICIES, POLICY_KEYS, SLOT_TYPES, SLOT_NAMES, slotsOf, fitsSlot } from '../data/government.js';
import { UNITS } from '../data/units.js';
import { DIFFICULTY, MAP_SIZES, TURN_LIMITS, TURN_LIMIT_LABELS, RULES } from '../data/rules.js';
import { atWar, haveMet, citiesOf, yearLabel } from '../core/query.js';
import { playerYields } from '../core/yields.js';
import { studyCost, canStudyNow, turnsToStudy } from '../core/research.js';
import { availablePolicies, governmentUnlocked, governmentChangeCost, policyChangeCost, policySwapCost } from '../core/civics.js';
import { militaryPower } from '../core/diplomacy.js';
import { score, scoreBreakdown, rankings } from '../core/victory.js';
import { seedFromText } from '../core/rng.js';
import * as storage from '../save/storage.js';
import { h, clear, fill, icon, emblemSvg, bar, fmt, YIELD_COLORS } from './dom.js';
import { unlocksOf, civicUnlocksOf } from './events.js';
import { setVolume, sfx, unlockAudio } from './sound.js';

const VERSION = '1.3.0';

// ---------- title & setup ----------

export function showTitle(app) {
  const s = app.screen;
  const hasContinue = storage.hasContinue();
  const cont = () => {
    unlockAudio();
    try {
      app.loadGame(storage.loadSave('auto.0'));
    } catch (e) {
      app.toast(e.message, 'error');
    }
  };
  fill(s, h('div', { class: 'title-card' },
    h('p', { class: 'eyebrow' }, 'A turn-based strategy game'),
    h('h1', { class: 'logo' }, 'Hexhold'),
    h('p', { class: 'tagline' }, 'Found cities, place districts, research the ancient world and outlast your rivals, one hex at a time.'),
    h('div', { class: 'title-actions' },
      hasContinue ? h('button', { type: 'button', class: 'btn primary big', onclick: cont }, 'Continue') : null,
      h('button', { type: 'button', class: `btn big${hasContinue ? '' : ' primary'}`, onclick: () => { unlockAudio(); showSetup(app); } }, 'New game'),
      h('button', { type: 'button', class: 'btn big', onclick: () => openSaves(app, 'load') }, 'Load game'),
      h('button', { type: 'button', class: 'btn big ghost', onclick: () => openHelp(app) }, 'How to play'),
      h('button', { type: 'button', class: 'btn big ghost', onclick: () => openSettings(app) }, 'Settings')),
    h('p', { class: 'title-foot' }, `Version ${VERSION} · Runs entirely in your browser · Progress saves automatically`)));
  s.hidden = false;
}

export function showSetup(app) {
  const opts = { civ: 0, size: 'small', rivals: 2, difficulty: 'normal', turnLimit: 100 };
  const s = app.screen;
  const seedInput = h('input', { type: 'text', id: 'setup-seed', placeholder: 'Random', maxlength: 24, 'aria-describedby': 'seed-help' });
  const group = (label, name, choices, get, set) => h('fieldset', { class: 'choice' },
    h('legend', {}, label),
    h('div', { class: 'choice-row' }, ...choices.map(([value, text, sub]) => {
      const id = `setup-${name}-${value}`;
      return h('label', { class: 'choice-item', for: id },
        h('input', { type: 'radio', name, id, value, checked: get() === value, onchange: () => set(value) }),
        h('span', {}, text, sub ? h('small', {}, sub) : null));
    })));
  const civGroup = h('fieldset', { class: 'choice civs' }, h('legend', {}, 'Your civilization'),
    h('div', { class: 'civ-row' }, ...CIVS.map((c, i) => {
      const id = `setup-civ-${i}`;
      return h('label', { class: 'civ-card', for: id, style: { '--civ': c.color } },
        h('input', { type: 'radio', name: 'civ', id, value: i, checked: i === 0, onchange: () => (opts.civ = i) }),
        h('span', { class: 'civ-emblem', html: emblemSvg(c.emblem, c.color, 34) }),
        h('b', {}, c.name),
        h('small', {}, `Capital: ${c.cities[0]}`));
    })));
  const form = h('form', { class: 'setup-card', onsubmit: (e) => {
    e.preventDefault();
    const seed = seedInput.value.trim() ? seedFromText(seedInput.value) : undefined;
    try {
      app.startNewGame({ ...opts, seed });
    } catch (err) {
      app.toast(err.message, 'error');
    }
  } },
    h('h2', {}, 'New game'),
    civGroup,
    h('div', { class: 'setup-grid' },
      group('Map size', 'size', Object.entries(MAP_SIZES).map(([k, v]) => [k, v.label, `${v.w} × ${v.h}`]), () => opts.size, (v) => (opts.size = v)),
      group('Rivals', 'rivals', [[1, '1'], [2, '2'], [3, '3']], () => opts.rivals, (v) => (opts.rivals = Number(v))),
      group('Difficulty', 'difficulty', Object.entries(DIFFICULTY).map(([k, v]) => [k, v.label, k === 'easy' ? 'Relaxed rivals' : k === 'hard' ? 'Rivals get +25% yields' : 'Fair rivals']), () => opts.difficulty, (v) => (opts.difficulty = v)),
      group('Game length', 'turns', TURN_LIMITS.map((t) => [t, `${t} turns`, TURN_LIMIT_LABELS[t]]), () => opts.turnLimit, (v) => (opts.turnLimit = Number(v)))),
    h('div', { class: 'seed-row' },
      h('label', { for: 'setup-seed' }, 'Map seed'), seedInput,
      h('small', { id: 'seed-help', class: 'muted' }, 'Leave blank for a random world. The same seed always makes the same map.')),
    h('div', { class: 'row' },
      h('button', { type: 'submit', class: 'btn primary big' }, 'Start game'),
      h('button', { type: 'button', class: 'btn big ghost', onclick: () => showTitle(app) }, 'Back')));
  fill(s, form);
  s.hidden = false;
}

// ---------- confirm ----------

export function confirmModal(app, { title, text, confirm = 'OK', cancel = 'Cancel', danger = false, onConfirm, onCancel }) {
  const body = h('div', { class: 'stack' },
    h('h2', {}, title),
    text ? h('p', {}, text) : null,
    h('div', { class: 'row' },
      h('button', { type: 'button', class: `btn ${danger ? 'danger' : 'primary'}`, onclick: () => { app.closeModal(); onConfirm && onConfirm(); } }, confirm),
      h('button', { type: 'button', class: 'btn', onclick: () => { app.closeModal(); onCancel && onCancel(); } }, cancel)));
  app.openModal(body, { label: title });
}

export function peaceOfferModal(app, offer) {
  const from = app.state.players[offer.from];
  const respond = (accept) => {
    app.closeModal();
    app.dispatch({ type: 'respondPeace', from: offer.from, accept });
    setTimeout(() => app.checkOffers(), 50);
  };
  app.openModal(h('div', { class: 'stack' },
    h('div', { class: 'row', style: { alignItems: 'center' } }, h('span', { html: emblemSvg(from.emblem, from.color, 32) }), h('h2', {}, `${from.name} offers peace`)),
    h('p', {}, `${from.name} wants to end the war. Accepting closes both borders again, and units standing in the other's territory are moved out.`),
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'btn primary', onclick: () => respond(true) }, 'Accept peace'),
      h('button', { type: 'button', class: 'btn', onclick: () => respond(false) }, 'Keep fighting'))), { label: 'Peace offer', closable: false });
}

// ---------- tech and civics trees ----------

// The two research trees share one timeline screen. Each track names its data and wording.
const TREES = {
  tech: {
    table: TECHS, keys: TECH_KEYS, done: 'techs', progress: 'progress', current: 'research', path: 'researchPath', future: 'future',
    futureKey: 'future', futureName: 'Future Tech', yield: 'science', title: 'Technologies', label: 'Tech tree', noun: 'tech', nouns: 'techs',
    action: (key) => ({ type: 'research', tech: key }), unlocks: (key) => unlocksOf(key), era: (p) => eraOf(p.techs),
  },
  civic: {
    table: CIVICS, keys: CIVIC_KEYS, done: 'civics', progress: 'civicProgress', current: 'civic', path: 'civicPath', future: 'futureCivics',
    futureKey: 'futurecivic', futureName: 'Future Civic', yield: 'culture', title: 'Civics', label: 'Civics tree', noun: 'civic', nouns: 'civics',
    action: (key) => ({ type: 'civic', civic: key }), unlocks: (key) => civicUnlocksOf(key), era: (p) => civicEraOf(p.civics),
  },
};

// Card grid geometry for the timelines, in pixels.
const TT = { w: 214, h: 82, colGap: 50, rowGap: 12, head: 30, pad: 10 };

// Places every item of a tree on a column/row grid. Columns follow prerequisites (an item sits
// right of everything it needs) and never mix eras; rows are ordered so lines cross as little as
// possible. The result depends only on the data, so it is computed once per tree.
const layouts = {};
function layoutTree(track) {
  if (layouts[track]) return layouts[track];
  const { table, keys: all, futureKey } = TREES[track];
  const col = {};
  const eras = [];
  let start = 0;
  for (const era of ERAS) {
    const keys = all.filter((k) => table[k].era === era.key);
    if (!keys.length) continue;
    for (const k of keys) col[k] = start;
    for (let changed = true; changed; ) {
      changed = false;
      for (const k of keys) {
        const c = Math.max(start, ...table[k].req.map((r) => col[r] + 1));
        if (c !== col[k]) {
          col[k] = c;
          changed = true;
        }
      }
    }
    const end = Math.max(...keys.map((k) => col[k]));
    eras.push({ ...era, from: start, to: end });
    start = end + 1;
  }
  const cols = [];
  for (const k of all) (cols[col[k]] ||= []).push(k);
  const children = {};
  for (const k of all) for (const r of table[k].req) (children[r] ||= []).push(k);

  // Barycenter ordering: each item wants to sit level with the items it connects to. Rows are whole
  // numbers within the height of the fullest column, so the tree stays compact.
  const rows = Math.max(...cols.map((c) => c.length));
  const row = {};
  const place = (keys, want) => {
    const order = keys.map((k, i) => ({ k, y: want(k) ?? i })).sort((a, b) => a.y - b.y);
    let prev = -1;
    for (const o of order) prev = o.at = Math.max(Math.round(o.y), prev + 1);
    for (let i = order.length - 1, cap = rows - 1; i >= 0; i--, cap--) order[i].at = Math.min(order[i].at, cap);
    for (const o of order) row[o.k] = o.at;
  };
  const mean = (list) => (list && list.length ? list.reduce((s, k) => s + row[k], 0) / list.length : null);
  cols[0].forEach((k, i) => (row[k] = i));
  for (let pass = 0; pass < 4; pass++) {
    for (let c = 1; c < cols.length; c++) place(cols[c], (k) => mean(table[k].req));
    for (let c = cols.length - 2; c >= 0; c--) place(cols[c], (k) => mean((children[k] || []).filter((x) => row[x] != null)));
  }
  for (let c = 1; c < cols.length; c++) place(cols[c], (k) => mean(table[k].req));
  const pos = {};
  for (const k of all) pos[k] = { col: col[k], row: row[k] };
  const last = all.find((k) => table[k].effect?.victory) || all[all.length - 1];
  pos[futureKey] = { col: cols.length, row: pos[last].row };
  layouts[track] = { pos, eras, cols: cols.length + 1, rows, last };
  return layouts[track];
}

const techX = (col) => TT.pad + col * (TT.w + TT.colGap);
const techY = (row) => TT.head + TT.pad + row * (TT.h + TT.rowGap);

export const openTechTree = (app) => openTree(app, 'tech');
export const openCivicsTree = (app) => openTree(app, 'civic');

export function openTree(app, track) {
  if (!app.state) return;
  const T = TREES[track];
  const s = app.state;
  const p = app.human;
  const perTurn = playerYields(s, p.id)[T.yield];
  const done = p[T.done];
  const path = p[T.path] || [];
  const { pos, eras, cols, rows, last } = layoutTree(track);
  const width = techX(cols) - TT.colGap + TT.pad;
  const height = techY(rows) - TT.rowGap + TT.pad;
  const cards = new Map();
  const era = T.era(p);

  const pick = (key) => {
    if (app.dispatch(T.action(key)).ok) {
      sfx.click();
      openTree(app, track);
    }
  };
  const card = (key) => {
    const future = key === T.futureKey;
    const t = T.table[key];
    const isDone = !future && done.includes(key);
    const current = p[T.current] === key;
    const queued = !current && path.includes(key);
    const available = canStudyNow(p, key, track);
    const state = isDone ? 'done' : current ? 'current' : queued ? 'queued' : available ? 'available' : 'locked';
    const turns = isDone ? null : turnsToStudy(p, key, perTurn, track);
    const progress = p[T.progress][key] || 0;
    let status;
    if (future) status = available ? `Repeatable · ${p[T.future] || 0} researched` : `Research every ${T.noun} first`;
    else if (isDone) status = 'Researched';
    else if (current) status = `Researching · ${turns} turn${turns === 1 ? '' : 's'}`;
    else if (queued) status = `Queued · ${turns} turns`;
    else if (available) status = `${Number.isFinite(turns) ? turns : '–'} turns`;
    else status = `${Number.isFinite(turns) ? turns : '–'} turns · needs ${t.req.filter((r) => !done.includes(r)).map((r) => T.table[r].name).join(', ')}`;
    const unlocks = future ? [{ kind: 'effect', name: `+${RULES.score.future} score each` }] : T.unlocks(key);
    const name = future ? T.futureName : t.name;
    const where = pos[key];
    const el = h('button', {
      type: 'button',
      class: `tech ${track} ${state}${t?.effect?.victory ? ' victory' : ''}`,
      disabled: isDone || (future && !available),
      'aria-pressed': current ? 'true' : 'false',
      'data-tech': key,
      title: `${name}. ${status}.${unlocks.length ? ` Unlocks: ${unlocks.map((u) => u.name).join(', ')}.` : ''}`,
      style: { left: `${techX(where.col)}px`, top: `${techY(where.row)}px`, width: `${TT.w}px`, height: `${TT.h}px` },
      onclick: () => pick(key),
    },
      h('span', { class: 'tech-name' }, name),
      h('span', { class: 'tech-status' }, status),
      current || progress ? bar(progress / studyCost(key, track), YIELD_COLORS[T.yield], 'Progress') : null,
      h('span', { class: 'tech-unlocks' }, ...unlocks.map((u) => h('span', { class: `chip ${u.kind}` }, u.name))),
      h('span', { class: 'tech-cost' }, `${studyCost(key, track)}`, h('span', { html: icon(T.yield) })));
    cards.set(key, el);
    return el;
  };

  // Prerequisite lines, drawn from the layout rather than measured from the DOM.
  let lines = '';
  const link = (from, to, cls) => {
    const a = pos[from];
    const b = pos[to];
    const x1 = techX(a.col) + TT.w;
    const y1 = techY(a.row) + TT.h / 2;
    const x2 = techX(b.col);
    const y2 = techY(b.row) + TT.h / 2;
    const mx = x2 - TT.colGap / 2;
    lines += `<path class="${cls}" d="M${x1} ${y1}H${mx}${y1 === y2 ? '' : `C${mx + 12} ${y1} ${mx + 12} ${y2} ${mx + 24} ${y2}`}H${x2}"/>`;
  };
  for (const k of T.keys) for (const r of T.table[k].req) link(r, k, done.includes(k) ? 'done' : done.includes(r) ? 'open' : path.includes(k) ? 'queued' : '');
  link(last, T.futureKey, done.includes(last) ? 'open' : '');

  const bands = eras.map((e, i) => {
    const left = techX(e.from) - TT.colGap / 2 + (i === 0 ? TT.colGap / 2 - TT.pad : 0);
    const right = techX(e.to) + TT.w + TT.colGap / 2;
    const reached = ERA_INDEX[e.key] <= ERA_INDEX[era.key];
    return h('div', { class: `era-band${i % 2 ? ' alt' : ''}${reached ? ' reached' : ''}`, 'data-era': e.key, style: { left: `${left}px`, width: `${right - left}px`, height: `${height}px` } },
      h('span', { class: 'era-name' }, `${e.name} Era`));
  });
  const svg = `<svg class="tech-lines" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">${lines}</svg>`;
  const canvas = h('div', { class: 'tech-canvas', style: { width: `${width}px`, height: `${height}px` } },
    ...bands, h('div', { html: svg, style: { display: 'contents' } }), ...T.keys.map(card), card(T.futureKey));
  const scroller = h('div', { class: 'tech-scroll' }, canvas);

  const scrollToCol = (col, smooth = true) => scroller.scrollTo({ left: Math.max(0, techX(col) - scroller.clientWidth / 2 + TT.w / 2), behavior: smooth ? 'smooth' : 'auto' });
  const eraNav = h('div', { class: 'era-nav', role: 'group', 'aria-label': 'Jump to era' }, ...eras.map((e) =>
    h('button', { type: 'button', class: `btn small ghost${e.key === era.key ? ' active' : ''}`, onclick: () => scrollToCol((e.from + e.to) / 2) }, e.name)));

  const search = h('input', { type: 'search', class: 'tech-search', placeholder: `Search ${T.nouns} and unlocks`, 'aria-label': `Search ${T.nouns} and unlocks` });
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    let first = null;
    for (const [key, el] of cards) {
      const text = key === T.futureKey ? T.futureName.toLowerCase() : `${T.table[key].name} ${T.unlocks(key).map((u) => u.name).join(' ')}`.toLowerCase();
      const hit = q.length > 1 && text.includes(q);
      el.classList.toggle('match', hit);
      el.classList.toggle('dim', q.length > 1 && !hit);
      if (hit && !first) first = key;
    }
    if (first) scrollToCol(pos[first].col);
  });

  // Switch between the two trees without closing the screen.
  const other = track === 'tech' ? 'civic' : 'tech';
  const switcher = h('button', { type: 'button', class: 'btn small', onclick: () => openTree(app, other), title: other === 'tech' ? 'Tech tree (T)' : 'Civics tree (V)' }, `${TREES[other].title} →`);
  const extra = track === 'civic' ? h('button', { type: 'button', class: 'btn small', onclick: () => openGovernment(app), title: 'Government (G)' }, 'Government') : null;

  const content = h('div', { class: `tech-tree ${track}-tree` },
    h('div', { class: 'tech-head' },
      h('div', {}, h('h2', {}, T.title),
        h('p', { class: 'small muted' }, `${era.name} Era · ${fmt(perTurn)} ${T.yield} per turn · ${done.length}/${T.keys.length} researched. Pick any ${T.noun}; the ${T.nouns} it needs are researched first.`)),
      h('div', { class: 'row tech-tools' }, search, extra, switcher)),
    eraNav,
    scroller);
  app.openModal(content, { full: true, label: T.label });
  // Open on what the player is working toward: the current item, else the frontier.
  const focus = p[T.current] && pos[p[T.current]] ? p[T.current] : T.keys.find((k) => canStudyNow(p, k, track)) || T.futureKey;
  requestAnimationFrame(() => scrollToCol(pos[focus].col, false));
}

// ---------- government ----------

// Pick a government and slot policy cards. Changes are drafted on the screen and applied with
// Confirm, which shows what they cost.
export function openGovernment(app, draft = null, selected = null, filter = 'all') {
  if (!app.state) return;
  const s = app.state;
  const p = app.human;
  const gov = p.government ? GOVERNMENTS[p.government] : null;
  const slots = slotsOf(p.government);
  draft = draft && draft.length === slots.length ? draft : [...(p.policies || [])];
  const rerender = (d = draft, sel = selected, f = filter) => openGovernment(app, d, sel, f);
  const cost = policyChangeCost(p, draft);
  const dirty = draft.some((k, i) => k !== (p.policies || [])[i]);

  const place = (key) => {
    const kind = POLICIES[key].slot;
    const next = [...draft];
    const at = next.indexOf(key);
    if (at >= 0) {
      next[at] = null;
      return rerender(next, at);
    }
    let i = selected != null && fitsSlot(kind, slots[selected]) ? selected : -1;
    if (i < 0) i = slots.findIndex((sl, j) => !next[j] && sl === kind);
    if (i < 0) i = slots.findIndex((sl, j) => !next[j] && fitsSlot(kind, sl));
    if (i < 0) {
      app.toast(`No free slot for ${POLICIES[key].name}. Click a ${SLOT_NAMES[kind].toLowerCase()}${kind === 'wildcard' ? '' : ' or wildcard'} slot first to replace its card.`, 'error');
      return;
    }
    next[i] = key;
    sfx.click();
    rerender(next, null);
  };

  const policyCard = (key, { slotted = false, index = null } = {}) => {
    const d = POLICIES[key];
    return h('div', { class: `policy ${d.slot}${slotted ? ' slotted' : ''}` },
      h('b', {}, d.name),
      h('span', {}, d.effectText),
      index != null ? h('button', { type: 'button', class: 'policy-remove', 'aria-label': `Remove ${d.name}`, onclick: (e) => { e.stopPropagation(); const next = [...draft]; next[index] = null; rerender(next, index); } }, '×') : null);
  };

  const slotEls = slots.map((kind, i) => h('button', {
    type: 'button',
    class: `slot ${kind}${selected === i ? ' selected' : ''}${draft[i] ? '' : ' empty'}`,
    'aria-label': `${SLOT_NAMES[kind]} slot ${draft[i] ? `: ${POLICIES[draft[i]].name}` : '(empty)'}`,
    onclick: () => rerender(draft, selected === i ? null : i),
  }, draft[i] ? policyCard(draft[i], { slotted: true, index: i }) : h('span', { class: 'slot-empty' }, `Empty ${SLOT_NAMES[kind]} slot`)));

  const cards = availablePolicies(p)
    .filter((k) => filter === 'all' || POLICIES[k].slot === filter)
    .sort((a, b) => ['military', 'economic', 'wildcard'].indexOf(POLICIES[a].slot) - ['military', 'economic', 'wildcard'].indexOf(POLICIES[b].slot) || POLICY_KEYS.indexOf(a) - POLICY_KEYS.indexOf(b));
  const fitsAnywhere = (k) => slots.some((sl) => fitsSlot(POLICIES[k].slot, sl));
  const cardEls = cards.map((k) => h('button', {
    type: 'button',
    class: `policy-pick${draft.includes(k) ? ' in' : ''}${fitsAnywhere(k) ? '' : ' nofit'}`,
    disabled: !fitsAnywhere(k),
    title: fitsAnywhere(k) ? (draft.includes(k) ? 'Slotted. Click to remove.' : 'Click to slot') : `${gov ? gov.name : 'This government'} has no slot for this card`,
    onclick: () => place(k),
  }, policyCard(k)));

  const tabs = h('div', { class: 'era-nav', role: 'group', 'aria-label': 'Filter cards' }, ...['all', 'military', 'economic', 'wildcard'].map((f) =>
    h('button', { type: 'button', class: `btn small ghost${filter === f ? ' active' : ''}`, onclick: () => rerender(draft, selected, f) }, f === 'all' ? 'All cards' : SLOT_NAMES[f])));

  const status = !p.government
    ? 'Choose your first government. It’s free.'
    : p.freeChanges
      ? 'You finished a civic, so changes are free this turn.'
      : `Each newly slotted card costs ${policySwapCost(p)} gold this turn. Removing cards is free. Changes are free on the turn you finish a civic.`;

  const govCards = GOVERNMENT_KEYS.map((k) => {
    const d = GOVERNMENTS[k];
    const unlocked = governmentUnlocked(p, k);
    const current = p.government === k;
    const price = governmentChangeCost(p);
    return h('div', { class: `gov${current ? ' current' : ''}${unlocked ? '' : ' locked'}` },
      h('div', { class: 'gov-head' }, h('b', {}, d.name), h('span', { class: 'gov-tier' }, d.tier ? `Tier ${d.tier}` : 'Start')),
      h('div', { class: 'gov-slots', 'aria-label': `${d.slots[0]} military, ${d.slots[1]} economic, ${d.slots[2]} wildcard slots` },
        ...SLOT_TYPES.flatMap((kind, j) => Array.from({ length: d.slots[j] }, () => h('i', { class: kind, title: SLOT_NAMES[kind] })))),
      h('span', { class: 'small' }, d.effectText),
      current ? h('span', { class: 'small good-text' }, 'Current government')
        : unlocked ? h('button', { type: 'button', class: 'btn small', onclick: () => { if (app.dispatch({ type: 'government', government: k }).ok) { sfx.click(); openGovernment(app); } } }, price ? `Adopt (${price} gold)` : 'Adopt')
          : h('span', { class: 'small muted' }, `Needs ${CIVICS[d.civic].name}`));
  });

  const confirm = () => {
    if (app.dispatch({ type: 'policies', policies: draft }).ok) {
      sfx.click();
      openGovernment(app);
    }
  };
  const content = h('div', { class: 'stack government' },
    h('div', { class: 'row-between gov-top' },
      h('div', {}, h('h2', {}, gov ? gov.name : 'Government'), h('p', { class: 'small muted' }, gov ? `${gov.effectText}. ${status}` : status)),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn small', onclick: () => openCivicsTree(app), title: 'Civics tree (V)' }, 'Civics tree'))),
    gov ? h('section', { class: 'stack' },
      h('h3', {}, 'Policy slots'),
      h('div', { class: 'slots' }, ...slotEls),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn primary', disabled: !dirty, onclick: confirm }, dirty ? (cost ? `Confirm changes (${cost} gold)` : 'Confirm changes') : 'No changes'),
        dirty ? h('button', { type: 'button', class: 'btn ghost', onclick: () => rerender([...(p.policies || [])], null) }, 'Undo changes') : null,
        h('span', { class: 'small muted' }, `${Math.floor(p.gold)} gold`)),
      h('div', { class: 'row-between' }, h('h3', {}, 'Policy cards'), tabs),
      cardEls.length ? h('div', { class: 'policy-grid' }, ...cardEls) : h('p', { class: 'small muted' }, 'Research civics to unlock policy cards.')) : null,
    h('section', { class: 'stack' },
      h('h3', {}, 'Governments'),
      h('div', { class: 'gov-grid' }, ...govCards)));
  app.openModal(content, { wide: true, label: 'Government' });
}

// ---------- diplomacy ----------

export function openDiplomacy(app) {
  if (!app.state) return;
  const s = app.state;
  const hid = app.humanId;
  const mine = militaryPower(s, hid);
  const rows = s.players.filter((o) => o.id !== hid).map((o) => {
    if (!haveMet(s, hid, o.id)) {
      return h('div', { class: 'dip-row unknown' }, h('span', { class: 'dip-emblem' }, '?'), h('div', {}, h('b', {}, 'Unknown civilization'), h('p', { class: 'small muted' }, 'Explore to meet them.')));
    }
    if (!o.alive) {
      return h('div', { class: 'dip-row dead' }, h('span', { class: 'dip-emblem', html: emblemSvg(o.emblem, o.color, 28) }), h('div', {}, h('b', {}, o.name), h('p', { class: 'small muted' }, 'Eliminated')));
    }
    const war = atWar(s, hid, o.id);
    const ratio = militaryPower(s, o.id) / Math.max(1, mine);
    const strength = ratio > 1.4 ? 'Much stronger army' : ratio > 1.1 ? 'Stronger army' : ratio > 0.9 ? 'Similar army' : ratio > 0.6 ? 'Weaker army' : 'Much weaker army';
    const since = war ? s.players[hid].warSince[o.id] : null;
    const offered = s.offers.some((x) => x.from === hid && x.to === o.id);
    return h('div', { class: `dip-row${war ? ' war' : ''}` },
      h('span', { class: 'dip-emblem', html: emblemSvg(o.emblem, o.color, 28) }),
      h('div', { class: 'dip-info' },
        h('b', {}, o.name),
        h('p', { class: 'small' }, war ? h('span', { class: 'warn-text' }, `At war since turn ${since}`) : h('span', { class: 'good-text' }, 'At peace'), h('span', { class: 'muted' }, ` · ${citiesOf(s, o.id).length} cities · score ${score(s, o.id)} · ${strength}`))),
      h('div', { class: 'dip-actions' },
        war
          ? h('button', { type: 'button', class: 'btn', disabled: offered, onclick: () => { const r = app.dispatch({ type: 'proposePeace', target: o.id }, { quiet: true }); if (!r.ok) app.toast(r.reason); openDiplomacy(app); } }, 'Propose peace')
          : h('button', { type: 'button', class: 'btn danger', onclick: () => app.confirmWar(o.id, () => openDiplomacy(app)) }, 'Declare war')));
  });
  app.openModal(h('div', { class: 'stack' },
    h('h2', {}, 'Diplomacy'),
    h('p', { class: 'small muted' }, 'At peace, borders are closed. At war, anything goes. Rivals accept peace when a war is going badly for them or has dragged on.'),
    ...rows), { label: 'Diplomacy' });
}

// ---------- menu, saves, settings, help ----------

export function openMenu(app) {
  const inGame = !!app.state;
  app.openModal(h('div', { class: 'stack menu' },
    h('h2', {}, 'Menu'),
    inGame ? h('button', { type: 'button', class: 'btn primary', onclick: () => app.closeModal() }, 'Resume') : null,
    inGame ? h('button', { type: 'button', class: 'btn', onclick: () => openTechTree(app) }, 'Tech tree') : null,
    inGame ? h('button', { type: 'button', class: 'btn', onclick: () => openCivicsTree(app) }, 'Civics tree') : null,
    inGame ? h('button', { type: 'button', class: 'btn', onclick: () => openGovernment(app) }, 'Government') : null,
    inGame ? h('button', { type: 'button', class: 'btn', onclick: () => openSaves(app, 'save') }, 'Save game') : null,
    h('button', { type: 'button', class: 'btn', onclick: () => openSaves(app, 'load') }, 'Load game'),
    inGame ? h('button', { type: 'button', class: 'btn', onclick: () => openTransfer(app) }, 'Export or import a save') : null,
    h('button', { type: 'button', class: 'btn', onclick: () => openSettings(app) }, 'Settings'),
    h('button', { type: 'button', class: 'btn', onclick: () => openHelp(app) }, 'How to play'),
    inGame ? h('button', { type: 'button', class: 'btn ghost', onclick: () => confirmModal(app, {
      title: 'Quit to the title screen?',
      text: 'Your game was autosaved at the start of this turn. Anything done since then is lost unless you save now.',
      confirm: 'Quit',
      onConfirm: () => app.showTitle(),
    }) }, 'Quit to title') : null), { label: 'Menu' });
}

function when(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function saveLabel(meta) {
  if (!meta || !meta.turn) return 'Empty slot';
  return `${meta.name ? `${meta.name} · ` : ''}${meta.civ} · turn ${meta.turn} · ${MAP_SIZES[meta.size]?.label || ''} · ${DIFFICULTY[meta.difficulty]?.label || ''}`;
}

export function openSaves(app, mode) {
  const saves = storage.listSaves();
  const rows = saves.filter((sv) => mode === 'save' ? sv.kind === 'slot' : !sv.empty).map((sv) => {
    const label = sv.kind === 'auto' ? (sv.index === 0 ? 'Latest autosave' : `Autosave ${sv.index + 1}`) : `Slot ${sv.index}`;
    const actions = [];
    if (mode === 'save') {
      actions.push(h('button', { type: 'button', class: 'btn small primary', onclick: () => {
        const doSave = () => {
          if (storage.saveToSlot(sv.index, app.state)) {
            app.toast(`Saved to slot ${sv.index}.`, 'good');
            openSaves(app, 'save');
          } else app.toast("Couldn't save: this browser's storage is full or blocked. Use Export instead.", 'error');
        };
        if (sv.empty) doSave();
        else confirmModal(app, { title: `Overwrite slot ${sv.index}?`, text: saveLabel(sv.meta), confirm: 'Overwrite', onConfirm: doSave, onCancel: () => openSaves(app, 'save') });
      } }, 'Save here'));
    } else {
      actions.push(h('button', { type: 'button', class: 'btn small primary', onclick: () => {
        try {
          app.loadGame(storage.loadSave(sv.key));
        } catch (e) {
          app.toast(e.message, 'error');
        }
      } }, 'Load'));
      if (sv.kind === 'slot') actions.push(h('button', { type: 'button', class: 'btn small ghost', onclick: () => confirmModal(app, { title: `Delete slot ${sv.index}?`, text: saveLabel(sv.meta), confirm: 'Delete', danger: true, onConfirm: () => { storage.deleteSave(sv.key); openSaves(app, 'load'); }, onCancel: () => openSaves(app, 'load') }) }, 'Delete'));
    }
    return h('div', { class: 'save-row' },
      sv.meta?.emblem ? h('span', { html: emblemSvg(sv.meta.emblem, sv.meta.color, 22) }) : h('span', { class: 'save-empty' }),
      h('div', {}, h('b', {}, label), h('p', { class: 'small muted' }, saveLabel(sv.meta), sv.meta?.savedAt ? ` · ${when(sv.meta.savedAt)}` : '')),
      h('div', { class: 'row' }, ...actions));
  });
  app.openModal(h('div', { class: 'stack' },
    h('h2', {}, mode === 'save' ? 'Save game' : 'Load game'),
    rows.length ? h('div', { class: 'save-list' }, ...rows) : h('p', { class: 'muted' }, 'No saved games in this browser yet.'),
    mode === 'load' ? h('button', { type: 'button', class: 'btn ghost', onclick: () => openTransfer(app, true) }, 'Import a save file') : null), { label: mode === 'save' ? 'Save game' : 'Load game' });
}

export function openTransfer(app, importOnly = false) {
  const text = h('textarea', { rows: 5, placeholder: 'Paste a save code here', 'aria-label': 'Save code' });
  const file = h('input', { type: 'file', accept: '.json,application/json', 'aria-label': 'Save file' });
  const load = (raw) => {
    try {
      app.loadGame(storage.parseSaveText(raw));
      app.toast('Save loaded.', 'good');
    } catch (e) {
      app.toast(e.message, 'error');
    }
  };
  file.addEventListener('change', () => {
    const f = file.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => load(String(reader.result));
    reader.onerror = () => app.toast("Couldn't read that file.", 'error');
    reader.readAsText(f);
  });
  const exportPart = !importOnly && app.state ? h('section', { class: 'stack' },
    h('h3', {}, 'Export'),
    h('p', { class: 'small muted' }, 'Keep a copy of this game outside the browser, or move it to another computer.'),
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'btn primary', onclick: () => storage.downloadSave(app.state) }, 'Download save file'),
      h('button', { type: 'button', class: 'btn', onclick: async () => {
        const code = storage.saveText(app.state);
        try {
          await navigator.clipboard.writeText(code);
          app.toast('Save code copied to the clipboard.', 'good');
        } catch {
          text.value = code;
          text.select();
          app.toast('Copying was blocked, so the code is in the box below. Press Ctrl+C to copy it.');
        }
      } }, 'Copy save code'))) : null;
  app.openModal(h('div', { class: 'stack' },
    h('h2', {}, importOnly ? 'Import a save' : 'Export or import'),
    exportPart,
    h('section', { class: 'stack' },
      h('h3', {}, 'Import'),
      h('p', { class: 'small muted' }, 'Load a downloaded save file, or paste a save code.'),
      file, text,
      h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn', onclick: () => (text.value.trim() ? load(text.value) : app.toast('Paste a save code first.', 'error')) }, 'Load pasted code')))), { label: 'Export or import' });
}

export function openSettings(app) {
  const st = app.settings;
  const save = () => {
    storage.saveSettings(st);
    setVolume(st.volume, st.muted);
    app.renderer.animSpeed = st.animSpeed;
    app.renderer.showYields = st.showYields;
    app.renderer.dirty = true;
  };
  const volume = h('input', { type: 'range', id: 'set-volume', min: 0, max: 1, step: 0.05, value: st.volume, oninput: (e) => { st.volume = Number(e.target.value); save(); } });
  const check = (id, label, key, after) => h('label', { class: 'check', for: id },
    h('input', { type: 'checkbox', id, checked: !!st[key], onchange: (e) => { st[key] = e.target.checked; save(); if (after) after(); } }), label);
  const speed = h('select', { id: 'set-speed', onchange: (e) => { st.animSpeed = Number(e.target.value); save(); } },
    ...[[0.6, 'Relaxed'], [1, 'Normal'], [2, 'Fast'], [5, 'Very fast']].map(([v, l]) => h('option', { value: v, selected: st.animSpeed === v }, l)));
  const view = h('select', { id: 'set-view', onchange: (e) => { st.view = e.target.value; save(); app.useRenderer(st.view); openSettings(app); } },
    h('option', { value: '3d', selected: st.view !== '2d' }, '3D'),
    h('option', { value: '2d', selected: st.view === '2d' }, 'Classic 2D'));
  const shadows = h('label', { class: 'check', for: 'set-shadows' },
    h('input', { type: 'checkbox', id: 'set-shadows', checked: !!st.shadows, disabled: st.view === '2d', onchange: (e) => { st.shadows = e.target.checked; save(); app.useRenderer(st.view); } }),
    'Shadows (3D map; turn off on slow computers)');
  app.openModal(h('div', { class: 'stack' },
    h('h2', {}, 'Settings'),
    h('div', { class: 'field' }, h('label', { for: 'set-view' }, 'Map view'), view,
      app.webglMissing ? h('small', { class: 'warn-text' }, "This browser can't show 3D graphics, so the classic 2D map is used.") : null),
    shadows,
    h('div', { class: 'field' }, h('label', { for: 'set-volume' }, 'Sound volume'), volume),
    check('set-mute', 'Mute all sound', 'muted'),
    h('div', { class: 'field' }, h('label', { for: 'set-speed' }, 'Animation speed'), speed),
    check('set-next', 'Select the next unit automatically after giving orders', 'autoNext'),
    check('set-yields', 'Show tile yields on your territory (Y)', 'showYields'),
    check('set-hints', 'Show tips for new players', 'hints'),
    h('button', { type: 'button', class: 'btn ghost small', onclick: () => { st.hintsSeen = {}; st.hints = true; save(); app.toast('Tips will show again.', 'good'); } }, 'Show all tips again'),
    h('button', { type: 'button', class: 'btn primary', onclick: () => app.closeModal() }, 'Done')), { label: 'Settings' });
  volume.addEventListener('change', () => sfx.click());
}

export function openHelp(app) {
  const keys = [
    ['Click a unit', 'Select it'], ['Click a highlighted tile', 'Move there, or attack a red tile'], ['Right-click', 'Move or attack with the selected unit'],
    ['Drag / WASD / arrows', 'Pan the map'], ['Scroll / + / −', 'Zoom'], ['Enter', 'End turn, or jump to what needs orders'], ['Shift+Enter', 'End turn anyway'],
    ['Space', 'Skip unit'], ['F', 'Fortify'], ['Z', 'Sleep'], ['B', 'Found city'], ['U', 'Upgrade unit'], ['Tab or .', 'Next unit'], ['C', 'Center on selection'],
    ['T', 'Tech tree'], ['V', 'Civics tree'], ['G', 'Government'], ['P', 'Diplomacy'], ['Y', 'Tile yields'], ['Esc', 'Cancel, deselect, then menu'], ['Delete', 'Disband unit'],
  ];
  app.openModal(h('div', { class: 'stack help' },
    h('h2', {}, 'How to play'),
    h('div', { class: 'help-grid' },
      h('section', {},
        h('h3', {}, 'Winning'),
        h('p', {}, `Capture every rival's original capital for a domination victory, or be first to research Offworld Mission, the last tech of the Future Era, for a science victory. Otherwise the highest score when the turn limit ends wins. You lose if you lose all your cities.`),
        h('h3', {}, 'Technology'),
        h('p', {}, `${TECH_KEYS.length} techs across ${ERAS.length} eras unlock units, buildings, districts and lasting bonuses. Pick any tech in the tree and the techs it needs are researched first. When a better unit is unlocked, the old one can no longer be built; upgrade it for gold inside your borders.`),
        h('h3', {}, 'Civics and government'),
        h('p', {}, `Culture researches ${CIVIC_KEYS.length} civics, the second tree. Civics unlock governments and policy cards. A government has military, economic and wildcard slots; slot cards for bonuses. On any turn you finish a civic, changing government and cards is free. At other times each new card costs gold.`),
        h('h3', {}, 'Cities'),
        h('p', {}, `Settlers found cities at least ${RULES.cityMinDistance} tiles apart. Each citizen works one tile and eats 2 food. Culture grows your borders one tile at a time, and gold can buy tiles or finish production.`),
        h('h3', {}, 'Districts'),
        h('p', {}, 'A district takes its own tile and a city holds one per 3 population. A Campus gets +1 science per neighboring mountain, a Commercial Hub +2 gold next to coast, an Industrial Zone +1 production per neighboring mine, and a Harbor (built on coast) +2 gold next to the city center and +1 per fishing boat. All of them, and the Theater Square, get +1 for every 2 neighboring districts (the city center counts). Encampments speed up military units but cannot sit next to the city center.'),
        h('h3', {}, 'Combat'),
        h('p', {}, 'Damage depends on the strength difference. Hills, forest and fortifying help defenders; wounded units fight weaker. Ranged units take no damage back. Melee units capture a city when its HP reaches 0. Moving from one tile next to an enemy to another costs all remaining moves.'),
        h('h3', {}, 'Diplomacy'),
        h('p', {}, "Everyone starts at peace, and borders are closed in peacetime. Declare war from the Diplomacy screen or by attacking; propose peace there too.")),
      h('section', {},
        h('h3', {}, 'Controls'),
        h('table', { class: 'keys' }, h('tbody', {}, ...keys.map(([k, v]) => h('tr', {}, h('th', {}, k), h('td', {}, v))))),
        h('h3', {}, 'About'),
        h('p', { class: 'small' }, `Hexhold ${VERSION}. An original game inspired by the 4X genre; not affiliated with any other game or publisher. All art is drawn in code. 3D graphics use Three.js (MIT License). Fonts: Marcellus, Instrument Sans and JetBrains Mono, under the SIL Open Font License.`)))), { wide: true, label: 'How to play' });
}

// ---------- game over ----------

export function showGameOver(app) {
  const s = app.state;
  if (!s) return;
  const hid = app.humanId;
  const won = s.victory !== 'defeat' && s.winner === hid;
  const winner = s.players[s.winner];
  const ranked = rankings(s);
  const place = ranked.findIndex((r) => r.id === hid) + 1;
  const ordinal = ['', 'first', 'second', 'third', 'fourth'][place] || `${place}th`;
  const outscored = s.victory === 'score' && !won;
  const title = won ? 'Victory' : outscored ? 'Time is up' : s.victory === 'science' ? 'Outpaced' : 'Defeat';
  const how = {
    domination: won ? 'You hold every original capital. The world is yours.' : `${winner?.name} conquered every capital.`,
    score: won ? `Time ran out and ${s.players[hid].name} leads the world.` : `Time ran out. ${winner?.name} had the highest score and you finished ${ordinal} of ${ranked.length}.`,
    science: won ? 'Your Offworld Mission has launched. The future belongs to you.' : `${winner?.name} launched the Offworld Mission first.`,
    defeat: 'Your last city has fallen.',
  }[s.victory];
  const allPlayers = [...s.players].sort((a, b) => (b.alive ? score(s, b.id) : -1) - (a.alive ? score(s, a.id) : -1));
  const me = scoreBreakdown(s, hid);
  const table = h('table', { class: 'score-table' },
    h('thead', {}, h('tr', {}, h('th', {}, 'Civilization'), h('th', {}, 'Cities'), h('th', {}, 'Techs'), h('th', {}, 'Civics'), h('th', {}, 'Score'))),
    h('tbody', {}, ...allPlayers.map((p) => h('tr', { class: p.id === hid ? 'me' : '' },
      h('td', {}, h('span', { html: emblemSvg(p.emblem, p.color, 16) }), ` ${p.name}${p.alive ? '' : ' (eliminated)'}`),
      h('td', {}, String(citiesOf(s, p.id).length)),
      h('td', {}, String(p.techs.length)),
      h('td', {}, String((p.civics || []).length)),
      h('td', {}, p.alive ? String(score(s, p.id)) : '–')))));
  const breakdown = h('table', { class: 'score-table small' },
    h('tbody', {}, ...me.map((r) => h('tr', {}, h('th', {}, r.label), h('td', {}, String(r.count)), h('td', {}, `${r.points} pts`)))));
  const stats = s.players[hid].stats;
  app.openModal(h('div', { class: `stack gameover ${won ? 'won' : 'lost'}` },
    h('p', { class: 'eyebrow' }, `Turn ${Math.min(s.turn, s.turnLimit + 1) - (s.victory === 'score' ? 1 : 0)} · ${yearLabel(s)}`),
    h('h2', { class: 'big-title' }, title),
    h('p', { class: 'lead' }, how),
    h('div', { class: 'go-grid' },
      h('section', {}, h('h3', {}, 'Standings'), table),
      h('section', {}, h('h3', {}, 'Your score'), breakdown,
        h('p', { class: 'small muted' }, `Units destroyed ${stats.kills} · units lost ${stats.lost} · cities captured ${stats.citiesCaptured}`))),
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'btn primary', onclick: () => { app.closeModal(); showSetup(app); app.hud.hidden = true; } }, 'New game'),
      won ? h('button', { type: 'button', class: 'btn', onclick: () => { app.dispatch({ type: 'keepPlaying' }); app.closeModal(); } }, 'Keep playing') : null,
      h('button', { type: 'button', class: 'btn ghost', onclick: () => app.showTitle() }, 'Title screen'))), { wide: true, label: title, closable: false });
}

export { VERSION };
