// Civilization emblems as SVG path data in a 16×16 box, filled with the nonzero rule. The interface
// draws them as inline SVG and the maps draw them with Path2D, so each emblem is defined once.
// Filled shapes wind clockwise and holes counter-clockwise (the helpers below take care of that).

const f = (n) => +n.toFixed(2);

function poly(points, hole = false) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  const clockwise = area > 0; // y points down, so a positive area is clockwise on screen
  const pts = clockwise === !hole ? points : [...points].reverse();
  return `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`;
}

const rect = (x, y, w, h, hole = false) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], hole);

function ellipse(cx, cy, rx, ry, deg = 0, hole = false) {
  const a = (deg * Math.PI) / 180;
  const dx = Math.cos(a) * rx;
  const dy = Math.sin(a) * rx;
  const sweep = hole ? 0 : 1;
  return `M${f(cx - dx)} ${f(cy - dy)}A${rx} ${ry} ${deg} 1 ${sweep} ${f(cx + dx)} ${f(cy + dy)}A${rx} ${ry} ${deg} 1 ${sweep} ${f(cx - dx)} ${f(cy - dy)}Z`;
}

const circle = (cx, cy, r, hole = false) => ellipse(cx, cy, r, r, 0, hole);

// Points around a center, for spokes and petals.
const around = (n, start, fn) => Array.from({ length: n }, (_, k) => fn(((start + (k * 360) / n) * Math.PI) / 180));

// Rome: a laurel wreath, open at the top.
const laurel = [105, 131, 157, 183, 209, 235]
  .flatMap((d) => {
    const a = (d * Math.PI) / 180;
    const x = 8 + Math.cos(a) * 5.4;
    const y = 8.6 + Math.sin(a) * 5.4;
    const tilt = d + 90 + 25;
    return [ellipse(x, y, 1.7, 0.8, tilt), ellipse(16 - x, y, 1.7, 0.8, 180 - tilt)];
  })
  .join('');

// Egypt: an ankh.
const ankh = ellipse(8, 4.6, 2.7, 3.2) + ellipse(8, 4.5, 1.25, 1.9, 0, true) + rect(3.3, 7.8, 9.4, 1.6) + poly([[7, 9.4], [9, 9.4], [9.7, 15.2], [6.3, 15.2]]);

// Greece: an Ionic column with fluted shaft.
const column = rect(2.6, 1.6, 10.8, 1.6) + poly([[4, 3.2], [12, 3.2], [11, 4.8], [5, 4.8]]) + rect(5, 4.8, 6, 7.6)
  + [6.2, 7.6, 9].map((x) => rect(x, 5.6, 0.75, 6, true)).join('') + rect(4.2, 12.4, 7.6, 1.2) + rect(3, 13.6, 10, 1.4);

// Persia: a winged disc.
const wing = [[5.9, 5], [0.7, 4.1], [1.5, 5.4], [0.9, 6.5], [2.4, 7.2], [1.9, 8], [6, 7.2]];
const wingedDisc = circle(8, 6, 2.3) + poly(wing) + poly(wing.map(([x, y]) => [16 - x, y])) + poly([[6.6, 8.6], [9.4, 8.6], [10.4, 12.6], [8, 11.6], [5.6, 12.6]]);

// China: a round coin with a square hole.
const coin = circle(8, 8, 7) + rect(6, 6, 4, 4, true);

// India: a wheel with twelve spokes.
const wheel = circle(8, 8, 7.2) + circle(8, 8, 5.7, true) + circle(8, 8, 1.5)
  + around(12, 0, (a) => {
    const c = Math.cos(a);
    const s = Math.sin(a);
    const w = 0.38;
    return poly([[8 + c * 1.6 - s * w, 8 + s * 1.6 + c * w], [8 + c * 5.6 - s * w, 8 + s * 5.6 + c * w], [8 + c * 5.6 + s * w, 8 + s * 5.6 - c * w], [8 + c * 1.6 + s * w, 8 + s * 1.6 - c * w]]);
  }).join('');

// Japan: a torii gate.
const torii = poly([[0.4, 1.8], [15.6, 1.8], [14.4, 3.8], [1.6, 3.8]]) + rect(2.2, 6, 11.6, 1.4) + rect(3.6, 3.8, 1.5, 11.4) + rect(10.9, 3.8, 1.5, 11.4) + rect(7.3, 3.8, 1.4, 2.2);

// Korea: a temple bell.
const bell = 'M5 3.2Q8 1.2 11 3.2L12 11Q12.4 12.4 14 12.9L2 12.9Q3.6 12.4 4 11Z' + rect(7.2, 0.6, 1.6, 1.6) + circle(8, 14.3, 1.2);

// Mongolia: a ger, the felt tent of the steppe.
const ger = 'M1.5 9Q8 1.4 14.5 9Z' + rect(2, 9, 12, 5.6) + rect(6.8, 10.6, 2.4, 4, true) + rect(7.2, 4, 1.6, 1.4);

// England: a five-petal rose with sepals.
const rose = around(5, -90, (a) => circle(8 + Math.cos(a) * 3.6, 8 + Math.sin(a) * 3.6, 2.9)).join('') + circle(8, 8, 2.4)
  + around(5, -54, (a) => {
    const c = Math.cos(a);
    const s = Math.sin(a);
    return poly([[8 + c * 7.6, 8 + s * 7.6], [8 + c * 5 - s * 1, 8 + s * 5 + c * 1], [8 + c * 5 + s * 1, 8 + s * 5 - c * 1]]);
  }).join('');

// France: a fleur-de-lis.
const fleur = 'M8 0.8C9.9 3 10.3 5.6 8 8.8C5.7 5.6 6.1 3 8 0.8Z'
  + 'M8.8 9.4C9.2 5.9 12.6 3.4 14.7 5.6C12.7 5.4 11.5 7.3 11.9 9.4Z'
  + 'M4.1 9.4C4.5 7.3 3.3 5.4 1.3 5.6C3.4 3.4 6.8 5.9 7.2 9.4Z'
  + rect(4.1, 9.6, 7.8, 1.3) + poly([[7, 10.9], [9, 10.9], [10.3, 15], [8, 13.6], [5.7, 15]]);

// Aztec: a stepped temple pyramid.
const pyramid = rect(1, 12.8, 14, 1.8) + rect(2.5, 10.9, 11, 1.9) + rect(4, 9, 8, 1.9) + rect(5.5, 7.1, 5, 1.9)
  + rect(6.1, 3.6, 3.8, 3.5) + rect(7.3, 5.1, 1.4, 2, true) + poly([[5.7, 3.6], [8, 1.6], [10.3, 3.6]]);

export const EMBLEMS = { laurel, ankh, column, wingedDisc, coin, wheel, torii, bell, ger, rose, fleur, pyramid };
