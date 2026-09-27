// The game client: owns the current game, turns clicks and keys into actions, runs turns,
// and keeps the map overlays and panels in sync.

import { createGame } from '../core/state.js';
import { applyAction } from '../core/actions.js';
import { finishHumanTurn, playAIRound } from '../core/game.js';
import { runAI } from '../ai/ai.js';
import { UNITS } from '../data/units.js';
import { TECHS } from '../data/techs.js';
import { unitsOf, citiesOf, cityAt, unitsAt, humanId, atWar } from '../core/query.js';
import { reachableTiles, findPath, pathTurns } from '../core/pathfind.js';
import { attackInfo, inRange, cityStrikeInfo } from '../core/combat.js';
import { distance, within, neighbors } from '../core/hex.js';
import { tileYield } from '../core/yields.js';
import { validDistrictTiles, adjacencyBonus } from '../core/placement.js';
import { borderCandidates, buyTileCost, workableTiles, upgradeTarget } from '../core/city.js';
import { allResearched } from '../core/research.js';
import { availableGovernments } from '../core/civics.js';
import { visibleTiles } from '../core/vision.js';
import { RULES } from '../data/rules.js';
import { Renderer } from '../render/renderer.js';
import { Renderer3D, webglAvailable } from '../render/renderer3d.js';
import { Minimap } from '../render/minimap.js';
import { h, clear, fill } from './dom.js';
import { sfx, setVolume, unlockAudio } from './sound.js';
import { HINTS } from './hints.js';
import * as storage from '../save/storage.js';
import { renderTopBar, renderUnitPanel, renderCityPanel, renderEndTurn, renderNotes, tileTooltip, combatTooltip, placementTooltip } from './panels.js';
import { showTitle, openTechTree, openCivicsTree, openGovernment, openHistory, openMenu, showGameOver, confirmModal, openHelp, peaceOfferModal, openDiplomacy } from './screens.js';
import { describeEvent, eventSound } from './events.js';

export const VERSION = '1.4.0';

export class App {
  constructor(root) {
    this.root = root;
    this.settings = storage.loadSettings();
    setVolume(this.settings.volume, this.settings.muted);
    this.state = null;
    this.selection = null;
    this.mode = null;
    this.hover = -1;
    this.busy = false;
    this.notes = [];
    this.hintQueue = [];
    this.keysDown = new Set();
    this.debug = new URLSearchParams(location.search).has('debug');
    this.buildDom();
    this.minimap = new Minimap(this.minimapCanvas, this);
    this.useRenderer(this.settings.view);
    this.bindInput();
    window.addEventListener('resize', () => {
      this.renderer.resize();
      this.renderer.clampCamera();
    });
    requestAnimationFrame((t) => this.tick(t));
  }

  // Picks the 3D map (default) or the classic 2D map. Falls back to 2D when WebGL is missing.
  useRenderer(kind) {
    const prev = this.renderer;
    let next = null;
    this.webglMissing = false;
    if (kind !== '2d') {
      if (webglAvailable()) {
        try {
          next = new Renderer3D(this.stage, { shadows: this.settings.shadows });
        } catch {
          next = null;
        }
      }
      this.webglMissing = !next;
    }
    if (!next) next = new Renderer(this.stage);
    next.animSpeed = this.settings.animSpeed;
    next.showYields = this.settings.showYields;
    next.tileYieldFn = (i) => (this.state ? tileYield(this.state, i, this.humanId) : null);
    next.onDraw = () => this.minimap.draw();
    this.renderer = next;
    const cam = prev ? { ...prev.cam } : null;
    const reveal = prev ? prev.revealAll : false;
    if (prev) prev.destroy();
    const world = this.state || (this.drift ? this.backdrop : null);
    if (world) {
      next.revealAll = this.state ? reveal : true;
      next.setState(world, this.state ? this.humanId : 0);
      if (cam) next.cam = cam;
      next.clampCamera();
      if (this.state) this.refresh();
    }
    this.minimap.dirty = true;
  }

  buildDom() {
    this.stage = document.getElementById('stage');
    if (!this.stage) {
      this.stage = h('div', { id: 'stage' });
      this.root.before(this.stage);
    }
    document.getElementById('map')?.remove();
    this.topbar = h('header', { class: 'topbar' });
    this.notesEl = h('aside', { class: 'notes', 'aria-live': 'polite', 'aria-label': 'Notifications' });
    this.unitPanel = h('section', { class: 'unit-panel panel', hidden: true, 'aria-label': 'Selected unit' });
    this.cityPanel = h('aside', { class: 'city-panel panel', hidden: true, 'aria-label': 'City' });
    this.minimapCanvas = h('canvas', { class: 'minimap', 'aria-label': 'Minimap. Click to move the view.' });
    this.endTurnBtn = h('button', { class: 'endturn', type: 'button' });
    this.corner = h('div', { class: 'corner' }, this.minimapCanvas, this.endTurnBtn);
    this.hintEl = h('div', { class: 'hint panel', hidden: true, role: 'status' });
    this.modeBanner = h('div', { class: 'mode-banner', hidden: true });
    this.busyEl = h('div', { class: 'busy', hidden: true }, h('span', { class: 'spinner', 'aria-hidden': 'true' }), 'Rivals are taking their turns…');
    this.hud = h('div', { class: 'hud', hidden: true }, this.topbar, this.notesEl, this.unitPanel, this.cityPanel, this.corner, this.hintEl, this.modeBanner, this.busyEl);
    this.tooltip = h('div', { class: 'tooltip', hidden: true, role: 'tooltip' });
    this.toasts = h('div', { class: 'toasts', 'aria-live': 'assertive' });
    this.screen = h('div', { class: 'screen', hidden: true });
    this.modalRoot = h('div', { class: 'modal-root' });
    this.root.append(this.hud, this.tooltip, this.toasts, this.screen, this.modalRoot);
    this.endTurnBtn.addEventListener('click', (e) => this.onEndTurnClick(e));
  }

  // ---------- game lifecycle ----------

  get humanId() {
    return this.state ? humanId(this.state) : 0;
  }

  get human() {
    return this.state ? this.state.players[this.humanId] : null;
  }

  showTitle() {
    this.state = null;
    this.selection = null;
    this.mode = null;
    this.hud.hidden = true;
    this.hideTooltip();
    this.closeModal();
    this.titleBackdrop();
    showTitle(this);
  }

  // A lived-in world drifting behind the title screen.
  titleBackdrop() {
    if (!this.backdrop) {
      const demo = createGame({ seed: 20260926, size: 'medium', rivals: 3, allAI: true });
      for (let i = 0; i < 45; i++) playAIRound(demo, runAI);
      this.backdrop = demo;
    }
    this.renderer.revealAll = true;
    this.renderer.setState(this.backdrop, 0);
    this.renderer.overlay = {};
    this.renderer.cam.zoom = 0.85;
    const b = this.renderer.mapBounds();
    this.renderer.cam.x = b.w * 0.3;
    this.renderer.cam.y = b.h * 0.5;
    this.drift = 1;
  }

  startNewGame(opts) {
    this.state = createGame(opts);
    this.enterGame(true);
  }

  loadGame(state) {
    this.state = state;
    this.enterGame(false);
  }

  enterGame(isNew) {
    this.drift = 0;
    this.closeModal();
    this.screen.hidden = true;
    this.hud.hidden = false;
    this.selection = null;
    this.mode = null;
    this.notes = [];
    this.renderer.revealAll = false;
    this.renderer.setState(this.state, this.humanId);
    this.renderer.cam.zoom = 1.05;
    const hid = this.humanId;
    const focus = citiesOf(this.state, hid)[0]?.tile ?? unitsOf(this.state, hid)[0]?.tile ?? 0;
    this.renderer.centerOn(focus, false);
    this.minimap.reset();
    if (isNew) {
      const settler = unitsOf(this.state, hid).find((u) => u.type === 'settler');
      if (settler) this.selectUnit(settler);
      this.showHint('welcome');
      storage.autosave(this.state);
    } else {
      this.selectNextPending({ center: false });
    }
    this.refresh();
    if (this.state.phase === 'ended') setTimeout(() => showGameOver(this), 300);
    else this.checkOffers();
  }

  // ---------- actions ----------

  dispatch(action, { quiet = false } = {}) {
    if (!this.state || this.busy) return { ok: false, reason: 'busy' };
    const r = applyAction(this.state, { ...action, player: this.humanId });
    if (!r.ok) {
      if (!quiet) {
        this.toast(r.reason, 'error');
        sfx.error();
      }
      return r;
    }
    this.handleEvents(r.events);
    const solves = { setProduction: 'production', enqueue: 'production', research: 'research', civic: 'civic', government: 'government', move: 'move', attack: 'move' }[action.type];
    if (solves) this.resolveHint(solves);
    if (this.selection?.kind === 'unit' && !this.state.units[this.selection.id]) this.selection = null;
    if (this.selection?.kind === 'city' && this.state.cities[this.selection.id]?.owner !== this.humanId) this.selection = null;
    this.refresh();
    return r;
  }

  handleEvents(events, rivalsTurn = false) {
    if (!this.state) return;
    this.renderer.animate(events);
    const hid = this.humanId;
    let over = false;
    const sounds = new Set();
    for (const e of events) {
      const note = describeEvent(this.state, e, hid, rivalsTurn);
      if (note) this.addNote(note);
      const snd = eventSound(e, hid, rivalsTurn);
      if (snd) sounds.add(snd);
      if (e.type === 'gameOver') over = true;
      if (e.type === 'tech' && e.player === hid && ['writing', 'currency', 'bronze'].includes(e.tech)) this.showHint('district');
      if (e.type === 'war' && (e.a === hid || e.b === hid)) this.showHint('war');
      if (e.type === 'civic' && e.player === hid && e.civic === 'code') this.showHint('government');
      if (e.type === 'cityFounded' && e.owner === hid) {
        this.resolveHint('welcome');
        this.showHint('production');
      }
    }
    for (const s of sounds) sfx[s]?.();
    this.minimap.dirty = true;
    if (over) {
      setTimeout(() => {
        sfx[this.state.victory === 'defeat' || this.state.winner !== hid ? 'defeat' : 'victory']();
        showGameOver(this);
      }, 700);
    }
  }

  // ---------- selection ----------

  selectedUnit() {
    if (!this.state || this.selection?.kind !== 'unit') return null;
    return this.state.units[this.selection.id] || null;
  }

  selectedCity() {
    if (!this.state || this.selection?.kind !== 'city') return null;
    const c = this.state.cities[this.selection.id];
    return c && c.owner === this.humanId ? c : null;
  }

  selectUnit(u, { center = false, quiet = false } = {}) {
    this.selection = { kind: 'unit', id: u.id };
    this.mode = null;
    if (center && !this.renderer.isOnScreen(u.tile, 140)) this.renderer.centerOn(u.tile);
    if (!quiet) sfx.select();
    if (UNITS[u.type].cls !== 'civilian' && citiesOf(this.state, this.humanId).length) this.showHint('move');
    this.refresh();
  }

  selectCity(c, { center = false } = {}) {
    this.selection = { kind: 'city', id: c.id };
    this.mode = null;
    if (center && !this.renderer.isOnScreen(c.tile, 200)) this.renderer.centerOn(c.tile);
    sfx.select();
    this.refresh();
  }

  deselect() {
    this.selection = null;
    this.mode = null;
    this.refresh();
  }

  pendingUnits() {
    const s = this.state;
    return unitsOf(s, this.humanId).filter((u) => u.moves > 0 && !u.fortified && !u.sleeping && !u.path && u.skipped !== s.turn);
  }

  // What still needs the player's attention this turn, most urgent first.
  nextBlocker(after = null) {
    const s = this.state;
    const units = this.pendingUnits();
    if (units.length) {
      const k = after != null ? units.findIndex((u) => u.id === after) : -1;
      return { kind: 'unit', unit: units[(k + 1) % units.length] };
    }
    const city = citiesOf(s, this.humanId).find((c) => !c.queue.length);
    if (city) return { kind: 'city', city };
    const p = this.human;
    const hasCities = citiesOf(s, this.humanId).length > 0;
    if (!p.research && !allResearched(p) && hasCities) return { kind: 'research' };
    if (!p.civic && hasCities) return { kind: 'civic' };
    if (!p.government && availableGovernments(p).length) return { kind: 'government' };
    return null;
  }

  selectNextPending({ center = true } = {}) {
    const cur = this.selectedUnit();
    const b = this.nextBlocker(cur ? cur.id : null);
    if (!b) {
      this.selection = null;
      this.refresh();
      return;
    }
    if (b.kind === 'unit') this.selectUnit(b.unit, { center, quiet: true });
    else if (b.kind === 'city') this.selectCity(b.city, { center });
    else this.refresh();
  }

  onEndTurnClick(e) {
    unlockAudio();
    if (!this.state || this.busy) return;
    if (this.state.phase === 'ended') {
      showGameOver(this);
      return;
    }
    const b = this.nextBlocker();
    if (!b || e?.shiftKey) {
      this.endTurn();
      return;
    }
    if (b.kind === 'unit') this.selectUnit(b.unit, { center: true });
    else if (b.kind === 'city') this.selectCity(b.city, { center: true });
    else if (b.kind === 'civic') openCivicsTree(this);
    else if (b.kind === 'government') openGovernment(this);
    else openTechTree(this);
  }

  endTurn() {
    if (this.busy || !this.state || this.state.phase === 'ended') return;
    this.busy = true;
    this.mode = null;
    this.hideTooltip();
    this.resolveHint('endTurn');
    this.busyEl.hidden = false;
    this.refresh();
    setTimeout(() => {
      let events;
      try {
        events = finishHumanTurn(this.state, runAI);
      } catch (err) {
        console.error(err);
        this.busy = false;
        this.busyEl.hidden = true;
        this.toast('Something went wrong while the rivals played. Your last autosave is safe; reload it from the menu.', 'error');
        return;
      }
      this.busy = false;
      this.busyEl.hidden = true;
      this.notes = this.notes.filter((n) => n.turn >= this.state.turn - 1);
      this.selection = null;
      this.handleEvents(events, true);
      sfx.turn();
      if (!storage.autosave(this.state)) this.toast("Autosave failed: this browser's storage is full or blocked. Use Menu → Export to keep a copy.", 'error');
      if (this.state.phase !== 'ended') {
        this.selectNextPending({ center: true });
        this.checkOffers();
        if (!this.human.research && citiesOf(this.state, this.humanId).length) this.showHint('research');
        else if (!this.human.civic && citiesOf(this.state, this.humanId).length) this.showHint('civic');
      }
      this.refresh();
    }, 40);
  }

  checkOffers() {
    const offer = this.state?.offers.find((o) => o.to === this.humanId);
    if (offer) peaceOfferModal(this, offer);
  }

  // ---------- orders ----------

  orderUnit(u, tile) {
    const s = this.state;
    const hid = this.humanId;
    const vis = visibleTiles(s, hid);
    const info = vis[tile] ? attackInfo(s, u, tile) : null;
    if (info) {
      if (!info.war) {
        this.confirmWar(info.owner, () => this.orderUnit(this.state.units[u.id] || u, tile));
        return;
      }
      const r = this.dispatch({ type: 'attack', unit: u.id, target: tile });
      if (r.ok) this.afterUnitOrder(u.id);
      return;
    }
    const t = s.map.tiles[tile];
    if (t.owner >= 0 && t.owner !== hid && !atWar(s, hid, t.owner)) {
      this.showHint('borders');
      this.toast(`You can't enter ${s.players[t.owner].name}'s territory while you're at peace.`, 'error');
      sfx.error();
      return;
    }
    const r = this.dispatch({ type: 'move', unit: u.id, to: tile });
    if (r.ok) {
      sfx.move();
      this.afterUnitOrder(u.id);
    }
  }

  unitCommand(type, extra = {}) {
    const u = this.selectedUnit();
    if (!u) return;
    if (type === 'disband') {
      confirmModal(this, {
        title: `Disband this ${UNITS[u.type].name}?`,
        text: 'The unit is removed permanently.',
        confirm: 'Disband',
        danger: true,
        onConfirm: () => {
          if (this.dispatch({ type: 'disband', unit: u.id }).ok) this.selectNextPending();
        },
      });
      return;
    }
    const r = this.dispatch({ type, unit: u.id, ...extra });
    if (!r.ok) return;
    if (type === 'found') sfx.found();
    else if (type === 'improve' || type === 'upgrade') sfx.built();
    else sfx.click();
    if (['skip', 'fortify', 'sleep', 'found', 'improve', 'upgrade'].includes(type)) this.afterUnitOrder(u.id, true);
  }

  afterUnitOrder(id, done = false) {
    const u = this.state.units[id];
    if (!this.settings.autoNext) return;
    if (!u || done || u.moves <= 0) {
      setTimeout(() => {
        if (!this.state || this.busy) return;
        if (!this.selection || this.selection.id === id || !this.state.units[this.selection.id]) this.selectNextPending({ center: true });
      }, 320);
    }
  }

  confirmWar(pid, then) {
    const p = this.state.players[pid];
    confirmModal(this, {
      title: `Declare war on ${p.name}?`,
      text: `You are at peace with ${p.name}. Declaring war opens their borders to your units, and theirs to you. They will remember it.`,
      confirm: 'Declare war',
      danger: true,
      onConfirm: () => {
        if (this.dispatch({ type: 'declareWar', target: pid }).ok && then) then();
      },
    });
  }

  startDistrictPlacement(city, key, append = false) {
    this.mode = { kind: 'district', city: city.id, key, append };
    this.resolveHint('district');
    this.renderer.centerOn(city.tile);
    this.refresh();
  }

  // ---------- map input ----------

  onMapClick(tile, button) {
    if (!this.state || this.busy || tile < 0) return;
    const s = this.state;
    const hid = this.humanId;
    if (this.mode) {
      this.onModeClick(tile, button);
      return;
    }
    const sel = this.selectedUnit();
    if (button === 2) {
      if (sel) this.orderUnit(sel, tile);
      else this.deselect();
      return;
    }
    const city = this.selectedCity();
    if (city && this.cityTool === 'citizens' && workableTiles(s, city).includes(tile)) {
      this.dispatch({ type: 'lockTile', city: city.id, tile });
      return;
    }
    if (sel) {
      const ov = this.renderer.overlay;
      if (tile !== sel.tile && (ov.reach?.has(tile) || ov.targets?.has(tile))) {
        this.orderUnit(sel, tile);
        return;
      }
      if (tile === sel.tile) {
        const others = unitsAt(s, tile).filter((u) => u.owner === hid && u.id !== sel.id);
        if (others.length) this.selectUnit(others[0]);
        else {
          const c = cityAt(s, tile);
          if (c && c.owner === hid) this.selectCity(c);
        }
        return;
      }
    }
    const vis = visibleTiles(s, hid);
    const own = vis[tile] ? unitsAt(s, tile).filter((u) => u.owner === hid) : [];
    if (own.length) {
      const pick = own.find((u) => UNITS[u.type].cls !== 'civilian' && u.moves > 0) || own.find((u) => u.moves > 0) || own[0];
      this.selectUnit(pick);
      return;
    }
    const c = cityAt(s, tile);
    if (c && c.owner === hid) {
      this.selectCity(c);
      return;
    }
    if (sel) {
      this.orderUnit(sel, tile);
      return;
    }
    this.deselect();
  }

  onModeClick(tile, button) {
    const s = this.state;
    const m = this.mode;
    if (button === 2) {
      this.mode = null;
      this.refresh();
      return;
    }
    const city = s.cities[m.city];
    if (!city) {
      this.mode = null;
      return;
    }
    if (m.kind === 'district') {
      if (!validDistrictTiles(s, city, m.key).includes(tile)) {
        this.toast("That tile can't hold this district. Pick a highlighted tile, or press Esc to cancel.", 'error');
        sfx.error();
        return;
      }
      const r = this.dispatch({ type: m.append ? 'enqueue' : 'setProduction', city: city.id, item: { kind: 'district', key: m.key, tile } });
      if (r.ok) {
        sfx.built();
        this.mode = null;
        this.selectCity(city);
      }
    } else if (m.kind === 'buyTile') {
      if (!borderCandidates(s, city).includes(tile)) {
        this.toast('Pick one of the tiles showing a gold price.', 'error');
        return;
      }
      if (this.dispatch({ type: 'buyTile', city: city.id, tile }).ok) sfx.built();
    } else if (m.kind === 'strike') {
      const r = this.dispatch({ type: 'cityStrike', city: city.id, target: tile });
      if (r.ok) {
        sfx.attack();
        this.mode = null;
        this.refresh();
      }
    }
  }

  onHover(tile, x, y) {
    if (tile !== this.hover) {
      this.hover = tile;
      this.updateOverlays(true);
    }
    if (tile < 0 || !this.state) {
      this.hideTooltip();
      return;
    }
    let content = null;
    const sel = this.selectedUnit();
    if (this.mode?.kind === 'district') content = placementTooltip(this, tile);
    else if (sel && this.renderer.overlay.targets?.has(tile)) content = combatTooltip(this, sel, tile);
    if (!content) content = tileTooltip(this, tile);
    this.showTooltip(content, x, y);
  }

  // ---------- overlays & panels ----------

  attackTargets(u) {
    const s = this.state;
    const set = new Set();
    const def = UNITS[u.type];
    if (def.cls === 'civilian' || u.moves <= 0) return set;
    const vis = visibleTiles(s, this.humanId);
    const reach = this.renderer.overlay.reach || new Set();
    const radius = def.cls === 'ranged' ? def.range : def.moves + 1;
    for (const t of within(s.map, u.tile, radius)) {
      if (t === u.tile || !vis[t]) continue;
      const info = attackInfo(s, u, t);
      if (!info) continue;
      if (def.cls === 'ranged') {
        if (inRange(s, u, t)) set.add(t);
      } else if (distance(s.map, u.tile, t) === 1 || neighbors(s.map, t).some((n) => reach.has(n))) set.add(t);
    }
    return set;
  }

  pathPreview(u, tile) {
    const s = this.state;
    const vis = visibleTiles(s, this.humanId);
    const info = vis[tile] ? attackInfo(s, u, tile) : null;
    if (info) {
      if (UNITS[u.type].cls === 'ranged') return inRange(s, u, tile) ? { from: u.tile, tiles: [tile], turns: [0], attack: true } : null;
      const path = findPath(s, u, tile, { attack: true });
      return path ? { from: u.tile, tiles: path, turns: pathTurns(s, u, path), attack: true } : null;
    }
    const path = findPath(s, u, tile);
    return path ? { from: u.tile, tiles: path, turns: pathTurns(s, u, path) } : null;
  }

  updateOverlays(hoverOnly = false) {
    if (!this.state) return;
    const s = this.state;
    const ov = hoverOnly ? { ...this.renderer.overlay } : {};
    ov.hover = this.hover;
    const sel = this.selectedUnit();
    if (sel) {
      ov.selectedUnit = sel.id;
      if (!hoverOnly) {
        ov.reach = sel.moves > 0 ? reachableTiles(s, sel) : null;
        this.renderer.overlay = ov;
        ov.targets = this.attackTargets(sel);
      }
      ov.path = null;
      if (!this.mode && this.hover >= 0 && this.hover !== sel.tile) ov.path = this.pathPreview(sel, this.hover);
      if (!ov.path && sel.path) ov.path = { from: sel.tile, tiles: sel.path, turns: pathTurns(s, sel, sel.path) };
    } else if (!hoverOnly) {
      ov.selectedUnit = null;
    }
    const city = this.selectedCity();
    if (!hoverOnly) {
      if (city) {
        const tiles = [city.tile, ...workableTiles(s, city)];
        ov.cityTiles = tiles;
        ov.worked = new Set(city.worked);
        ov.locked = new Set(city.locked);
        ov.yields = tiles;
      }
      if (this.mode?.kind === 'district') {
        const c = s.cities[this.mode.city];
        const valid = validDistrictTiles(s, c, this.mode.key);
        const scored = valid.map((t) => ({ tile: t, bonus: adjacencyBonus(s, t, this.mode.key) }));
        const best = Math.max(0, ...scored.map((x) => x.bonus));
        ov.placements = scored.map((x) => ({ ...x, best: x.bonus === best && best > 0 }));
        ov.worked = null;
      } else if (this.mode?.kind === 'buyTile') {
        const c = s.cities[this.mode.city];
        const cost = buyTileCost(s, c);
        ov.buyTiles = borderCandidates(s, c).map((t) => ({ tile: t, cost, affordable: this.human.gold >= cost }));
      } else if (this.mode?.kind === 'strike') {
        const c = s.cities[this.mode.city];
        const vis = visibleTiles(s, this.humanId);
        ov.targets = new Set(within(s.map, c.tile, RULES.cityStrikeRange).filter((t) => vis[t] && cityStrikeInfo(s, c, t)?.war));
      }
    }
    this.renderer.overlay = ov;
    this.renderer.dirty = true;
  }

  refresh() {
    if (!this.state) return;
    renderTopBar(this);
    renderUnitPanel(this);
    renderCityPanel(this);
    renderEndTurn(this);
    renderNotes(this);
    this.renderModeBanner();
    this.updateOverlays();
    this.minimap.dirty = true;
    if (!this.busy && this.state.phase === 'playing' && citiesOf(this.state, this.humanId).length && !this.nextBlocker()) this.showHint('endTurn');
  }

  renderModeBanner() {
    const m = this.mode;
    if (!m) {
      this.modeBanner.hidden = true;
      return;
    }
    const text = {
      district: 'Choose a tile for the district. Each highlighted tile shows its bonus.',
      buyTile: 'Click a tile with a price to buy it.',
      strike: 'Choose an enemy unit within 2 tiles to strike.',
    }[m.kind];
    fill(this.modeBanner, h('span', {}, text), h('button', { type: 'button', class: 'btn small', onclick: () => { this.mode = null; this.refresh(); } }, 'Cancel (Esc)'));
    this.modeBanner.hidden = false;
  }

  // ---------- notes, toasts, tooltips, hints ----------

  addNote(note) {
    this.notes.unshift({ ...note, id: Math.random().toString(36).slice(2), turn: this.state.turn });
    if (this.notes.length > 30) this.notes.length = 30;
  }

  toast(text, kind = 'info') {
    const el = h('div', { class: `toast ${kind}` }, text);
    this.toasts.append(el);
    setTimeout(() => el.classList.add('out'), 3600);
    setTimeout(() => el.remove(), 4000);
    while (this.toasts.children.length > 3) this.toasts.firstChild.remove();
  }

  showTooltip(content, x, y) {
    if (!content) {
      this.hideTooltip();
      return;
    }
    fill(this.tooltip, content);
    this.tooltip.hidden = false;
    const r = this.tooltip.getBoundingClientRect();
    let left = x + 18;
    let top = y + 18;
    if (left + r.width > window.innerWidth - 8) left = x - r.width - 14;
    if (top + r.height > window.innerHeight - 8) top = y - r.height - 14;
    this.tooltip.style.left = `${Math.max(8, left)}px`;
    this.tooltip.style.top = `${Math.max(8, top)}px`;
  }

  hideTooltip() {
    this.tooltip.hidden = true;
  }

  showHint(key) {
    if (!this.settings.hints || this.settings.hintsSeen[key] || !HINTS[key]) return;
    if (this.currentHint === key || this.hintQueue.includes(key)) return;
    if (this.currentHint) {
      this.hintQueue.push(key);
      return;
    }
    this.currentHint = key;
    const hint = HINTS[key];
    fill(this.hintEl, 
      h('b', {}, hint.title),
      h('p', {}, hint.text),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn small primary', onclick: () => this.dismissHint() }, 'Got it'),
        h('button', { type: 'button', class: 'link', onclick: () => { this.settings.hints = false; storage.saveSettings(this.settings); this.dismissHint(); } }, 'Turn off tips')),
    );
    this.hintEl.hidden = false;
  }

  // The player did what a tip asks, so it never needs to show (or can close now).
  resolveHint(key) {
    this.hintQueue = this.hintQueue.filter((k) => k !== key);
    if (this.currentHint === key) this.dismissHint();
    else if (!this.settings.hintsSeen[key]) {
      this.settings.hintsSeen[key] = true;
      storage.saveSettings(this.settings);
    }
  }

  dismissHint() {
    if (this.currentHint) this.settings.hintsSeen[this.currentHint] = true;
    storage.saveSettings(this.settings);
    this.currentHint = null;
    this.hintEl.hidden = true;
    const next = this.hintQueue.shift();
    if (next) this.showHint(next);
  }

  // ---------- modals ----------

  openModal(content, { wide = false, full = false, label = 'Dialog', onClose = null, closable = true } = {}) {
    this.closeModal();
    this.hideTooltip();
    const closeBtn = closable ? h('button', { type: 'button', class: 'modal-close', 'aria-label': 'Close', html: '<svg viewBox="0 0 16 16" width="16" height="16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>', onclick: () => this.closeModal() }) : null;
    const dialog = h('div', { class: `modal${wide ? ' wide' : ''}${full ? ' full' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': label }, closeBtn, content);
    const backdrop = h('div', { class: 'backdrop', onclick: (e) => { if (e.target === backdrop && closable) this.closeModal(); } }, dialog);
    this.modalRoot.append(backdrop);
    this.modal = { el: backdrop, onClose, closable };
    const focusable = dialog.querySelector('[autofocus], button.primary, button, input');
    if (focusable) setTimeout(() => focusable.focus(), 30);
    return dialog;
  }

  closeModal() {
    if (!this.modal) return;
    const { el, onClose } = this.modal;
    this.modal = null;
    el.remove();
    if (onClose) onClose();
  }

  // ---------- input ----------

  bindInput() {
    const c = this.stage;
    let down = null;
    let pinch = null;
    const pointers = new Map();
    c.addEventListener('pointerdown', (e) => {
      unlockAudio();
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) };
        down = null;
        return;
      }
      c.setPointerCapture(e.pointerId);
      down = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, button: e.button, moved: false, id: e.pointerId };
    });
    c.addEventListener('pointermove', (e) => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.renderer.zoomAt(d / pinch.dist, (a.x + b.x) / 2, (a.y + b.y) / 2);
        pinch.dist = d;
        return;
      }
      if (down && down.id === e.pointerId) {
        if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) down.moved = true;
        if (down.moved) {
          this.renderer.panBy(e.clientX - down.lastX, e.clientY - down.lastY);
          this.hideTooltip();
        }
        down.lastX = e.clientX;
        down.lastY = e.clientY;
        return;
      }
      if (this.state && e.pointerType === 'mouse') this.onHover(this.renderer.tileAt(e.clientX, e.clientY), e.clientX, e.clientY);
    });
    const end = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (!down || down.id !== e.pointerId) return;
      const d = down;
      down = null;
      if (!d.moved && e.type === 'pointerup') this.onMapClick(this.renderer.tileAt(e.clientX, e.clientY), d.button);
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('pointerleave', () => {
      if (!down) {
        this.hover = -1;
        this.hideTooltip();
        if (this.state) this.updateOverlays(true);
      }
    });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (!this.state && !this.drift) return;
      this.renderer.zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX, e.clientY);
      this.hideTooltip();
    }, { passive: false });
    window.addEventListener('keydown', (e) => this.onKey(e));
    window.addEventListener('keyup', (e) => this.keysDown.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keysDown.clear());
  }

  onKey(e) {
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    if (this.modal) {
      if (e.key === 'Escape' && this.modal.closable) this.closeModal();
      return;
    }
    if (!this.state || !this.screen.hidden) return;
    const key = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        this.keysDown.add(key);
        e.preventDefault();
      }
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const u = this.selectedUnit();
    switch (key) {
      case 'enter':
        e.preventDefault();
        this.onEndTurnClick(e);
        break;
      case 'escape':
        if (this.mode) {
          this.mode = null;
          this.refresh();
        } else if (this.selection) this.deselect();
        else openMenu(this);
        break;
      case ' ':
        e.preventDefault();
        if (u) this.unitCommand('skip');
        break;
      case 'f':
        if (u) this.unitCommand('fortify');
        break;
      case 'z':
        if (u) this.unitCommand('sleep');
        break;
      case 'b':
        if (u && u.type === 'settler') this.unitCommand('found');
        break;
      case 'u':
        if (u && upgradeTarget(this.state, u)) this.unitCommand('upgrade');
        break;
      case 't':
        openTechTree(this);
        break;
      case 'v':
        openCivicsTree(this);
        break;
      case 'g':
        openGovernment(this);
        break;
      case 'r':
        openHistory(this);
        break;
      case 'y':
        this.settings.showYields = !this.settings.showYields;
        this.renderer.showYields = this.settings.showYields;
        storage.saveSettings(this.settings);
        this.renderer.dirty = true;
        break;
      case '.':
      case 'tab':
        e.preventDefault();
        this.selectNextPending({ center: true });
        break;
      case 'c':
        if (u) this.renderer.centerOn(u.tile);
        else if (this.selectedCity()) this.renderer.centerOn(this.selectedCity().tile);
        break;
      case 'delete':
        if (u) this.unitCommand('disband');
        break;
      case '?':
      case 'h':
        openHelp(this);
        break;
      case 'p':
        openDiplomacy(this);
        break;
      case '+':
      case '=':
        this.renderer.zoomAt(1.15);
        break;
      case '-':
        this.renderer.zoomAt(1 / 1.15);
        break;
      case '`':
        if (this.debug) {
          this.renderer.revealAll = !this.renderer.revealAll;
          this.renderer.dirty = true;
        }
        break;
      default:
    }
  }

  tick() {
    if (this.keysDown.size && this.state) {
      const speed = 14;
      let dx = 0;
      let dy = 0;
      for (const k of this.keysDown) {
        if (k === 'a' || k === 'arrowleft') dx += speed;
        if (k === 'd' || k === 'arrowright') dx -= speed;
        if (k === 'w' || k === 'arrowup') dy += speed;
        if (k === 's' || k === 'arrowdown') dy -= speed;
      }
      if (dx || dy) this.renderer.panBy(dx, dy);
    }
    if (this.drift && !this.state) {
      const r = this.renderer;
      const b = r.mapBounds();
      r.cam.x += 0.25 * this.drift;
      if (r.cam.x > b.w * 0.7) this.drift = -1;
      if (r.cam.x < b.w * 0.3) this.drift = 1;
      r.dirty = true;
    }
    requestAnimationFrame((t) => this.tick(t));
  }
}

export { TECHS, clear };
