// The corner minimap: explored terrain, borders and cities, with the camera's view outlined.
// Click or drag on it to move the view.

import { toPixel } from '../core/hex.js';
import { SIZE } from './renderer.js';
import { TERRAIN_COLORS, PARCHMENT } from './draw.js';

export class Minimap {
  constructor(canvas, app) {
    this.canvas = canvas;
    this.app = app;
    this.ctx = canvas.getContext('2d');
    this.base = document.createElement('canvas');
    this.dirty = true;
    this.w = 220;
    this.h = 140;
    let dragging = false;
    const jump = (e) => {
      const r = canvas.getBoundingClientRect();
      const state = this.app.state;
      if (!state) return;
      const b = this.app.renderer.mapBounds();
      const x = ((e.clientX - r.left) / r.width) * b.w - SIZE;
      const y = ((e.clientY - r.top) / r.height) * b.h - SIZE;
      this.app.renderer.camTarget = null;
      this.app.renderer.cam.x = x;
      this.app.renderer.cam.y = y;
      this.app.renderer.clampCamera();
      this.app.renderer.dirty = true;
    };
    canvas.addEventListener('pointerdown', (e) => {
      dragging = true;
      canvas.setPointerCapture(e.pointerId);
      jump(e);
    });
    canvas.addEventListener('pointermove', (e) => dragging && jump(e));
    canvas.addEventListener('pointerup', () => (dragging = false));
  }

  reset() {
    const state = this.app.state;
    if (!state) return;
    const b = this.app.renderer.mapBounds();
    this.w = 220;
    this.h = Math.round((220 * b.h) / b.w);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr;
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.base.width = this.w * dpr;
    this.base.height = this.h * dpr;
    this.dirty = true;
  }

  drawBase() {
    const state = this.app.state;
    const ctx = this.base.getContext('2d');
    const b = this.app.renderer.mapBounds();
    const sx = (this.w * this.dpr) / b.w;
    const sy = (this.h * this.dpr) / b.h;
    const viewer = state.players[this.app.humanId];
    ctx.fillStyle = PARCHMENT;
    ctx.fillRect(0, 0, this.base.width, this.base.height);
    const cw = SIZE * 1.8 * sx;
    const ch = SIZE * 1.6 * sy;
    state.map.tiles.forEach((t, i) => {
      if (!viewer.explored[i]) return;
      const [x, y] = toPixel(state.map, i, SIZE);
      const px = (x + SIZE) * sx;
      const py = (y + SIZE) * sy;
      ctx.fillStyle = t.owner >= 0 ? state.players[t.owner].color : TERRAIN_COLORS[t.t];
      ctx.globalAlpha = t.owner >= 0 ? 0.85 : 1;
      ctx.fillRect(px - cw / 2, py - ch / 2, cw, ch);
    });
    ctx.globalAlpha = 1;
    for (const c of Object.values(state.cities)) {
      if (!viewer.explored[c.tile]) continue;
      const [x, y] = toPixel(state.map, c.tile, SIZE);
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#111';
      ctx.lineWidth = this.dpr;
      ctx.beginPath();
      ctx.arc((x + SIZE) * sx, (y + SIZE) * sy, 2.6 * this.dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  draw() {
    const state = this.app.state;
    if (!state || this.canvas.offsetParent === null) return;
    if (this.dirty) {
      this.drawBase();
      this.dirty = false;
    }
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.base, 0, 0);
    const r = this.app.renderer;
    const b = r.mapBounds();
    const sx = (this.w * this.dpr) / b.w;
    const sy = (this.h * this.dpr) / b.h;
    const poly = r.viewPolygon();
    if (!poly.every(Boolean)) return;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5 * this.dpr;
    ctx.beginPath();
    poly.forEach(([x, y], k) => (k ? ctx.lineTo((x + SIZE) * sx, (y + SIZE) * sy) : ctx.moveTo((x + SIZE) * sx, (y + SIZE) * sy)));
    ctx.closePath();
    ctx.stroke();
  }
}
