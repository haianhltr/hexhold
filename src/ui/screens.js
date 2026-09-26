// Full-screen and modal screens: title, setup, tech tree, diplomacy, menu, saves, settings,
// help, game over, and small confirmation dialogs.

import { CIVS } from '../data/civs.js';
import { TECHS, TECH_KEYS } from '../data/techs.js';
import { UNITS } from '../data/units.js';
import { DIFFICULTY, MAP_SIZES, TURN_LIMITS, RULES } from '../data/rules.js';
import { atWar, haveMet, citiesOf, yearLabel } from '../core/query.js';
import { playerYields } from '../core/yields.js';
import { techCost, techName, canResearchNow, turnsToResearch, researchPath, allResearched } from '../core/research.js';
import { militaryPower } from '../core/diplomacy.js';
import { score, scoreBreakdown, rankings } from '../core/victory.js';
import { seedFromText } from '../core/rng.js';
import * as storage from '../save/storage.js';
import { h, clear, fill, icon, emblemSvg, bar, fmt, YIELD_COLORS } from './dom.js';
import { unlocksOf } from './events.js';
import { setVolume, sfx, unlockAudio } from './sound.js';

const VERSION = '1.0.0';

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
      group('Game length', 'turns', TURN_LIMITS.map((t) => [t, `${t} turns`, t === 60 ? 'About 20 min' : t === 100 ? 'About 40 min' : 'About an hour']), () => opts.turnLimit, (v) => (opts.turnLimit = Number(v)))),
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

// ---------- tech tree ----------

export function openTechTree(app) {
  if (!app.state) return;
  const s = app.state;
  const p = app.human;
  const perTurn = playerYields(s, p.id).science;
  const path = p.researchPath || [];
  const cards = new Map();
  const card = (key) => {
    const t = TECHS[key];
    const done = p.techs.includes(key);
    const current = p.research === key;
    const queued = !current && path.includes(key);
    const available = canResearchNow(p, key);
    const state = done ? 'done' : current ? 'current' : queued ? 'queued' : available ? 'available' : 'locked';
    const turns = done ? null : turnsToResearch(p, key, perTurn);
    const progress = p.progress[key] || 0;
    let status;
    if (done) status = 'Researched';
    else if (current) status = `Researching · ${turns} turn${turns === 1 ? '' : 's'}`;
    else if (queued) status = `Queued · ${turns} turns`;
    else if (available) status = `${Number.isFinite(turns) ? turns : '–'} turns`;
    else status = `Needs ${t.req.filter((r) => !p.techs.includes(r)).map((r) => TECHS[r].name).join(' and ')}`;
    const el = h('button', {
      type: 'button',
      class: `tech ${state}`,
      disabled: done,
      'aria-pressed': current ? 'true' : 'false',
      onclick: () => {
        if (app.dispatch({ type: 'research', tech: key }).ok) {
          sfx.click();
          openTechTree(app);
        }
      },
    },
      h('span', { class: 'tech-name' }, t.name),
      h('span', { class: 'tech-status' }, status),
      current || progress ? bar(progress / techCost(key), YIELD_COLORS.science, 'Progress') : null,
      h('span', { class: 'tech-unlocks' }, ...unlocksOf(key).map((u) => h('span', { class: `chip ${u.kind}` }, u.name))),
      h('span', { class: 'tech-cost' }, `${techCost(key)}`, h('span', { html: icon('science') })));
    cards.set(key, el);
    return el;
  };
  const tiers = [1, 2, 3].map((tier) => h('div', { class: 'tech-col' }, h('h3', {}, ['Ancient', 'Classical', 'Advanced'][tier - 1]),
    ...TECH_KEYS.filter((k) => TECHS[k].tier === tier).map(card)));
  const futureDone = allResearched(p);
  const future = h('div', { class: 'tech-col' }, h('h3', {}, 'Beyond'),
    h('button', { type: 'button', class: `tech ${p.research === 'future' ? 'current' : futureDone ? 'available' : 'locked'}`, disabled: !futureDone, onclick: () => { if (app.dispatch({ type: 'research', tech: 'future' }).ok) openTechTree(app); } },
      h('span', { class: 'tech-name' }, 'Future Tech'),
      h('span', { class: 'tech-status' }, futureDone ? `Repeatable · ${p.future} researched` : 'Research every tech first'),
      h('span', { class: 'tech-unlocks' }, h('span', { class: 'chip effect' }, `+${RULES.score.future} score each`)),
      h('span', { class: 'tech-cost' }, `${techCost('future')}`, h('span', { html: icon('science') }))));
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'tech-lines');
  const grid = h('div', { class: 'tech-grid' }, svg, ...tiers, future);
  const content = h('div', { class: 'stack' },
    h('div', { class: 'row-between' }, h('h2', {}, 'Technologies'), h('span', { class: 'muted small' }, `${fmt(perTurn)} science per turn · ${p.techs.length}/${TECH_KEYS.length} researched`)),
    h('p', { class: 'small muted' }, 'Pick any tech. If it needs earlier techs, those are researched first automatically.'),
    h('div', { class: 'tech-scroll' }, grid));
  app.openModal(content, { wide: true, label: 'Tech tree' });
  requestAnimationFrame(() => drawTechLines(grid, svg, cards, p));
}

function drawTechLines(grid, svg, cards, p) {
  const base = grid.getBoundingClientRect();
  svg.setAttribute('width', base.width);
  svg.setAttribute('height', base.height);
  let paths = '';
  for (const key of TECH_KEYS) {
    const to = cards.get(key)?.getBoundingClientRect();
    if (!to) continue;
    for (const r of TECHS[key].req) {
      const from = cards.get(r)?.getBoundingClientRect();
      if (!from) continue;
      const x1 = from.right - base.left;
      const y1 = from.top + from.height / 2 - base.top;
      const x2 = to.left - base.left;
      const y2 = to.top + to.height / 2 - base.top;
      const mx = (x1 + x2) / 2;
      const done = p.techs.includes(r);
      paths += `<path d="M${x1} ${y1}C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}" class="${done ? 'done' : ''}"/>`;
    }
  }
  svg.innerHTML = paths;
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
  app.openModal(h('div', { class: 'stack' },
    h('h2', {}, 'Settings'),
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
    ['Space', 'Skip unit'], ['F', 'Fortify'], ['Z', 'Sleep'], ['B', 'Found city'], ['Tab or .', 'Next unit'], ['C', 'Center on selection'],
    ['T', 'Tech tree'], ['P', 'Diplomacy'], ['Y', 'Tile yields'], ['Esc', 'Cancel, deselect, then menu'], ['Delete', 'Disband unit'],
  ];
  app.openModal(h('div', { class: 'stack help' },
    h('h2', {}, 'How to play'),
    h('div', { class: 'help-grid' },
      h('section', {},
        h('h3', {}, 'Winning'),
        h('p', {}, `Capture every rival's original capital for a domination victory. Otherwise the highest score when the turn limit ends wins. You lose if you lose all your cities.`),
        h('h3', {}, 'Cities'),
        h('p', {}, `Settlers found cities at least ${RULES.cityMinDistance} tiles apart. Each citizen works one tile and eats 2 food. Culture grows your borders one tile at a time, and gold can buy tiles or finish production.`),
        h('h3', {}, 'Districts'),
        h('p', {}, 'A district takes its own tile and a city holds one per 3 population. A Campus gets +1 science per neighboring mountain, a Commercial Hub +2 gold next to coast, and both get +1 for every 2 neighboring districts (the city center counts). Encampments speed up military units but cannot sit next to the city center.'),
        h('h3', {}, 'Combat'),
        h('p', {}, 'Damage depends on the strength difference. Hills, forest and fortifying help defenders; wounded units fight weaker. Ranged units take no damage back. Melee units capture a city when its HP reaches 0. Moving from one tile next to an enemy to another costs all remaining moves.'),
        h('h3', {}, 'Diplomacy'),
        h('p', {}, "Everyone starts at peace, and borders are closed in peacetime. Declare war from the Diplomacy screen or by attacking; propose peace there too.")),
      h('section', {},
        h('h3', {}, 'Controls'),
        h('table', { class: 'keys' }, h('tbody', {}, ...keys.map(([k, v]) => h('tr', {}, h('th', {}, k), h('td', {}, v))))),
        h('h3', {}, 'About'),
        h('p', { class: 'small' }, `Hexhold ${VERSION}. An original game inspired by the 4X genre; not affiliated with any other game or publisher. All art is drawn in code. Fonts: Marcellus, Instrument Sans and JetBrains Mono, under the SIL Open Font License.`)))), { wide: true, label: 'How to play' });
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
  const title = won ? 'Victory' : outscored ? 'Time is up' : 'Defeat';
  const how = {
    domination: won ? 'You hold every original capital. The world is yours.' : `${winner?.name} conquered every capital.`,
    score: won ? `Time ran out and ${s.players[hid].name} leads the world.` : `Time ran out. ${winner?.name} had the highest score and you finished ${ordinal} of ${ranked.length}.`,
    defeat: 'Your last city has fallen.',
  }[s.victory];
  const allPlayers = [...s.players].sort((a, b) => (b.alive ? score(s, b.id) : -1) - (a.alive ? score(s, a.id) : -1));
  const me = scoreBreakdown(s, hid);
  const table = h('table', { class: 'score-table' },
    h('thead', {}, h('tr', {}, h('th', {}, 'Civilization'), h('th', {}, 'Cities'), h('th', {}, 'Techs'), h('th', {}, 'Score'))),
    h('tbody', {}, ...allPlayers.map((p) => h('tr', { class: p.id === hid ? 'me' : '' },
      h('td', {}, h('span', { html: emblemSvg(p.emblem, p.color, 16) }), ` ${p.name}${p.alive ? '' : ' (eliminated)'}`),
      h('td', {}, String(citiesOf(s, p.id).length)),
      h('td', {}, String(p.techs.length)),
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
