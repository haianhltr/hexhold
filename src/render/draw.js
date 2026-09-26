// Drawing primitives for the map: terrain decoration, resources, improvements, districts,
// unit glyphs and civ emblems. Everything is drawn in code, so the game ships with no image files.

import { corner } from '../core/hex.js';

export const TERRAIN_COLORS = {
  grass: '#86B45A',
  plains: '#BDB866',
  desert: '#DFCB8C',
  mountain: '#9C968C',
  coast: '#4B8CBB',
  ocean: '#2C5D89',
};
export const PARCHMENT = '#D9CDAF';

export const DISTRICT_COLORS = { campus: '#3A7BD5', commercial: '#D9A62B', encampment: '#B5543F' };

export function hexPath(size) {
  const p = new Path2D();
  for (let k = 0; k < 6; k++) {
    const [x, y] = corner(0, 0, size, k);
    if (k) p.lineTo(x, y);
    else p.moveTo(x, y);
  }
  p.closePath();
  return p;
}

// Deterministic per-tile jitter so decorations don't all line up.
function jitter(i, k) {
  const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

export function drawTerrainDetail(ctx, tile, i, s) {
  if (tile.t === 'ocean' || tile.t === 'coast') {
    ctx.strokeStyle = tile.t === 'coast' ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.12)';
    ctx.lineWidth = s * 0.05;
    for (let k = 0; k < 2; k++) {
      const x = (jitter(i, k) - 0.5) * s * 0.9;
      const y = (jitter(i, k + 5) - 0.5) * s * 0.9;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.2, y);
      ctx.quadraticCurveTo(x - s * 0.1, y - s * 0.08, x, y);
      ctx.quadraticCurveTo(x + s * 0.1, y + s * 0.08, x + s * 0.2, y);
      ctx.stroke();
    }
    return;
  }
  if (tile.t === 'desert') {
    ctx.strokeStyle = 'rgba(150,115,55,.35)';
    ctx.lineWidth = s * 0.04;
    for (let k = 0; k < 2; k++) {
      const x = (jitter(i, k) - 0.5) * s * 0.8;
      const y = (jitter(i, k + 3) - 0.5) * s * 0.7;
      ctx.beginPath();
      ctx.arc(x, y + s * 0.15, s * 0.18, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
  }
  if (tile.t === 'mountain') {
    const peaks = [[-0.28, 0.2, 0.5], [0.12, 0.28, 0.62], [0.36, 0.3, 0.4]];
    for (const [px, py, ph] of peaks) {
      const x = px * s;
      const base = py * s + s * 0.15;
      const h = ph * s;
      ctx.fillStyle = '#6E6A64';
      ctx.beginPath();
      ctx.moveTo(x - h * 0.55, base);
      ctx.lineTo(x, base - h);
      ctx.lineTo(x + h * 0.55, base);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#56524D';
      ctx.beginPath();
      ctx.moveTo(x, base - h);
      ctx.lineTo(x + h * 0.55, base);
      ctx.lineTo(x + h * 0.1, base);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#F2F1EC';
      ctx.beginPath();
      ctx.moveTo(x, base - h);
      ctx.lineTo(x + h * 0.17, base - h * 0.7);
      ctx.lineTo(x - h * 0.17, base - h * 0.7);
      ctx.closePath();
      ctx.fill();
    }
    return;
  }
  if (tile.hills) {
    ctx.strokeStyle = 'rgba(70,60,30,.45)';
    ctx.lineWidth = s * 0.07;
    ctx.lineCap = 'round';
    for (const [hx, hy] of [[-0.3, 0.3], [0.25, 0.1]]) {
      ctx.beginPath();
      ctx.arc(hx * s, hy * s + s * 0.2, s * 0.3, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
  }
  if (tile.forest) {
    const spots = [[-0.35, 0.05], [0.05, -0.25], [0.35, 0.1], [-0.05, 0.35], [-0.4, -0.35]];
    for (let k = 0; k < spots.length; k++) {
      const x = (spots[k][0] + (jitter(i, k) - 0.5) * 0.12) * s;
      const y = (spots[k][1] + (jitter(i, k + 7) - 0.5) * 0.12) * s;
      const h = s * (0.36 + jitter(i, k + 11) * 0.1);
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      ctx.beginPath();
      ctx.ellipse(x, y + h * 0.28, h * 0.3, h * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2F6B34';
      ctx.beginPath();
      ctx.moveTo(x, y - h * 0.62);
      ctx.lineTo(x + h * 0.3, y + h * 0.25);
      ctx.lineTo(x - h * 0.3, y + h * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3C8241';
      ctx.beginPath();
      ctx.moveTo(x, y - h * 0.62);
      ctx.lineTo(x - h * 0.3, y + h * 0.25);
      ctx.lineTo(x - h * 0.04, y + h * 0.25);
      ctx.closePath();
      ctx.fill();
    }
  }
}

export function drawResource(ctx, res, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.beginPath();
  ctx.arc(0, 0, s, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
  if (res === 'wheat') {
    ctx.strokeStyle = '#B08A2E';
    ctx.lineWidth = s * 0.14;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.65);
    ctx.lineTo(0, -s * 0.6);
    ctx.stroke();
    ctx.fillStyle = '#D6A93A';
    for (let k = 0; k < 3; k++) {
      const yy = -s * 0.45 + k * s * 0.3;
      ctx.beginPath();
      ctx.ellipse(-s * 0.18, yy, s * 0.14, s * 0.24, -0.5, 0, Math.PI * 2);
      ctx.ellipse(s * 0.18, yy, s * 0.14, s * 0.24, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (res === 'stone') {
    ctx.fillStyle = '#8D9096';
    ctx.beginPath();
    ctx.moveTo(-s * 0.55, s * 0.35);
    ctx.lineTo(-s * 0.35, -s * 0.3);
    ctx.lineTo(s * 0.2, -s * 0.45);
    ctx.lineTo(s * 0.55, s * 0.1);
    ctx.lineTo(s * 0.3, s * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#B4B7BC';
    ctx.beginPath();
    ctx.moveTo(-s * 0.35, -s * 0.3);
    ctx.lineTo(s * 0.2, -s * 0.45);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
  } else if (res === 'deer') {
    ctx.strokeStyle = '#7A5433';
    ctx.lineWidth = s * 0.12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, -s * 0.05);
    ctx.lineTo(-s * 0.35, -s * 0.55);
    ctx.moveTo(-s * 0.25, -s * 0.35);
    ctx.lineTo(-s * 0.5, -s * 0.35);
    ctx.moveTo(s * 0.1, -s * 0.05);
    ctx.lineTo(s * 0.35, -s * 0.55);
    ctx.moveTo(s * 0.25, -s * 0.35);
    ctx.lineTo(s * 0.5, -s * 0.35);
    ctx.stroke();
    ctx.fillStyle = '#A06B3E';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.2, s * 0.22, s * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (res === 'fish') {
    ctx.fillStyle = '#3F7FB5';
    ctx.beginPath();
    ctx.ellipse(-s * 0.08, 0, s * 0.42, s * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.28, 0);
    ctx.lineTo(s * 0.6, -s * 0.25);
    ctx.lineTo(s * 0.6, s * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-s * 0.3, -s * 0.05, s * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawImprovement(ctx, kind, s) {
  if (kind === 'farm') {
    ctx.strokeStyle = 'rgba(214,176,70,.9)';
    ctx.lineWidth = s * 0.06;
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, k * s * 0.16 + s * 0.05);
      ctx.lineTo(s * 0.5, k * s * 0.16 - s * 0.05);
      ctx.stroke();
    }
  } else if (kind === 'mine') {
    ctx.fillStyle = '#3B3530';
    ctx.beginPath();
    ctx.moveTo(-s * 0.26, s * 0.42);
    ctx.quadraticCurveTo(-s * 0.26, s * 0.05, 0, s * 0.05);
    ctx.quadraticCurveTo(s * 0.26, s * 0.05, s * 0.26, s * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#7B5A3A';
    ctx.lineWidth = s * 0.06;
    ctx.beginPath();
    ctx.moveTo(-s * 0.32, s * 0.42);
    ctx.lineTo(-s * 0.32, s * 0.02);
    ctx.lineTo(s * 0.32, s * 0.02);
    ctx.lineTo(s * 0.32, s * 0.42);
    ctx.stroke();
  }
}

export function drawDistrict(ctx, key, s) {
  const color = DISTRICT_COLORS[key];
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(0, s * 0.42, s * 0.55, s * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  // Two small buildings in the district's color.
  for (const [bx, bw, bh] of [[-0.3, 0.34, 0.4], [0.12, 0.42, 0.55]]) {
    const x = bx * s;
    const w = bw * s;
    const h = bh * s;
    ctx.fillStyle = '#EDE6D6';
    ctx.fillRect(x, s * 0.4 - h, w, h);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.12, s * 0.4 - h);
    ctx.lineTo(x + w / 2, s * 0.4 - h - w * 0.45);
    ctx.lineTo(x + w * 1.12, s * 0.4 - h);
    ctx.closePath();
    ctx.fill();
  }
  // Badge with the district's symbol.
  const r = s * 0.24;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(-s * 0.36, -s * 0.34, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  drawDistrictSymbol(ctx, key, -s * 0.36, -s * 0.34, r * 0.7, '#fff');
}

export function drawDistrictSymbol(ctx, key, x, y, r, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  if (key === 'campus') {
    ctx.beginPath();
    ctx.moveTo(-r * 0.25, -r);
    ctx.lineTo(r * 0.25, -r);
    ctx.lineTo(r * 0.25, -r * 0.2);
    ctx.lineTo(r * 0.8, r * 0.8);
    ctx.lineTo(-r * 0.8, r * 0.8);
    ctx.lineTo(-r * 0.25, -r * 0.2);
    ctx.closePath();
    ctx.fill();
  } else if (key === 'commercial') {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = DISTRICT_COLORS.commercial;
    ctx.fillRect(-r * 0.12, -r * 0.5, r * 0.24, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.85, -r * 0.6);
    ctx.quadraticCurveTo(r * 0.8, r * 0.6, 0, r);
    ctx.quadraticCurveTo(-r * 0.8, r * 0.6, -r * 0.85, -r * 0.6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function drawEmblem(ctx, kind, x, y, r, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  if (kind === 'sun') {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = r * 0.16;
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62);
      ctx.lineTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95);
      ctx.stroke();
    }
  } else if (kind === 'wave') {
    ctx.lineWidth = r * 0.22;
    for (const dy of [-0.3, 0.3]) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, dy * r);
      ctx.quadraticCurveTo(-r * 0.45, dy * r - r * 0.4, 0, dy * r);
      ctx.quadraticCurveTo(r * 0.45, dy * r + r * 0.4, r * 0.9, dy * r);
      ctx.stroke();
    }
  } else if (kind === 'leaf') {
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r * 0.9, -r * 0.1, 0, r);
    ctx.quadraticCurveTo(-r * 0.9, -r * 0.1, 0, -r);
    ctx.fill();
  } else {
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const rr = k % 2 ? r * 0.42 : r;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function drawUnitGlyph(ctx, type, x, y, r, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 0.16;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (type) {
    case 'settler':
      ctx.beginPath();
      ctx.moveTo(-r * 0.75, -r * 0.05);
      ctx.lineTo(0, -r * 0.75);
      ctx.lineTo(r * 0.75, -r * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-r * 0.5, -r * 0.1, r, r * 0.75);
      break;
    case 'builder':
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, r * 0.6);
      ctx.lineTo(r * 0.3, -r * 0.25);
      ctx.stroke();
      ctx.save();
      ctx.translate(r * 0.3, -r * 0.3);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-r * 0.5, -r * 0.2, r, r * 0.4);
      ctx.restore();
      break;
    case 'scout':
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, 0);
      ctx.quadraticCurveTo(0, -r * 0.75, r * 0.8, 0);
      ctx.quadraticCurveTo(0, r * 0.75, -r * 0.8, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'warrior':
      ctx.lineWidth = r * 0.22;
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, r * 0.6);
      ctx.lineTo(r * 0.3, -r * 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r * 0.35, -r * 0.38, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'archer':
      ctx.beginPath();
      ctx.arc(-r * 0.25, 0, r * 0.7, -Math.PI / 2.3, Math.PI / 2.3);
      ctx.stroke();
      ctx.lineWidth = r * 0.07;
      ctx.beginPath();
      ctx.moveTo(r * 0.03, -r * 0.63);
      ctx.lineTo(r * 0.03, r * 0.63);
      ctx.stroke();
      ctx.lineWidth = r * 0.12;
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, 0);
      ctx.lineTo(r * 0.75, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(r * 0.8, 0);
      ctx.lineTo(r * 0.5, -r * 0.18);
      ctx.lineTo(r * 0.5, r * 0.18);
      ctx.closePath();
      ctx.fill();
      break;
    case 'horseman':
      ctx.lineWidth = r * 0.24;
      ctx.beginPath();
      ctx.arc(0, -r * 0.05, r * 0.55, Math.PI * 0.15, Math.PI * 0.85, true);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-r * 0.47, r * 0.35, r * 0.12, 0, Math.PI * 2);
      ctx.arc(r * 0.47, r * 0.35, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'swordsman':
      ctx.lineWidth = r * 0.18;
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, r * 0.5);
      ctx.lineTo(r * 0.6, -r * 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, r * 0.05);
      ctx.lineTo(-r * 0.05, r * 0.55);
      ctx.stroke();
      break;
    case 'catapult':
      ctx.beginPath();
      ctx.arc(-r * 0.35, r * 0.4, r * 0.25, 0, Math.PI * 2);
      ctx.arc(r * 0.35, r * 0.4, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, r * 0.15);
      ctx.lineTo(r * 0.6, r * 0.15);
      ctx.moveTo(-r * 0.2, r * 0.15);
      ctx.lineTo(r * 0.5, -r * 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r * 0.55, -r * 0.65, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
      break;
    default:
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
  }
  ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

export function withAlpha(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
