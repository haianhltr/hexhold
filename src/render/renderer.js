// Canvas map renderer: camera, terrain, fog, borders, cities, units, overlays and animations.
// It redraws only when something changed or an animation is running.

import { toPixel, fromPixel, neighbors, neighbor, corner, EDGE_CORNERS, SQRT3 } from '../core/hex.js';
import { UNITS } from '../data/units.js';
import { cityAt, unitsAt, militaryAt, civilianAt } from '../core/query.js';
import { visibleTiles } from '../core/vision.js';
import { cityMaxHp } from '../core/city.js';
import { TERRAIN_COLORS, PARCHMENT, hexPath, drawTerrainDetail, drawResource, drawImprovement, drawDistrict, drawEmblem, drawUnitGlyph, roundRect, withAlpha } from './draw.js';

export const SIZE = 36; // hex size in world pixels (center to corner)
const HEX = hexPath(SIZE);
const HEX_INNER = hexPath(SIZE * 0.9);

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = null;
    this.viewer = 0;
    this.cam = { x: 0, y: 0, zoom: 1 };
    this.camTarget = null;
    this.dirty = true;
    this.anims = [];
    this.overlay = {};
    this.revealAll = false;
    this.showYields = false;
    this.animSpeed = 1;
    this.w = 0;
    this.h = 0;
    this.dpr = 1;
    this.resize();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  setState(state, viewer) {
    this.state = state;
    this.viewer = viewer;
    this.anims = [];
    this.dirty = true;
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.dirty = true;
  }

  // ---------- camera ----------

  mapBounds() {
    const map = this.state.map;
    return { w: SIZE * SQRT3 * (map.w + 0.5), h: SIZE * 1.5 * (map.h - 1) + SIZE * 2 };
  }

  clampCamera() {
    if (!this.state) return;
    const b = this.mapBounds();
    // Let the view overshoot the map edge by at most a quarter of the screen.
    const halfW = this.w / 2 / this.cam.zoom;
    const halfH = this.h / 2 / this.cam.zoom;
    const left = -SIZE;
    const right = b.w - SIZE;
    const top = -SIZE;
    const bottom = b.h - SIZE * 1.5;
    const minX = left + halfW * 0.5;
    const maxX = right - halfW * 0.5;
    const minY = top + halfH * 0.5;
    const maxY = bottom - halfH * 0.5;
    const cx = (left + right) / 2;
    const cy = (top + bottom) / 2;
    this.cam.x = minX > maxX ? cx : Math.max(minX, Math.min(maxX, this.cam.x));
    this.cam.y = minY > maxY ? cy : Math.max(minY, Math.min(maxY, this.cam.y));
  }

  worldToScreen(x, y) {
    return [(x - this.cam.x) * this.cam.zoom + this.w / 2, (y - this.cam.y) * this.cam.zoom + this.h / 2];
  }

  screenToWorld(x, y) {
    return [(x - this.w / 2) / this.cam.zoom + this.cam.x, (y - this.h / 2) / this.cam.zoom + this.cam.y];
  }

  tileAt(sx, sy) {
    if (!this.state) return -1;
    const [wx, wy] = this.screenToWorld(sx, sy);
    return fromPixel(this.state.map, wx, wy, SIZE);
  }

  tileCenter(i) {
    return toPixel(this.state.map, i, SIZE);
  }

  panBy(dx, dy) {
    this.camTarget = null;
    this.cam.x -= dx / this.cam.zoom;
    this.cam.y -= dy / this.cam.zoom;
    this.clampCamera();
    this.dirty = true;
  }

  zoomAt(factor, sx = this.w / 2, sy = this.h / 2) {
    const [wx, wy] = this.screenToWorld(sx, sy);
    this.cam.zoom = Math.max(0.45, Math.min(1.9, this.cam.zoom * factor));
    const [nx, ny] = this.screenToWorld(sx, sy);
    this.cam.x += wx - nx;
    this.cam.y += wy - ny;
    this.clampCamera();
    this.dirty = true;
  }

  centerOn(tile, smooth = true) {
    const [x, y] = this.tileCenter(tile);
    if (smooth) this.camTarget = { x, y };
    else {
      this.cam.x = x;
      this.cam.y = y;
      this.clampCamera();
    }
    this.dirty = true;
  }

  isOnScreen(tile, margin = 60) {
    const [x, y] = this.worldToScreen(...this.tileCenter(tile));
    return x > margin && y > margin && x < this.w - margin && y < this.h - margin;
  }

  // ---------- animation ----------

  // Turns game events into short animations the player can see.
  animate(events, visibleOnly = true) {
    if (!this.state) return;
    const now = performance.now();
    const vis = visibleTiles(this.state, this.viewer);
    const seen = (t) => !visibleOnly || this.revealAll || vis[t];
    const step = 110 / this.animSpeed;
    for (const e of events) {
      if (e.type === 'move' && e.steps.length && (seen(e.from) || e.steps.some(seen))) {
        this.anims.push({ kind: 'move', unit: e.unit, tiles: [e.from, ...e.steps], start: now, dur: step * e.steps.length });
      } else if (e.type === 'combat' && (seen(e.target) || seen(e.from))) {
        this.anims.push({ kind: 'lunge', unit: e.attacker, from: e.from, to: e.target, start: now, dur: 260 / this.animSpeed, ranged: e.ranged });
        if (e.dmgToTarget) this.anims.push({ kind: 'text', tile: e.target, text: `-${e.dmgToTarget}`, color: '#FF6B57', start: now + 120, dur: 1100 });
        if (e.dmgToSelf) this.anims.push({ kind: 'text', tile: e.from, text: `-${e.dmgToSelf}`, color: '#FFB199', start: now + 120, dur: 1100 });
        if (e.ranged) this.anims.push({ kind: 'shot', from: e.from, to: e.target, start: now, dur: 260 / this.animSpeed });
      } else if (e.type === 'cityFounded' && seen(e.tile)) {
        this.anims.push({ kind: 'ring', tile: e.tile, color: this.state.players[e.owner].color, start: now, dur: 700 });
      } else if (e.type === 'border' && seen(e.tile)) {
        this.anims.push({ kind: 'fade', tile: e.tile, color: this.state.players[e.owner].color, start: now, dur: 900 });
      } else if (e.type === 'cityCaptured' && seen(e.tile)) {
        this.anims.push({ kind: 'ring', tile: e.tile, color: this.state.players[e.to].color, start: now, dur: 900 });
      }
    }
    this.dirty = true;
  }

  animating() {
    return this.anims.length > 0;
  }

  // Where a unit should be drawn right now (mid-animation units slide between tiles).
  unitPosition(u, now) {
    for (const a of this.anims) {
      if (a.unit !== u.id || now < a.start) continue;
      if (a.kind === 'move') {
        const t = Math.min(1, (now - a.start) / a.dur);
        const f = t * (a.tiles.length - 1);
        const k = Math.min(a.tiles.length - 2, Math.floor(f));
        const [x1, y1] = this.tileCenter(a.tiles[k]);
        const [x2, y2] = this.tileCenter(a.tiles[k + 1]);
        const u2 = f - k;
        return [x1 + (x2 - x1) * u2, y1 + (y2 - y1) * u2];
      }
      if (a.kind === 'lunge' && !a.ranged) {
        const t = Math.min(1, (now - a.start) / a.dur);
        const [x1, y1] = this.tileCenter(a.from);
        const [x2, y2] = this.tileCenter(a.to);
        const push = Math.sin(t * Math.PI) * 0.35;
        return [x1 + (x2 - x1) * push, y1 + (y2 - y1) * push];
      }
    }
    return this.tileCenter(u.tile);
  }

  // ---------- frame ----------

  loop(now) {
    if (this.camTarget) {
      const dx = this.camTarget.x - this.cam.x;
      const dy = this.camTarget.y - this.cam.y;
      this.cam.x += dx * 0.18;
      this.cam.y += dy * 0.18;
      this.clampCamera();
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) this.camTarget = null;
      this.dirty = true;
    }
    if (this.anims.length) {
      this.anims = this.anims.filter((a) => now < a.start + a.dur);
      this.dirty = true;
    }
    if (this.overlay.selectedUnit != null || this.overlay.pulse) this.dirty = true;
    if (this.dirty && this.state) {
      this.dirty = false;
      this.draw(now);
      if (this.onDraw) this.onDraw();
    }
    requestAnimationFrame(this.loop);
  }

  visibleRange() {
    const map = this.state.map;
    const [x0, y0] = this.screenToWorld(0, 0);
    const [x1, y1] = this.screenToWorld(this.w, this.h);
    const colW = SIZE * SQRT3;
    const rowH = SIZE * 1.5;
    return {
      c0: Math.max(0, Math.floor(x0 / colW) - 1),
      c1: Math.min(map.w - 1, Math.ceil(x1 / colW) + 1),
      r0: Math.max(0, Math.floor(y0 / rowH) - 1),
      r1: Math.min(map.h - 1, Math.ceil(y1 / rowH) + 1),
    };
  }

  draw(now) {
    const { ctx, state } = this;
    const map = state.map;
    const z = this.cam.zoom;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#1B2530';
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.setTransform(this.dpr * z, 0, 0, this.dpr * z, this.dpr * (this.w / 2 - this.cam.x * z), this.dpr * (this.h / 2 - this.cam.y * z));

    const viewer = state.players[this.viewer];
    const explored = this.revealAll ? null : viewer?.explored;
    const vis = this.revealAll ? null : visibleTiles(state, this.viewer);
    const isExplored = (i) => !explored || explored[i];
    const isVisible = (i) => !vis || vis[i];
    const { c0, c1, r0, r1 } = this.visibleRange();
    const tiles = [];
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) tiles.push(r * map.w + c);

    // Terrain.
    for (const i of tiles) {
      const t = map.tiles[i];
      const [x, y] = this.tileCenter(i);
      ctx.save();
      ctx.translate(x, y);
      if (!isExplored(i)) {
        ctx.fillStyle = PARCHMENT;
        ctx.fill(HEX);
        ctx.strokeStyle = 'rgba(140,115,75,.22)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let k = -2; k <= 2; k++) {
          ctx.moveTo(k * SIZE * 0.3 - SIZE * 0.2, SIZE * 0.4);
          ctx.lineTo(k * SIZE * 0.3 + SIZE * 0.2, -SIZE * 0.4);
        }
        ctx.stroke();
        ctx.restore();
        continue;
      }
      ctx.fillStyle = TERRAIN_COLORS[t.t];
      ctx.fill(HEX);
      if (t.hills && t.t !== 'mountain') {
        ctx.fillStyle = 'rgba(90,70,30,.14)';
        ctx.fill(HEX);
      }
      ctx.strokeStyle = 'rgba(0,0,0,.10)';
      ctx.lineWidth = 1;
      ctx.stroke(HEX);
      if (t.imp) drawImprovement(ctx, t.imp, SIZE);
      if (!t.district && !cityAt(state, i)) drawTerrainDetail(ctx, t, i, SIZE);
      if (t.district) drawDistrict(ctx, t.district, SIZE);
      if (t.res && !t.district) drawResource(ctx, t.res, SIZE * 0.45, SIZE * 0.42, SIZE * 0.22);
      if (!isVisible(i)) {
        ctx.fillStyle = 'rgba(52,40,22,.42)';
        ctx.fill(HEX);
      }
      ctx.restore();
    }

    this.drawBorders(tiles, isExplored);
    this.drawOverlays(tiles, now, isExplored);

    // Cities.
    for (const i of tiles) {
      if (!isExplored(i)) continue;
      const c = cityAt(state, i);
      if (c) this.drawCity(c, now);
    }

    // Units.
    for (const i of tiles) {
      if (!isVisible(i)) continue;
      const here = unitsAt(state, i);
      if (!here.length) continue;
      const mil = militaryAt(state, i);
      const civ = civilianAt(state, i);
      if (civ) this.drawUnit(civ, now, mil ? [SIZE * 0.3, SIZE * 0.22] : [0, 0]);
      if (mil) this.drawUnit(mil, now, civ ? [-SIZE * 0.26, -SIZE * 0.14] : [0, 0]);
    }

    this.drawPathPreview();
    this.drawAnimations(now);
    this.drawHover();
  }

  drawBorders(tiles, isExplored) {
    const { ctx, state } = this;
    const map = state.map;
    const byOwner = new Map();
    for (const i of tiles) {
      const t = map.tiles[i];
      if (t.owner < 0 || !isExplored(i)) continue;
      const [x, y] = this.tileCenter(i);
      if (!byOwner.has(t.owner)) byOwner.set(t.owner, { fill: new Path2D(), edge: new Path2D() });
      const g = byOwner.get(t.owner);
      g.fill.addPath(HEX, new DOMMatrix([1, 0, 0, 1, x, y]));
      for (let d = 0; d < 6; d++) {
        const n = neighbor(map, i, d);
        if (n >= 0 && map.tiles[n].owner === t.owner) continue;
        const [ax, ay] = corner(x, y, SIZE * 0.93, EDGE_CORNERS[d][0]);
        const [bx, by] = corner(x, y, SIZE * 0.93, EDGE_CORNERS[d][1]);
        g.edge.moveTo(ax, ay);
        g.edge.lineTo(bx, by);
      }
    }
    for (const [owner, g] of byOwner) {
      const color = state.players[owner].color;
      ctx.fillStyle = withAlpha(color, 0.1);
      ctx.fill(g.fill);
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(20,20,20,.35)';
      ctx.lineWidth = 5.5;
      ctx.stroke(g.edge);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.5;
      ctx.stroke(g.edge);
    }
  }

  drawOverlays(tiles, now, isExplored) {
    const { ctx, state, overlay } = this;
    const tileSet = new Set(tiles);
    const fillTiles = (set, color, stroke) => {
      for (const i of set) {
        if (!tileSet.has(i)) continue;
        const [x, y] = this.tileCenter(i);
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = color;
        ctx.fill(HEX_INNER);
        if (stroke) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 2;
          ctx.stroke(HEX_INNER);
        }
        ctx.restore();
      }
    };
    if (overlay.reach) fillTiles(overlay.reach, 'rgba(255,255,255,.16)', 'rgba(255,255,255,.35)');
    if (overlay.targets) fillTiles(overlay.targets, 'rgba(230,70,50,.22)', 'rgba(255,90,70,.9)');
    if (overlay.cityTiles) fillTiles(overlay.cityTiles, 'rgba(255,255,255,.06)', null);

    if (overlay.worked) {
      for (const i of overlay.worked) {
        if (!tileSet.has(i)) continue;
        const [x, y] = this.tileCenter(i);
        ctx.strokeStyle = overlay.locked?.has(i) ? '#F2C94C' : 'rgba(255,255,255,.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y - SIZE * 0.05, SIZE * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (overlay.yields || this.showYields) {
      const list = overlay.yields || tiles.filter((i) => isExplored(i) && state.map.tiles[i].owner === this.viewer);
      for (const i of list) {
        if (!tileSet.has(i)) continue;
        this.drawTileYield(i);
      }
    }

    if (overlay.placements) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 250);
      for (const { tile, bonus, best } of overlay.placements) {
        if (!tileSet.has(tile)) continue;
        const [x, y] = this.tileCenter(tile);
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = best ? `rgba(242,201,76,${0.25 + 0.2 * pulse})` : 'rgba(255,255,255,.18)';
        ctx.fill(HEX_INNER);
        ctx.strokeStyle = best ? '#F2C94C' : 'rgba(255,255,255,.7)';
        ctx.lineWidth = best ? 3 : 2;
        ctx.stroke(HEX_INNER);
        ctx.fillStyle = 'rgba(15,20,28,.85)';
        roundRect(ctx, -SIZE * 0.42, -SIZE * 0.26, SIZE * 0.84, SIZE * 0.52, 8);
        ctx.fill();
        ctx.fillStyle = best ? '#F2C94C' : '#FFFFFF';
        ctx.font = `700 ${SIZE * 0.42}px "JetBrains Mono", Consolas, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`+${bonus}`, 0, 1);
        ctx.restore();
      }
      this.overlay.pulse = true;
    } else this.overlay.pulse = false;

    if (overlay.buyTiles) {
      for (const { tile, cost, affordable } of overlay.buyTiles) {
        if (!tileSet.has(tile)) continue;
        const [x, y] = this.tileCenter(tile);
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = 'rgba(15,20,28,.85)';
        roundRect(ctx, -SIZE * 0.5, -SIZE * 0.22, SIZE, SIZE * 0.44, 7);
        ctx.fill();
        ctx.fillStyle = affordable ? '#F2C94C' : '#8C949C';
        ctx.font = `700 ${SIZE * 0.34}px "JetBrains Mono", Consolas, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${cost}g`, 0, 1);
        ctx.restore();
      }
    }
  }

  drawTileYield(i) {
    const { ctx } = this;
    const y = this.tileYieldFn ? this.tileYieldFn(i) : null;
    if (!y) return;
    const [cx, cy] = this.tileCenter(i);
    const items = [];
    for (let k = 0; k < Math.round(y.food); k++) items.push('#7CC05A');
    for (let k = 0; k < Math.round(y.prod); k++) items.push('#E0955A');
    for (let k = 0; k < Math.round(y.gold); k++) items.push('#F2C94C');
    for (let k = 0; k < Math.round(y.science); k++) items.push('#6FA8FF');
    if (!items.length) return;
    const r = SIZE * 0.1;
    const gap = r * 2.3;
    const perRow = 4;
    const rows = Math.ceil(items.length / perRow);
    ctx.save();
    items.forEach((color, k) => {
      const row = Math.floor(k / perRow);
      const inRow = Math.min(perRow, items.length - row * perRow);
      const x = cx + (k % perRow - (inRow - 1) / 2) * gap;
      const yy = cy + SIZE * 0.3 + (row - (rows - 1) / 2) * gap;
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.beginPath();
      ctx.arc(x, yy, r + 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, yy, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  drawCity(c, now) {
    const { ctx, state } = this;
    const p = state.players[c.owner];
    const [x, y] = this.tileCenter(c.tile);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath();
    ctx.ellipse(0, SIZE * 0.42, SIZE * 0.7, SIZE * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    const houses = [[-0.46, 0.12, 0.3, 0.3], [-0.1, -0.06, 0.38, 0.44], [0.3, 0.1, 0.32, 0.32], [-0.28, 0.32, 0.26, 0.22], [0.12, 0.34, 0.28, 0.2]];
    for (const [hx, hy, hw, hh] of houses) {
      const bx = hx * SIZE;
      const by = hy * SIZE;
      const w = hw * SIZE;
      const h = hh * SIZE;
      ctx.fillStyle = '#EFE7D4';
      ctx.fillRect(bx, by - h * 0.2, w, h);
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      ctx.fillRect(bx + w * 0.6, by - h * 0.2, w * 0.4, h);
      ctx.fillStyle = '#B5543F';
      ctx.beginPath();
      ctx.moveTo(bx - w * 0.1, by - h * 0.2);
      ctx.lineTo(bx + w / 2, by - h * 0.2 - w * 0.5);
      ctx.lineTo(bx + w * 1.1, by - h * 0.2);
      ctx.closePath();
      ctx.fill();
    }
    if (c.buildings.includes('walls')) {
      ctx.strokeStyle = '#8A8378';
      ctx.lineWidth = SIZE * 0.08;
      ctx.beginPath();
      ctx.arc(0, SIZE * 0.1, SIZE * 0.72, Math.PI * 0.05, Math.PI * 0.95);
      ctx.stroke();
    }

    // Banner: emblem, name, population.
    ctx.font = `600 ${SIZE * 0.36}px "Instrument Sans", system-ui, sans-serif`;
    const nameW = ctx.measureText(c.name).width;
    const bw = nameW + SIZE * 1.25;
    const bh = SIZE * 0.52;
    const by = -SIZE * 1.05;
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    roundRect(ctx, -bw / 2 + 1.5, by + 2, bw, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = p.color;
    roundRect(ctx, -bw / 2, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath();
    ctx.arc(-bw / 2 + bh / 2, by + bh / 2, bh / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 ${SIZE * 0.3}px "JetBrains Mono", Consolas, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(c.pop), -bw / 2 + bh / 2, by + bh / 2 + 1);
    ctx.font = `600 ${SIZE * 0.36}px "Instrument Sans", system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(c.name, -bw / 2 + bh + 3, by + bh / 2 + 1);
    drawEmblem(ctx, p.emblem, bw / 2 - bh / 2, by + bh / 2, bh * 0.3, '#FFFFFF');
    if (c.capital) {
      ctx.fillStyle = '#F2C94C';
      ctx.beginPath();
      const sx = 0;
      const sy = by - SIZE * 0.2;
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        const rr = k % 2 ? SIZE * 0.08 : SIZE * 0.18;
        ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
    }
    const maxHp = cityMaxHp(state, c);
    if (c.hp < maxHp) this.drawBar(0, by + bh + 5, bw * 0.8, 5, c.hp / maxHp);
    ctx.restore();
  }

  drawBar(cx, y, w, h, frac) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(cx - w / 2 - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = frac > 0.6 ? '#5CC46A' : frac > 0.3 ? '#E8C24A' : '#E0564A';
    ctx.fillRect(cx - w / 2, y, w * Math.max(0, frac), h);
  }

  drawUnit(u, now, offset) {
    const { ctx, state, overlay } = this;
    const p = state.players[u.owner];
    const [px, py] = this.unitPosition(u, now);
    const x = px + offset[0];
    const y = py + offset[1];
    const civilian = UNITS[u.type].cls === 'civilian';
    const r = SIZE * (civilian ? 0.34 : 0.4);
    const selected = overlay.selectedUnit === u.id;
    ctx.save();
    ctx.translate(x, y);
    if (selected) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 180);
      ctx.strokeStyle = `rgba(255,255,255,${0.55 + 0.45 * pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r + 5 + pulse * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.95, r * 0.9, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = civilian ? '#F4EEDF' : p.color;
    ctx.beginPath();
    if (civilian) {
      roundRect(ctx, -r, -r, r * 2, r * 2, r * 0.45);
    } else ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = civilian ? p.color : 'rgba(255,255,255,.9)';
    ctx.lineWidth = civilian ? 3 : 2;
    ctx.stroke();
    drawUnitGlyph(ctx, u.type, 0, 0, r * 0.72, civilian ? p.color : '#FFFFFF');
    // Owner emblem, so civs are never told apart by color alone.
    ctx.fillStyle = 'rgba(15,20,28,.9)';
    ctx.beginPath();
    ctx.arc(r * 0.78, r * 0.72, r * 0.36, 0, Math.PI * 2);
    ctx.fill();
    drawEmblem(ctx, p.emblem, r * 0.78, r * 0.72, r * 0.24, p.color);
    if (u.hp < 100) this.drawBar(0, r + 5, r * 1.8, 4, u.hp / 100);
    if (u.owner === this.viewer) {
      if (u.fortified || u.sleeping) {
        ctx.fillStyle = 'rgba(15,20,28,.9)';
        ctx.beginPath();
        ctx.arc(-r * 0.8, -r * 0.75, r * 0.34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#D8DEE4';
        ctx.font = `700 ${r * 0.42}px "JetBrains Mono", Consolas, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(u.fortified ? 'F' : 'z', -r * 0.8, -r * 0.73);
      } else if (u.moves > 0 && !u.path && u.skipped !== state.turn) {
        ctx.fillStyle = '#7BE08A';
        ctx.beginPath();
        ctx.arc(-r * 0.8, -r * 0.75, r * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.5)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawPathPreview() {
    const { ctx, overlay } = this;
    const pv = overlay.path;
    if (!pv || !pv.tiles.length) return;
    const pts = [pv.from, ...pv.tiles].map((t) => this.tileCenter(t));
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([2, 9]);
    ctx.strokeStyle = pv.attack ? '#FF6B57' : '#FFFFFF';
    ctx.lineWidth = 5;
    ctx.beginPath();
    pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.setLineDash([]);
    pv.turns.forEach((turn, k) => {
      const last = k === pv.turns.length - 1;
      const endsTurn = last || pv.turns[k + 1] !== turn;
      if (!endsTurn) return;
      const [x, y] = pts[k + 1];
      ctx.fillStyle = 'rgba(15,20,28,.9)';
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = pv.attack && last ? '#FF6B57' : '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 12px "JetBrains Mono", Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(turn + 1), x, y + 1);
    });
    ctx.restore();
  }

  drawHover() {
    const { ctx, overlay } = this;
    if (overlay.hover == null || overlay.hover < 0) return;
    const [x, y] = this.tileCenter(overlay.hover);
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 2;
    ctx.stroke(HEX_INNER);
    ctx.restore();
  }

  drawAnimations(now) {
    const { ctx } = this;
    for (const a of this.anims) {
      if (now < a.start) continue;
      const t = Math.min(1, (now - a.start) / a.dur);
      if (a.kind === 'text') {
        const [x, y] = this.tileCenter(a.tile);
        ctx.save();
        ctx.globalAlpha = 1 - t * t;
        ctx.font = '700 20px "JetBrains Mono", Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0,0,0,.7)';
        ctx.strokeText(a.text, x, y - SIZE * 0.6 - t * 26);
        ctx.fillStyle = a.color;
        ctx.fillText(a.text, x, y - SIZE * 0.6 - t * 26);
        ctx.restore();
      } else if (a.kind === 'ring') {
        const [x, y] = this.tileCenter(a.tile);
        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = a.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y, SIZE * (0.4 + t * 1.2), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (a.kind === 'fade') {
        const [x, y] = this.tileCenter(a.tile);
        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha = 0.5 * (1 - t);
        ctx.fillStyle = a.color;
        ctx.fill(HEX);
        ctx.restore();
      } else if (a.kind === 'shot') {
        const [x1, y1] = this.tileCenter(a.from);
        const [x2, y2] = this.tileCenter(a.to);
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t - Math.sin(t * Math.PI) * SIZE * 0.8;
        ctx.fillStyle = '#FFE08A';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
