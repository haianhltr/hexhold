// Tiny DOM helpers and the inline SVG icons used across the interface.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

// Replaces an element's children, skipping null and false (Element.append would print them).
export function fill(el, ...children) {
  clear(el);
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function fmt(n, digits = 1) {
  if (!Number.isFinite(n)) return '–';
  const r = Math.round(n * 10 ** digits) / 10 ** digits;
  return String(r);
}

export function signed(n, digits = 1) {
  const s = fmt(n, digits);
  return n > 0 ? `+${s}` : s;
}

export const YIELD_COLORS = { food: '#7CC05A', prod: '#E0955A', gold: '#F2C94C', science: '#6FA8FF', culture: '#C08BFF' };
export const YIELD_NAMES = { food: 'Food', prod: 'Production', gold: 'Gold', science: 'Science', culture: 'Culture' };

const PATHS = {
  food: '<path d="M8 1.5c-1.2 1.6-1.2 3.4 0 5 1.2-1.6 1.2-3.4 0-5Z"/><path d="M8 6.5c-2.6-.4-4.2.6-4.8 2.8C5.4 10 7 9.4 8 7.6Zm0 0c2.6-.4 4.2.6 4.8 2.8C10.6 10 9 9.4 8 7.6Z"/><path d="M8 10c-2.6-.4-4.2.6-4.8 2.8C5.4 13.5 7 12.9 8 11.1Zm0 0c2.6-.4 4.2.6 4.8 2.8-2.2.7-3.8.1-4.8-1.7Z"/><rect x="7.4" y="6" width="1.2" height="9" rx=".6"/>',
  prod: '<path d="M9.6 1.3 6.4 4.5l1.4 1.4-5.3 5.3a1.3 1.3 0 0 0 1.8 1.8L9.6 7.7l1.4 1.4 3.2-3.2Z"/><path d="m10.8 2 3.2 3.2-1 1L9.8 3Z" opacity=".6"/>',
  gold: '<circle cx="8" cy="8" r="6.2"/><path d="M8 4v8M6 6.2c0-1 1-1.4 2-1.4s2 .4 2 1.2M10 9.8c0 1-1 1.4-2 1.4s-2-.4-2-1.2M6.2 7.6c0 .6 1 .8 1.8.8s1.8.3 1.8 1" stroke="#15212C" stroke-width="1.1" fill="none" stroke-linecap="round"/>',
  science: '<path d="M6 1.5h4v1.2H9.3v3.6l4 6.6a1.4 1.4 0 0 1-1.2 2.1H3.9a1.4 1.4 0 0 1-1.2-2.1l4-6.6V2.7H6Z"/>',
  culture: '<path d="M8 1.2 9.9 5.4l4.5.4-3.4 3 1 4.4L8 10.9 4 13.2l1-4.4-3.4-3 4.5-.4Z"/>',
  turn: '<circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 4v4.3l2.8 1.7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  strength: '<path d="M3 13 11.5 4.5M10 2.5l3.5 3.5M2.5 10l3.5 3.5M4.2 11.8 2 14" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/>',
  moves: '<path d="M2.5 8h9M8.5 4.5 12 8l-3.5 3.5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  heart: '<path d="M8 14s-5.5-3.3-5.5-7.2A3 3 0 0 1 8 4.8a3 3 0 0 1 5.5 2c0 3.9-5.5 7.2-5.5 7.2Z"/>',
  pop: '<circle cx="8" cy="5" r="2.8"/><path d="M2.8 14c.4-3 2.5-4.6 5.2-4.6s4.8 1.6 5.2 4.6Z"/>',
  close: '<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  menu: '<path d="M2.5 4h11M2.5 8h11M2.5 12h11" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  handshake: '<path d="M1.5 7 4 4.5l2.5 1L8 4.3l2 .2 3 3-1 1.2-2-1.6M3.5 8.5l3 3c.5.5 1.2.5 1.6 0l3.4-3.4M5.8 10.8l1-1M7.5 12.3l1-1" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
};

export function icon(name, cls = '') {
  const color = YIELD_COLORS[name];
  const fill = color ? `fill="${color}"` : 'fill="currentColor"';
  return `<svg class="ic ${cls}" viewBox="0 0 16 16" aria-hidden="true" ${fill}>${PATHS[name] || ''}</svg>`;
}

export function iconEl(name, cls = '') {
  const span = document.createElement('span');
  span.className = 'ic-wrap';
  span.innerHTML = icon(name, cls);
  return span.firstChild;
}

// A civ's emblem as inline SVG, matching the shapes drawn on the map.
export function emblemSvg(kind, color, size = 16) {
  let body;
  if (kind === 'sun') {
    body = `<circle cx="8" cy="8" r="3.4" fill="${color}"/>` + Array.from({ length: 8 }, (_, k) => {
      const a = (k * Math.PI) / 4;
      return `<line x1="${8 + Math.cos(a) * 4.8}" y1="${8 + Math.sin(a) * 4.8}" x2="${8 + Math.cos(a) * 7.2}" y2="${8 + Math.sin(a) * 7.2}" stroke="${color}" stroke-width="1.4" stroke-linecap="round"/>`;
    }).join('');
  } else if (kind === 'wave') {
    body = `<path d="M1.5 5.5q3.2-3.2 6.5 0t6.5 0M1.5 10.5q3.2-3.2 6.5 0t6.5 0" stroke="${color}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  } else if (kind === 'leaf') {
    body = `<path d="M8 1q7 7 0 14Q1 8 8 1Z" fill="${color}"/>`;
  } else {
    const pts = Array.from({ length: 10 }, (_, k) => {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const r = k % 2 ? 3.1 : 7.2;
      return `${(8 + Math.cos(a) * r).toFixed(2)},${(8 + Math.sin(a) * r).toFixed(2)}`;
    }).join(' ');
    body = `<polygon points="${pts}" fill="${color}"/>`;
  }
  return `<svg class="emblem" width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true">${body}</svg>`;
}

export function yieldChip(name, value, opts = {}) {
  const text = opts.signed ? signed(value) : fmt(value);
  return h('span', { class: `yield y-${name}`, title: opts.title || YIELD_NAMES[name] }, h('span', { html: icon(name) }), h('b', {}, text), opts.suffix ? h('small', {}, opts.suffix) : null);
}

export function bar(frac, color, label) {
  return h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(Math.max(0, Math.min(1, frac)) * 100), 'aria-label': label || null },
    h('i', { style: { width: `${Math.max(0, Math.min(1, frac)) * 100}%`, background: color } }));
}
