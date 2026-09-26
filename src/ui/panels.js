// Always-on interface: top bar, unit panel, city panel, End Turn button, notifications, tooltips.

import { UNITS } from '../data/units.js';
import { BUILDINGS } from '../data/buildings.js';
import { DISTRICTS } from '../data/districts.js';
import { TERRAIN, IMPROVEMENTS, RESOURCES, improvementValid } from '../data/terrain.js';
import { maxMoves } from '../core/effects.js';
import { TECHS, eraOf } from '../data/techs.js';
import { RULES } from '../data/rules.js';
import { cityAt, unitsAt, owningCity, hasTech, atWar, yearLabel } from '../core/query.js';
import { playerYields, cityYields, tileYield } from '../core/yields.js';
import { foundReason, growthThreshold, borderThreshold, buildOptions, turnsLeft, buyCost, itemName, itemCost, cityMaxHp, borderCandidates, buyTileCost, cityHasStrike, upgradeTarget, upgradeCost } from '../core/city.js';
import { adjacencyBonus, adjacencyReasons, districtLimit } from '../core/placement.js';
import { techCost, techName, turnsToResearch } from '../core/research.js';
import { moveCost, passable } from '../core/pathfind.js';
import { attackInfo, cityCanStrike, cityDefense, defenseOf } from '../core/combat.js';
import { visibleTiles } from '../core/vision.js';
import { within } from '../core/hex.js';
import { h, clear, fill, icon, emblemSvg, yieldChip, bar, fmt, signed, YIELD_COLORS } from './dom.js';
import { openTechTree, openDiplomacy, openMenu, openHelp } from './screens.js';

// ---------- top bar ----------

export function renderTopBar(app) {
  const s = app.state;
  const p = app.human;
  const y = playerYields(s, p.id);
  const research = p.research;
  let researchEl;
  if (research) {
    const cost = techCost(research);
    const have = p.progress[research] || 0;
    const turns = turnsToResearch(p, research, y.science);
    researchEl = h('button', { type: 'button', class: 'tb-research', title: 'Open the tech tree (T)', onclick: () => openTechTree(app) },
      h('span', { html: icon('science') }),
      h('span', { class: 'tb-research-body' },
        h('span', { class: 'tb-research-name' }, techName(research), h('small', {}, Number.isFinite(turns) ? ` · ${turns} turn${turns === 1 ? '' : 's'}` : '')),
        bar(have / cost, YIELD_COLORS.science, 'Research progress')));
  } else {
    researchEl = h('button', { type: 'button', class: 'tb-research needs', onclick: () => openTechTree(app) }, h('span', { html: icon('science') }), 'Choose research');
  }
  const hasCities = y.science > 0;
  fill(app.topbar, 
    h('div', { class: 'tb-civ', title: `You lead ${p.name}` }, h('span', { html: emblemSvg(p.emblem, p.color, 20) }), h('b', {}, p.name)),
    h('div', { class: 'tb-yields' },
      yieldChip('science', y.science, { signed: true, title: 'Science per turn' }),
      yieldChip('culture', y.culture, { signed: true, title: 'Culture per turn' }),
      h('span', { class: 'yield y-gold', title: `Gold ${Math.floor(p.gold)}. ${signed(y.goldNet)} per turn after ${y.upkeep} gold of unit upkeep.` },
        h('span', { html: icon('gold') }), h('b', {}, String(Math.floor(p.gold))), hasCities ? h('small', {}, `${signed(y.goldNet)}`) : null)),
    researchEl,
    h('div', { class: 'tb-turn', title: `Game ends after turn ${s.turnLimit}` }, h('b', {}, `Turn ${s.turn}`), h('small', {}, ` / ${s.turnLimit} · ${yearLabel(s)} · ${eraOf(p.techs).name} Era`)),
    h('nav', { class: 'tb-actions', 'aria-label': 'Game menus' },
      h('button', { type: 'button', class: 'btn ghost', onclick: () => openTechTree(app), title: 'Tech tree (T)' }, 'Tech'),
      h('button', { type: 'button', class: 'btn ghost', onclick: () => openDiplomacy(app), title: 'Diplomacy (P)' }, 'Diplomacy'),
      h('button', { type: 'button', class: 'btn ghost', onclick: () => openHelp(app), title: 'How to play (H)' }, 'Help'),
      h('button', { type: 'button', class: 'btn ghost icon-btn', onclick: () => openMenu(app), title: 'Menu (Esc)', 'aria-label': 'Menu', html: icon('menu') })),
  );
}

// ---------- unit panel ----------

function improveReason(s, u, kind) {
  const tile = s.map.tiles[u.tile];
  const imp = IMPROVEMENTS[kind];
  if (tile.owner !== u.owner) return 'Only inside your borders';
  if (tile.district || cityAt(s, u.tile)) return "Cities and districts can't be improved";
  if (!hasTech(s, u.owner, imp.tech)) return `Needs ${TECHS[imp.tech].name}`;
  if (!improvementValid(tile, kind)) return imp.hint;
  if (tile.imp === kind) return 'Already built here';
  return null;
}

export function renderUnitPanel(app) {
  const panel = app.unitPanel;
  const u = app.selectedUnit();
  if (!u || u.owner !== app.humanId) {
    panel.hidden = true;
    return;
  }
  const s = app.state;
  const def = UNITS[u.type];
  const p = s.players[u.owner];
  const actions = [];
  const add = (label, key, onclick, reason = null, cls = '') => actions.push({ label, key, onclick, reason, cls });
  if (u.type === 'settler') add('Found city', 'B', () => app.unitCommand('found'), u.moves <= 0 ? 'No moves left this turn' : foundReason(s, u.owner, u.tile), 'primary');
  if (u.type === 'builder') {
    add('Build farm', null, () => app.unitCommand('improve', { kind: 'farm' }), u.moves <= 0 ? 'No moves left this turn' : improveReason(s, u, 'farm'));
    add('Build mine', null, () => app.unitCommand('improve', { kind: 'mine' }), u.moves <= 0 ? 'No moves left this turn' : improveReason(s, u, 'mine'));
    if (hasTech(s, u.owner, IMPROVEMENTS.lumbermill.tech)) add('Build lumber mill', null, () => app.unitCommand('improve', { kind: 'lumbermill' }), u.moves <= 0 ? 'No moves left this turn' : improveReason(s, u, 'lumbermill'));
  }
  const upTo = upgradeTarget(s, u);
  if (upTo) {
    const cost = upgradeCost(u.type, upTo);
    const why = s.map.tiles[u.tile].owner !== u.owner ? 'Only inside your borders' : u.moves <= 0 ? 'No moves left this turn' : p.gold < cost ? `Needs ${cost} gold` : null;
    add(`Upgrade to ${UNITS[upTo].name} (${cost} gold)`, 'U', () => app.unitCommand('upgrade'), why, 'primary');
  }
  if (def.cls !== 'civilian') add(u.fortified ? 'Fortified' : 'Fortify', 'F', () => app.unitCommand('fortify'), u.fortified ? 'Already fortified' : null);
  add('Skip turn', 'Space', () => app.unitCommand('skip'));
  add(u.sleeping ? 'Wake' : 'Sleep', 'Z', () => app.unitCommand(u.sleeping ? 'wake' : 'sleep'));
  if (u.path) add('Cancel orders', null, () => app.unitCommand('cancelOrders'));
  add('Disband', 'Del', () => app.unitCommand('disband'), null, 'danger');

  let status = '';
  if (u.path) status = `Moving to a tile ${u.path.length} step${u.path.length === 1 ? '' : 's'} away.`;
  else if (u.fortified) status = 'Fortified: +4 defense and heals each turn.';
  else if (u.sleeping) status = 'Sleeping until woken.';
  else if (u.moves <= 0) status = 'No moves left this turn.';
  else if (def.cls === 'ranged') status = `Click a red tile within ${def.range} to attack from range.`;
  else if (def.cls !== 'civilian') status = 'Click a tile to move, or a red tile to attack.';
  else status = 'Click a tile to move.';

  const stats = [];
  if (def.strength) stats.push(h('span', { class: 'stat', title: 'Combat strength' }, h('span', { html: icon('strength') }), h('b', {}, String(def.strength + (u.bonus || 0)))));
  if (def.ranged) stats.push(h('span', { class: 'stat', title: `Ranged strength, range ${def.range}` }, h('span', { class: 'ranged-tag' }, 'R'), h('b', {}, `${def.ranged}`), h('small', {}, ` / ${def.range}`)));
  stats.push(h('span', { class: 'stat', title: 'Moves left this turn' }, h('span', { html: icon('moves') }), h('b', {}, fmt(u.moves)), h('small', {}, ` / ${fmt(maxMoves(s, u))}`)));
  if (u.charges != null) stats.push(h('span', { class: 'stat', title: 'Uses left' }, h('b', {}, String(u.charges)), h('small', {}, ' uses')));

  fill(panel, 
    h('div', { class: 'up-head' },
      h('span', { class: 'up-emblem', html: emblemSvg(p.emblem, p.color, 22) }),
      h('div', {}, h('h2', {}, def.name), h('p', { class: 'muted small' }, def.info))),
    h('div', { class: 'up-stats' }, ...stats),
    h('div', { class: 'up-hp' }, h('span', { class: 'small muted' }, `Health ${u.hp}/100`), bar(u.hp / 100, u.hp > 60 ? '#5CC46A' : u.hp > 30 ? '#E8C24A' : '#E0564A', 'Health')),
    h('p', { class: 'small up-status' }, status),
    h('div', { class: 'up-actions' }, ...actions.map((a) => h('button', {
      type: 'button',
      class: `btn ${a.cls}`,
      disabled: !!a.reason,
      title: a.reason || (a.key ? `Shortcut: ${a.key}` : ''),
      onclick: a.onclick,
    }, a.label, a.key ? h('kbd', {}, a.key) : null))),
    actions.some((a) => a.reason && a.cls === 'primary') ? h('p', { class: 'small warn-text' }, actions.find((a) => a.cls === 'primary').reason) : null,
  );
  panel.hidden = false;
}

// ---------- city panel ----------

const KIND_LABEL = { district: 'Districts', building: 'Buildings', unit: 'Units' };

export function renderCityPanel(app) {
  const panel = app.cityPanel;
  const c = app.selectedCity();
  if (!c) {
    panel.hidden = true;
    app.cityTool = null;
    return;
  }
  const s = app.state;
  const p = app.human;
  const scroller = panel.querySelector('.cp-scroll');
  const scrollTop = scroller ? scroller.scrollTop : 0;
  const y = cityYields(s, c);
  const growTh = growthThreshold(c.pop);
  const growTurns = y.surplus > 0 ? Math.ceil((growTh - c.food) / y.surplus) : null;
  const bTh = borderThreshold(c);
  const bTurns = y.culture > 0 ? Math.max(1, Math.ceil((bTh - c.culture) / y.culture)) : null;
  const maxHp = cityMaxHp(s, c);
  const item = c.queue[0];

  const head = h('div', { class: 'cp-head' },
    h('div', { class: 'cp-title' },
      h('span', { class: 'cp-pop', title: 'Population' }, String(c.pop)),
      h('div', {},
        h('h2', {}, c.name, c.capital ? h('span', { class: 'capital', title: 'Capital' }, ' ★') : null),
        h('p', { class: 'small muted' }, `${c.districts.length} of ${districtLimit(c)} districts · ${c.buildings.length} buildings${c.hp < maxHp ? ` · ${Math.round(c.hp)}/${maxHp} HP` : ''}`))),
    h('div', { class: 'cp-head-actions' },
      h('button', { type: 'button', class: 'btn ghost small', onclick: () => renameCity(app, c) }, 'Rename'),
      h('button', { type: 'button', class: 'modal-close inline', 'aria-label': 'Close city', html: icon('close'), onclick: () => app.deselect() })));

  const yields = h('div', { class: 'cp-yields' },
    yieldChip('food', y.surplus, { signed: true, title: `Food: ${fmt(y.food)} produced, ${fmt(y.eaten)} eaten` }),
    yieldChip('prod', y.prod, { title: 'Production' }),
    yieldChip('gold', y.gold, { title: 'Gold' }),
    yieldChip('science', y.science, { title: 'Science' }),
    yieldChip('culture', y.culture, { title: 'Culture' }));

  const growText = y.surplus < 0 ? 'Starving: shrinks when food runs out' : growTurns ? `Grows in ${growTurns} turn${growTurns === 1 ? '' : 's'}` : 'Not growing';
  const bars = h('div', { class: 'cp-bars' },
    h('div', {}, h('div', { class: 'row-between small' }, h('span', {}, 'Growth'), h('span', { class: 'muted' }, `${fmt(c.food)}/${growTh} · ${growText}`)), bar(c.food / growTh, YIELD_COLORS.food, 'Growth')),
    h('div', {}, h('div', { class: 'row-between small' }, h('span', {}, 'Borders'), h('span', { class: 'muted' }, `${fmt(c.culture)}/${bTh}${bTurns ? ` · next tile in ${bTurns}` : ''}`)), bar(c.culture / bTh, YIELD_COLORS.culture, 'Border growth')));

  let current;
  if (item) {
    const cost = itemCost(item);
    const turns = turnsLeft(s, c, item, y);
    const gold = buyCost(c, item);
    current = h('div', { class: 'cp-current' },
      h('div', { class: 'row-between' }, h('b', {}, itemName(item)), h('span', { class: 'small muted' }, Number.isFinite(turns) ? `${turns} turn${turns === 1 ? '' : 's'}` : 'Stalled')),
      bar(Math.min(1, c.prodStock / cost), YIELD_COLORS.prod, 'Production progress'),
      h('div', { class: 'row-between small' },
        h('span', { class: 'muted' }, `${fmt(Math.min(c.prodStock, cost), 0)}/${cost}`),
        h('button', { type: 'button', class: 'btn small', disabled: p.gold < gold, title: p.gold < gold ? `Needs ${gold} gold` : 'Finish it now', onclick: () => app.dispatch({ type: 'buy', city: c.id }) }, h('span', { html: icon('gold') }), ` Buy for ${gold}`)),
      item.key === 'settler' && c.pop < RULES.settlerMinPop ? h('p', { class: 'small warn-text' }, 'Waits until the city reaches population 2.') : null);
  } else {
    current = h('div', { class: 'cp-current empty' }, h('b', {}, 'Nothing in production'), h('p', { class: 'small muted' }, 'Pick something below. Production builds up meanwhile.'));
  }

  const queue = c.queue.length > 1 ? h('ol', { class: 'cp-queue' }, ...c.queue.slice(1).map((q, k) => h('li', {},
    h('span', {}, itemName(q)),
    h('button', { type: 'button', class: 'link', onclick: () => app.dispatch({ type: 'dequeue', city: c.id, index: k + 1 }) }, 'Remove')))) : null;

  const opts = buildOptions(s, c);
  const groups = ['district', 'building', 'unit'].map((kind) => {
    const list = opts.filter((o) => o.kind === kind);
    if (!list.length) return null;
    return h('section', { class: 'cp-group' }, h('h3', {}, KIND_LABEL[kind]), ...list.map((o) => optionRow(app, c, o, y)));
  });

  const tools = [];
  tools.push(h('button', { type: 'button', class: `btn small${app.cityTool === 'citizens' ? ' active' : ''}`, title: 'Click tiles on the map to lock or unlock a citizen there', onclick: () => { app.cityTool = app.cityTool === 'citizens' ? null : 'citizens'; app.refresh(); } }, 'Manage citizens'));
  const canBuy = borderCandidates(s, c).length > 0;
  tools.push(h('button', { type: 'button', class: 'btn small', disabled: !canBuy, title: canBuy ? `Tiles cost ${buyTileCost(s, c)} gold` : 'No tiles to buy', onclick: () => { app.mode = { kind: 'buyTile', city: c.id }; app.refresh(); } }, 'Buy tiles'));
  if (cityHasStrike(c)) {
    const vis = visibleTiles(s, app.humanId);
    const targets = within(s.map, c.tile, RULES.cityStrikeRange).some((t) => vis[t] && unitsAt(s, t).some((u) => atWar(s, c.owner, u.owner) && UNITS[u.type].cls !== 'civilian'));
    tools.push(h('button', { type: 'button', class: 'btn small danger', disabled: !cityCanStrike(s, c) || !targets, title: !cityCanStrike(s, c) ? 'Already struck this turn' : targets ? 'Strike an enemy unit within 2 tiles' : 'No enemies in range', onclick: () => { app.mode = { kind: 'strike', city: c.id }; app.refresh(); } }, 'Strike'));
  }

  const built = c.buildings.length || c.districts.length ? h('div', { class: 'cp-built' },
    ...c.districts.map((t) => { const k = s.map.tiles[t].district; const ty = tileYield(s, t); const val = DISTRICTS[k].yield ? ` +${fmt(ty[DISTRICTS[k].yield])}` : ''; return h('span', { class: 'chip district', title: DISTRICTS[k].info }, `${DISTRICTS[k].name}${val}`); }),
    ...c.buildings.map((b) => h('span', { class: 'chip', title: BUILDINGS[b].info }, BUILDINGS[b].name))) : null;

  fill(panel, head, h('div', { class: 'cp-scroll' },
    yields, bars,
    h('h3', { class: 'cp-label' }, 'Production'), current, queue,
    h('div', { class: 'cp-tools' }, ...tools),
    app.cityTool === 'citizens' ? h('p', { class: 'small muted' }, 'Click a tile in the city to lock a citizen there (gold ring). Click again to unlock.') : null,
    ...groups,
    built ? h('h3', { class: 'cp-label' }, 'Built here') : null, built));
  panel.hidden = false;
  const newScroller = panel.querySelector('.cp-scroll');
  if (newScroller) newScroller.scrollTop = scrollTop;
}

function optionRow(app, c, o, y) {
  const s = app.state;
  const item = { kind: o.kind, key: o.key };
  const inQueue = c.queue.findIndex((q) => q.kind === o.kind && q.key === o.key);
  const current = inQueue === 0;
  const turns = turnsLeft(s, c, item, y, current ? c.prodStock : c.queue.length ? 0 : c.prodStock);
  const disabled = !!o.reason && inQueue < 0;
  const choose = (append) => {
    if (o.kind === 'district' && inQueue < 0) app.startDistrictPlacement(c, o.key, append);
    else app.dispatch({ type: append ? 'enqueue' : 'setProduction', city: c.id, item });
  };
  return h('div', { class: `opt${current ? ' current' : ''}${disabled ? ' disabled' : ''}` },
    h('button', { type: 'button', class: 'opt-main', disabled, title: o.reason || o.info || '', onclick: (e) => choose(e.shiftKey) },
      h('span', { class: 'opt-name' }, o.name, o.kind === 'district' ? h('small', { class: 'tag' }, 'district') : null),
      h('span', { class: 'opt-meta' }, o.reason && inQueue < 0 ? h('small', { class: 'warn-text' }, o.reason) : h('small', { class: 'muted' }, `${Number.isFinite(turns) ? turns : '–'} turns`), h('small', { class: 'cost' }, String(o.cost)))),
    h('button', { type: 'button', class: 'opt-add', disabled: disabled || c.queue.length >= RULES.maxQueue, title: 'Add to the end of the queue', 'aria-label': `Queue ${o.name}`, onclick: () => choose(true) }, '+'));
}

function renameCity(app, c) {
  const input = h('input', { type: 'text', value: c.name, maxlength: 24, 'aria-label': 'City name', autofocus: true });
  const form = h('form', { class: 'stack', onsubmit: (e) => { e.preventDefault(); if (app.dispatch({ type: 'rename', city: c.id, name: input.value }).ok) app.closeModal(); } },
    h('h2', {}, 'Rename city'), input,
    h('div', { class: 'row' }, h('button', { type: 'submit', class: 'btn primary' }, 'Rename'), h('button', { type: 'button', class: 'btn', onclick: () => app.closeModal() }, 'Cancel')));
  app.openModal(form, { label: 'Rename city' });
  setTimeout(() => input.select(), 40);
}

// ---------- end turn ----------

export function renderEndTurn(app) {
  const btn = app.endTurnBtn;
  const s = app.state;
  let label = 'End turn';
  let sub = 'Enter';
  let cls = 'endturn';
  if (app.busy) {
    label = 'Rivals moving…';
    sub = '';
    cls += ' waiting';
  } else if (s.phase === 'ended') {
    label = 'Game over';
    sub = 'See results';
  } else {
    const b = app.nextBlocker();
    if (b?.kind === 'unit') {
      label = 'Unit needs orders';
      sub = 'Shift+Enter ends the turn anyway';
      cls += ' blocked';
    } else if (b?.kind === 'city') {
      label = 'Choose production';
      sub = b.city.name;
      cls += ' blocked';
    } else if (b?.kind === 'research') {
      label = 'Choose research';
      sub = 'Opens the tech tree';
      cls += ' blocked';
    }
  }
  btn.className = cls;
  btn.disabled = app.busy;
  fill(btn, h('b', {}, label), sub ? h('small', {}, sub) : null);
}

// ---------- notifications ----------

export function renderNotes(app) {
  const el = app.notesEl;
  clear(el);
  const notes = app.notes.slice(0, 6);
  for (const n of notes) {
    const open = () => {
      if (n.open === 'tech') openTechTree(app);
      else if (n.open === 'diplomacy') openDiplomacy(app);
      else if (n.city != null && app.state.cities[n.city]?.owner === app.humanId) app.selectCity(app.state.cities[n.city], { center: true });
      else if (n.tile != null) app.renderer.centerOn(n.tile);
    };
    el.append(h('div', { class: `note ${n.kind}` },
      h('button', { type: 'button', class: 'note-body', onclick: open }, n.icon ? h('span', { html: icon(n.icon) }) : null, h('span', {}, n.text)),
      h('button', { type: 'button', class: 'note-x', 'aria-label': 'Dismiss', html: icon('close'), onclick: () => { app.notes = app.notes.filter((x) => x !== n); renderNotes(app); } })));
  }
  if (app.notes.length > 1) el.append(h('button', { type: 'button', class: 'link small notes-clear', onclick: () => { app.notes = []; renderNotes(app); } }, 'Clear all'));
}

// ---------- tooltips ----------

function yieldRow(y) {
  const keys = ['food', 'prod', 'gold', 'science', 'culture'].filter((k) => y[k]);
  if (!keys.length) return h('span', { class: 'muted small' }, 'No yields');
  return h('span', { class: 'tt-yields' }, ...keys.map((k) => yieldChip(k, y[k])));
}

export function tileTooltip(app, i) {
  const s = app.state;
  const hid = app.humanId;
  const p = s.players[hid];
  if (!p.explored[i]) return h('div', {}, h('b', {}, 'Unexplored'), h('p', { class: 'small muted' }, 'Send a unit to see what lies here.'));
  const t = s.map.tiles[i];
  const vis = visibleTiles(s, hid)[i];
  const parts = [TERRAIN[t.t].name];
  if (t.hills) parts.push('Hills');
  if (t.forest) parts.push('Forest');
  const lines = [h('b', {}, parts.join(', '))];
  const city = cityAt(s, i);
  if (city) {
    const owner = s.players[city.owner];
    const dfn = cityDefense(s, city);
    lines.push(h('div', { class: 'tt-city' }, h('span', { html: emblemSvg(owner.emblem, owner.color, 14) }), h('b', {}, city.name), h('span', { class: 'muted' }, ` · ${owner.name} · pop ${city.pop}`)));
    lines.push(h('div', { class: 'small muted' }, `Strength ${dfn.total} · ${Math.round(city.hp)}/${cityMaxHp(s, city)} HP${cityHasStrike(city) ? ' · walls' : ''}`));
  } else if (t.district) {
    const reasons = adjacencyReasons(s, i, t.district);
    lines.push(h('div', {}, `${DISTRICTS[t.district].name} district`));
    lines.push(yieldRow(tileYield(s, i, hid)));
    if (reasons.length) lines.push(h('div', { class: 'small muted' }, reasons.join('. ')));
  } else {
    lines.push(yieldRow(tileYield(s, i, t.owner >= 0 ? t.owner : hid)));
  }
  if (t.res) lines.push(h('div', { class: 'small' }, `${RESOURCES[t.res].name} (bonus resource)`));
  if (t.imp) lines.push(h('div', { class: 'small' }, IMPROVEMENTS[t.imp].name));
  if (t.owner >= 0 && !city) {
    const oc = owningCity(s, i);
    const owner = s.players[t.owner];
    lines.push(h('div', { class: 'small muted' }, `${owner.name} territory${oc ? ` (${oc.name})` : ''}${t.owner !== hid && !atWar(s, hid, t.owner) ? ' · closed to you in peacetime' : ''}`));
  }
  const facts = [];
  if (passable(t)) facts.push(`Move cost ${moveCost(t)}`);
  else if (t.t === 'mountain') facts.push('Impassable');
  else facts.push('Water');
  const defense = (t.hills ? 3 : 0) + (t.forest ? 3 : 0);
  if (defense) facts.push(`+${defense} defense`);
  lines.push(h('div', { class: 'small muted' }, facts.join(' · ')));
  if (vis) {
    for (const u of unitsAt(s, i)) {
      const owner = s.players[u.owner];
      const def = UNITS[u.type];
      lines.push(h('div', { class: 'tt-unit' }, h('span', { html: emblemSvg(owner.emblem, owner.color, 14) }), h('b', {}, def.name), h('span', { class: 'muted' }, ` · ${owner.name}${def.strength ? ` · strength ${def.strength + (u.bonus || 0)}` : ''}${def.ranged ? ` · ranged ${def.ranged}` : ''} · ${u.hp} HP`)));
    }
  } else if (!city) lines.push(h('div', { class: 'small muted' }, 'Not in sight right now.'));
  return h('div', {}, ...lines);
}

function modList(label, s) {
  return h('div', { class: 'tt-side' },
    h('div', { class: 'row-between' }, h('span', {}, label), h('b', {}, String(s.total))),
    h('div', { class: 'small muted' }, `Base ${s.base}`),
    ...s.mods.map(([name, v]) => h('div', { class: `small ${v >= 0 ? 'good-text' : 'warn-text'}` }, `${name} ${v >= 0 ? '+' : ''}${v}`)));
}

export function combatTooltip(app, u, target) {
  const s = app.state;
  const info = attackInfo(s, u, target);
  if (!info) return null;
  const owner = s.players[info.owner];
  if (info.kind === 'capture') {
    return h('div', {}, h('b', {}, `Capture ${owner.name}'s ${UNITS[info.unit.type].name}`), h('p', { class: 'small muted' }, 'Civilians are captured without a fight.'));
  }
  const targetName = info.kind === 'city' ? info.city.name : `${owner.name} ${UNITS[info.unit.type].name}`;
  const [lo, hi] = info.toTarget;
  const [slo, shi] = info.toSelf;
  const avgDealt = (lo + hi) / 2;
  const avgTaken = (slo + shi) / 2;
  let verdict = 'Even fight';
  let cls = '';
  if (avgDealt >= info.targetHp) {
    verdict = info.kind === 'city' ? (info.captures ? 'Likely capture' : 'Likely to break the defenses') : 'Likely kill';
    cls = 'good-text';
  } else if (avgTaken >= u.hp) {
    verdict = 'Your unit will probably die';
    cls = 'warn-text';
  } else if (avgDealt > avgTaken * 1.3) {
    verdict = 'Favorable';
    cls = 'good-text';
  } else if (avgTaken > avgDealt * 1.3) {
    verdict = 'Unfavorable';
    cls = 'warn-text';
  }
  return h('div', { class: 'tt-combat' },
    h('b', {}, `${info.ranged ? 'Ranged attack' : 'Attack'}: ${targetName}`),
    !info.war ? h('p', { class: 'small warn-text' }, `You are at peace with ${owner.name}. Attacking will ask to declare war.`) : null,
    h('div', { class: 'tt-vs' }, modList('You', info.att), modList(info.kind === 'city' ? 'City' : 'Them', info.def)),
    h('div', { class: 'small' }, `Deals ${lo}–${hi} damage (they have ${Math.round(info.targetHp)} HP)`),
    info.ranged ? h('div', { class: 'small muted' }, 'Ranged attacks take no damage back.') : h('div', { class: 'small' }, `Takes ${slo}–${shi} damage (you have ${u.hp} HP)`),
    h('div', { class: `verdict ${cls}` }, verdict));
}

export function placementTooltip(app, tile) {
  const s = app.state;
  const m = app.mode;
  const placement = app.renderer.overlay.placements?.find((p) => p.tile === tile);
  if (!placement) return h('div', {}, h('b', {}, "Can't place here"), h('p', { class: 'small muted' }, 'Choose one of the highlighted tiles inside this city.'));
  const reasons = adjacencyReasons(s, tile, m.key);
  const def = DISTRICTS[m.key];
  return h('div', {}, h('b', {}, `${def.name} here`),
    def.yield ? h('div', {}, `+${1 + adjacencyBonus(s, tile, m.key)} ${def.yield === 'science' ? 'Science' : 'Gold'} per turn`) : h('div', { class: 'small muted' }, def.info),
    reasons.length ? h('div', { class: 'small muted' }, `Base +1. ${reasons.join('. ')}.`) : def.yield ? h('div', { class: 'small muted' }, 'Base +1, no adjacency bonus here.') : null,
    tileYield(s, tile).food + tileYield(s, tile).prod > 2 ? h('div', { class: 'small warn-text' }, 'Replaces a good tile the city could work.') : null);
}
