// Hex grid math. Tiles are stored row by row in "odd-r" offset layout (pointy-top hexes, odd rows
// shifted half a tile right) and addressed by index. Distance math converts to axial coordinates.
// Reference: https://www.redblobgames.com/grids/hexagons/

export const SQRT3 = Math.sqrt(3);

// Neighbor offsets in direction order E, NE, NW, W, SW, SE.
const EVEN_ROW = [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
const ODD_ROW = [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]];

// For each direction, the two corners (see corner()) that bound the shared edge.
export const EDGE_CORNERS = [[0, 1], [5, 0], [4, 5], [3, 4], [2, 3], [1, 2]];

export function colRow(map, i) {
  return [i % map.w, (i / map.w) | 0];
}

export function index(map, col, row) {
  if (col < 0 || row < 0 || col >= map.w || row >= map.h) return -1;
  return row * map.w + col;
}

export function axial(map, i) {
  const col = i % map.w;
  const row = (i / map.w) | 0;
  return [col - (row - (row & 1)) / 2, row];
}

export function distance(map, a, b) {
  const [q1, r1] = axial(map, a);
  const [q2, r2] = axial(map, b);
  const dq = q1 - q2;
  const dr = r1 - r2;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

export function neighbor(map, i, dir) {
  const col = i % map.w;
  const row = (i / map.w) | 0;
  const o = (row & 1 ? ODD_ROW : EVEN_ROW)[dir];
  return index(map, col + o[0], row + o[1]);
}

export function neighbors(map, i) {
  const out = [];
  for (let d = 0; d < 6; d++) {
    const n = neighbor(map, i, d);
    if (n >= 0) out.push(n);
  }
  return out;
}

// Every tile within `radius` of tile i, including i itself.
export function within(map, i, radius) {
  const [c0, r0] = colRow(map, i);
  const out = [];
  for (let r = r0 - radius; r <= r0 + radius; r++) {
    for (let c = c0 - radius - 1; c <= c0 + radius + 1; c++) {
      const j = index(map, c, r);
      if (j >= 0 && distance(map, i, j) <= radius) out.push(j);
    }
  }
  return out;
}

export function ring(map, i, radius) {
  return within(map, i, radius).filter((j) => distance(map, i, j) === radius);
}

// Center of tile i in pixels for hexes of the given size (center to corner).
export function toPixel(map, i, size) {
  const col = i % map.w;
  const row = (i / map.w) | 0;
  return [size * SQRT3 * (col + 0.5 * (row & 1)), size * 1.5 * row];
}

// Tile index under pixel (x, y), or -1 when off the map.
export function fromPixel(map, x, y, size) {
  const q = ((SQRT3 / 3) * x - (1 / 3) * y) / size;
  const r = ((2 / 3) * y) / size;
  let rx = Math.round(q);
  let rz = Math.round(r);
  const s = -q - r;
  let ry = Math.round(s);
  const dx = Math.abs(rx - q);
  const dz = Math.abs(rz - r);
  const dy = Math.abs(ry - s);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy <= dz) rz = -rx - ry;
  const row = rz;
  const col = rx + (row - (row & 1)) / 2;
  return index(map, col, row);
}

// Corner k of a pointy-top hex centered at (x, y). Corner 0 is up-right, going clockwise.
export function corner(x, y, size, k) {
  const a = (Math.PI / 180) * (60 * k - 30);
  return [x + size * Math.cos(a), y + size * Math.sin(a)];
}
