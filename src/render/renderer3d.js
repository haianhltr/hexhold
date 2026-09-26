// 3D map renderer (WebGL through Three.js). It implements the same interface as the 2D Renderer,
// so the rest of the game works with either. The App speaks in 2D "pixel" coordinates (hexes of
// size SIZE); this renderer converts them to 3D units where a hex has radius 1 and y is up.
//
// The scene is retained: meshes are rebuilt only when the game state changes (see sync()).

import * as THREE from 'three';
import { toPixel, fromPixel, neighbor, corner, EDGE_CORNERS } from '../core/hex.js';
import { UNITS } from '../data/units.js';
import { cityAt, militaryAt, civilianAt } from '../core/query.js';
import { visibleTiles } from '../core/vision.js';
import { cityMaxHp } from '../core/city.js';
import { SIZE } from './renderer.js';
import { drawResource, drawUnitGlyph, drawEmblem, drawDistrictSymbol, DISTRICT_COLORS, roundRect } from './draw.js';

const PX = SIZE;
const CORNER_DIRS = [[0, 1], [0, 5], [4, 5], [3, 4], [2, 3], [1, 2]];
const TERRAIN_3D = { grass: '#7AAE49', plains: '#B8AF58', desert: '#E0CA8A', mountain: '#8C877D', coast: '#5FB0CC', ocean: '#1C4A73' };
const SKIN = '#E0B28A';
const FOV = 32;

// 0 for no walls, then 1 Walls, 2 Castle, 3 Star Fort.
const wallLevel = (c) => ['walls', 'castle', 'starfort'].filter((b) => c.buildings.includes(b)).length;

function tileBase(t) {
  if (t.t === 'ocean') return -0.3;
  if (t.t === 'coast') return -0.14;
  if (t.t === 'mountain') return 0.24;
  return 0.1;
}

function hash01(i, k = 0) {
  const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const tmpColor = new THREE.Color();
const tmpMatrix = new THREE.Matrix4();
const tmpQuat = new THREE.Quaternion();
const tmpVec = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

function sepia(c, out) {
  const lum = c.r * 0.3 + c.g * 0.59 + c.b * 0.11;
  return out.setRGB(lum * 0.95 + 0.02, lum * 0.8 + 0.015, lum * 0.58 + 0.01);
}

function canvasTexture(w, h, draw, scale = 2) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * scale);
  c.height = Math.ceil(h * scale);
  const ctx = c.getContext('2d');
  ctx.scale(scale, scale);
  draw(ctx);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, w, h };
}

function parchmentTexture() {
  return canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#D6C8A4';
    ctx.fillRect(0, 0, 256, 256);
    const r = seeded(7);
    for (let k = 0; k < 1400; k++) {
      ctx.fillStyle = `rgba(${120 + r() * 60},${95 + r() * 50},${60 + r() * 30},${0.05 + r() * 0.08})`;
      ctx.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * 3);
    }
    ctx.strokeStyle = 'rgba(120,95,60,.22)';
    ctx.lineWidth = 1.5;
    for (let k = -8; k < 16; k++) {
      ctx.beginPath();
      ctx.moveTo(k * 24, 256);
      ctx.lineTo(k * 24 + 128, 0);
      ctx.stroke();
    }
  }, 1).tex;
}

function waterNormalTexture() {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const h = (x, y) => Math.sin(x * 0.19) * 0.5 + Math.sin(y * 0.23 + x * 0.07) * 0.5 + Math.sin((x + y) * 0.11) * 0.4 + Math.sin((x - 2 * y) * 0.05) * 0.3;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = h(x + 1, y) - h(x - 1, y);
      const dy = h(x, y + 1) - h(x, y - 1);
      const n = new THREE.Vector3(-dx, -dy, 2).normalize();
      const o = (y * size + x) * 4;
      img.data[o] = (n.x * 0.5 + 0.5) * 255;
      img.data[o + 1] = (n.y * 0.5 + 0.5) * 255;
      img.data[o + 2] = (n.z * 0.5 + 0.5) * 255;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Soft painterly grain, multiplied over the terrain colors so the ground doesn't look like plastic.
function groundDetailTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#EDEDED';
  ctx.fillRect(0, 0, size, size);
  const r = seeded(99);
  const blot = (x, y, rad, v, a) => {
    for (const dx of [-size, 0, size]) {
      for (const dy of [-size, 0, size]) {
        const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad);
        g.addColorStop(0, `rgba(${v},${v},${v},${a})`);
        g.addColorStop(1, `rgba(${v},${v},${v},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x + dx - rad, y + dy - rad, rad * 2, rad * 2);
      }
    }
  };
  for (let k = 0; k < 70; k++) blot(r() * size, r() * size, 12 + r() * 40, r() < 0.5 ? 255 : 170, 0.25 + r() * 0.25);
  ctx.lineCap = 'round';
  for (let k = 0; k < 900; k++) {
    const x = r() * size;
    const y = r() * size;
    const v = r() < 0.5 ? 200 : 255;
    ctx.strokeStyle = `rgba(${v},${v},${v},${0.18 + r() * 0.2})`;
    ctx.lineWidth = 1 + r() * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (r() - 0.5) * 6, y - 2 - r() * 5);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function farmTexture() {
  return canvasTexture(128, 128, (ctx) => {
    ctx.clearRect(0, 0, 128, 128);
    const cols = ['#C9B24E', '#9BB04A', '#D8BF5A', '#A8B650'];
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = cols[k];
      ctx.fillRect(4 + k * 30, 6, 28, 116);
      ctx.strokeStyle = 'rgba(90,70,20,.35)';
      ctx.lineWidth = 2;
      for (let y = 12; y < 120; y += 8) {
        ctx.beginPath();
        ctx.moveTo(6 + k * 30, y);
        ctx.lineTo(30 + k * 30, y);
        ctx.stroke();
      }
    }
  }, 1).tex;
}

// A geometry-light hex prism with pointy tops, matching the map's hex orientation.
function hexPrism(radius, height) {
  const g = new THREE.CylinderGeometry(radius, radius, height, 6, 1);
  return g;
}

export class Renderer3D {
  constructor(stage, { shadows = true } = {}) {
    this.stage = stage;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'map-canvas';
    this.canvas.setAttribute('aria-label', 'Game map');
    const gl = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    if (!gl.getContext()) throw new Error('WebGL unavailable');
    stage.append(this.canvas);
    this.gl = gl;
    gl.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    gl.toneMapping = THREE.NeutralToneMapping;
    gl.toneMappingExposure = 1.05;
    gl.shadowMap.enabled = shadows;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.shadows = shadows;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#13222F');
    this.scene.fog = new THREE.Fog('#13222F', 60, 150);
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 400);
    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.1);

    const hemi = new THREE.HemisphereLight('#E4EEFF', '#4E4028', 1.15);
    this.scene.add(hemi);
    this.sun = new THREE.DirectionalLight('#FFEFD0', 3.1);
    this.sun.castShadow = shadows;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun, this.sun.target);

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
    this.alive = true;
    this.world = null;
    this.textures = new Map();
    this.materials = new Map();
    this.geo = this.makeGeometries();
    this.parchment = parchmentTexture();
    this.farmTex = farmTexture();
    this.waterNormal = waterNormalTexture();
    this.resize();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  makeGeometries() {
    const roof = new THREE.ConeGeometry(0.71, 1, 4, 1);
    roof.rotateY(Math.PI / 4);
    roof.translate(0, 0.5, 0);
    const box = new THREE.BoxGeometry(1, 1, 1);
    box.translate(0, 0.5, 0);
    const cone = new THREE.ConeGeometry(1, 1, 6, 1, true);
    cone.translate(0, 0.5, 0);
    const peak = new THREE.ConeGeometry(1, 1, 5, 1);
    peak.translate(0, 0.5, 0);
    const cyl = new THREE.CylinderGeometry(1, 1, 1, 7, 1);
    const trunk = new THREE.CylinderGeometry(1, 1, 1, 4, 1, true);
    trunk.translate(0, 0.5, 0);
    cyl.translate(0, 0.5, 0);
    const ring = new THREE.RingGeometry(0.38, 0.47, 32);
    ring.rotateX(-Math.PI / 2);
    const disc = new THREE.CircleGeometry(1, 24);
    disc.rotateX(-Math.PI / 2);
    const plane = new THREE.PlaneGeometry(1, 1);
    plane.rotateX(-Math.PI / 2);
    return {
      roof,
      box,
      cone,
      peak,
      cyl,
      trunk,
      ring,
      disc,
      plane,
      sphere: new THREE.SphereGeometry(1, 10, 8),
      wheel: new THREE.CylinderGeometry(1, 1, 1, 10, 1).rotateZ(Math.PI / 2),
    };
  }

  mat(key, make) {
    let m = this.materials.get(key);
    if (!m) {
      m = make();
      this.materials.set(key, m);
    }
    return m;
  }

  lambert(color) {
    return this.mat(`l:${color}`, () => new THREE.MeshLambertMaterial({ color }));
  }

  // ---------- interface shared with the 2D renderer ----------

  setState(state, viewer) {
    this.state = state;
    this.viewer = viewer;
    this.anims = [];
    this.overlay = {};
    this.buildWorld();
    this.dirty = true;
  }

  resize() {
    const w = this.stage.clientWidth || window.innerWidth;
    const h = this.stage.clientHeight || window.innerHeight;
    this.w = w;
    this.h = h;
    this.gl.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.gl.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.pxScale = (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2))) / h;
    this.dirty = true;
  }

  destroy() {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    this.disposeWorld();
    for (const m of this.materials.values()) m.dispose();
    for (const t of this.textures.values()) t.tex.dispose();
    this.gl.dispose();
    this.canvas.remove();
  }

  mapBounds() {
    const map = this.state.map;
    return { w: SIZE * Math.sqrt(3) * (map.w + 0.5), h: SIZE * 1.5 * (map.h - 1) + SIZE * 2 };
  }

  clampCamera() {
    if (!this.state) return;
    const b = this.mapBounds();
    this.cam.x = Math.max(0, Math.min(b.w - SIZE * 2, this.cam.x));
    this.cam.y = Math.max(SIZE * 0.5, Math.min(b.h - SIZE * 1.5, this.cam.y));
  }

  updateCamera() {
    const z = this.cam.zoom;
    const n = Math.max(0, Math.min(1, (z - 0.45) / (1.9 - 0.45)));
    const tilt = THREE.MathUtils.degToRad(62 - 18 * n);
    const dist = 34 / z;
    const tx = this.cam.x / PX;
    const tz = this.cam.y / PX;
    this.camera.position.set(tx, Math.sin(tilt) * dist, tz + Math.cos(tilt) * dist);
    this.camera.lookAt(tx, 0, tz);
    this.camera.updateMatrixWorld();
    this.scene.fog.near = dist * 1.4;
    this.scene.fog.far = dist * 3.2;
    const span = dist * 0.75;
    this.sun.position.set(tx - 14, 26, tz + 10);
    this.sun.target.position.set(tx, 0, tz);
    const sc = this.sun.shadow.camera;
    if (sc.right !== span) {
      sc.left = -span;
      sc.right = span;
      sc.top = span;
      sc.bottom = -span;
      sc.near = 1;
      sc.far = 80;
      sc.updateProjectionMatrix();
    }
  }

  groundAtScreen(sx, sy, useTerrain = false) {
    this.updateCamera();
    const ndc = new THREE.Vector2((sx / this.w) * 2 - 1, -(sy / this.h) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    if (useTerrain && this.world?.terrain) {
      const hit = this.raycaster.intersectObject(this.world.terrain, false)[0];
      if (hit) return hit.point;
    }
    const p = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(this.groundPlane, p) ? p : null;
  }

  screenToWorld(sx, sy) {
    const p = this.groundAtScreen(sx, sy, true);
    return p ? [p.x * PX, p.z * PX] : [this.cam.x, this.cam.y];
  }

  worldToScreen(x, y) {
    this.updateCamera();
    let hy = 0.1;
    if (this.state && this.world) {
      const t = fromPixel(this.state.map, x, y, SIZE);
      if (t >= 0) hy = this.world.centerY[t];
    }
    const v = new THREE.Vector3(x / PX, hy, y / PX).project(this.camera);
    return [(v.x * 0.5 + 0.5) * this.w, (-v.y * 0.5 + 0.5) * this.h];
  }

  tileAt(sx, sy) {
    if (!this.state) return -1;
    const [wx, wy] = this.screenToWorld(sx, sy);
    return fromPixel(this.state.map, wx, wy, SIZE);
  }

  tileCenter(i) {
    return toPixel(this.state.map, i, SIZE);
  }

  // The four ground points at the screen corners, for the minimap's view outline.
  viewPolygon() {
    return [[0, 0], [this.w, 0], [this.w, this.h], [0, this.h]].map(([x, y]) => {
      const p = this.groundAtScreen(x, y, false);
      return p ? [p.x * PX, p.z * PX] : null;
    });
  }

  panBy(dx, dy) {
    this.camTarget = null;
    const a = this.groundAtScreen(this.w / 2, this.h / 2);
    const b = this.groundAtScreen(this.w / 2 + dx, this.h / 2 + dy);
    if (a && b) {
      this.cam.x -= (b.x - a.x) * PX;
      this.cam.y -= (b.z - a.z) * PX;
    }
    this.clampCamera();
  }

  zoomAt(factor, sx = this.w / 2, sy = this.h / 2) {
    const before = this.groundAtScreen(sx, sy);
    this.cam.zoom = Math.max(0.45, Math.min(1.9, this.cam.zoom * factor));
    const after = this.groundAtScreen(sx, sy);
    if (before && after) {
      this.cam.x += (before.x - after.x) * PX;
      this.cam.y += (before.z - after.z) * PX;
    }
    this.clampCamera();
  }

  centerOn(tile, smooth = true) {
    const [x, y] = this.tileCenter(tile);
    if (smooth) this.camTarget = { x, y };
    else {
      this.cam.x = x;
      this.cam.y = y;
      this.clampCamera();
    }
  }

  isOnScreen(tile, margin = 60) {
    const [x, y] = this.worldToScreen(...this.tileCenter(tile));
    return x > margin && y > margin && x < this.w - margin && y < this.h - margin;
  }

  animating() {
    return this.anims.length > 0;
  }

  // ---------- world building ----------

  disposeWorld() {
    if (!this.world) return;
    const dispose = (obj) => {
      obj.traverse((o) => {
        if (o.geometry && !Object.values(this.geo).includes(o.geometry)) o.geometry.dispose();
        if (o.isSprite && o.material) o.material.dispose();
      });
    };
    dispose(this.world.root);
    this.scene.remove(this.world.root);
    this.world = null;
  }

  buildWorld() {
    this.disposeWorld();
    const root = new THREE.Group();
    this.scene.add(root);
    this.world = {
      root,
      dyn: new THREE.Group(),
      units: new THREE.Group(),
      overlays: new THREE.Group(),
      fx: new THREE.Group(),
      unitObjs: new Map(),
      sig: {},
    };
    this.buildTerrain();
    this.buildWater();
    this.buildNature();
    this.buildFogCaps();
    root.add(this.world.dyn, this.world.units, this.world.overlays, this.world.fx);
    this.syncedVer = -1;
    this.lastOverlay = null;
  }

  tileColor(i) {
    const t = this.state.map.tiles[i];
    const c = new THREE.Color(TERRAIN_3D[t.t]);
    if (t.hills && t.t !== 'mountain') c.lerp(tmpColor.set('#8C7A4B'), 0.28);
    if (t.forest) c.lerp(tmpColor.set('#3D6B2E'), 0.38);
    const v = 0.94 + hash01(i, 3) * 0.12;
    return c.multiplyScalar(v);
  }

  buildTerrain() {
    const map = this.state.map;
    const N = map.tiles.length;
    const base = new Float32Array(N);
    map.tiles.forEach((t, i) => (base[i] = tileBase(t)));
    const colors = Array.from({ length: N }, (_, i) => this.tileColor(i));
    const cornerH = (i, k) => {
      let s = base[i];
      let n = 1;
      for (const d of CORNER_DIRS[k]) {
        const j = neighbor(map, i, d);
        if (j >= 0) {
          s += base[j];
          n++;
        }
      }
      return s / n;
    };
    const pos = [];
    const col = [];
    const idx = [];
    const vtiles = [];
    const push = (x, y, z, c, tiles) => {
      pos.push(x, y, z);
      col.push(c.r, c.g, c.b);
      vtiles.push(tiles);
      return vtiles.length - 1;
    };
    const tri = (a, b, c) => {
      const ax = pos[a * 3], az = pos[a * 3 + 2];
      const cross = (pos[b * 3 + 2] - az) * (pos[c * 3] - ax) - (pos[b * 3] - ax) * (pos[c * 3 + 2] - az);
      if (cross > 0) idx.push(a, b, c);
      else idx.push(a, c, b);
    };
    const cornerIndex = new Map();
    const centerY = new Float32Array(N);
    const corners = new Array(N);
    for (let i = 0; i < N; i++) {
      const t = map.tiles[i];
      const [cx, cz] = toPixel(map, i, 1);
      const lift = (t.hills && t.t !== 'mountain' ? 0.3 : 0) + (t.t === 'mountain' ? 0.14 : 0);
      const cy = base[i] + lift + (hash01(i, 1) - 0.5) * 0.02;
      centerY[i] = cy;
      const c = colors[i];
      const center = push(cx, cy, cz, c, [i]);
      const inner = [];
      const outer = [];
      corners[i] = [];
      for (let k = 0; k < 6; k++) {
        const [ox, oz] = corner(cx, cz, 1, k);
        const oy = cornerH(i, k);
        corners[i].push([ox, oy, oz]);
        const key = `${Math.round(ox * 1000)},${Math.round(oz * 1000)}`;
        let vi = cornerIndex.get(key);
        if (vi == null) {
          const tiles = [i, ...CORNER_DIRS[k].map((d) => neighbor(map, i, d)).filter((j) => j >= 0)];
          const cc = new THREE.Color(0, 0, 0);
          for (const j of tiles) cc.add(colors[j]);
          cc.multiplyScalar(1 / tiles.length);
          vi = push(ox, oy, oz, cc, tiles);
          cornerIndex.set(key, vi);
        }
        outer.push(vi);
        const f = 0.55;
        const ix = cx + (ox - cx) * f;
        const iz = cz + (oz - cz) * f;
        const bump = t.hills && t.t !== 'mountain' ? 0.72 : 0.45;
        const iy = oy + (cy - oy) * bump + (hash01(i, k + 10) - 0.5) * 0.025;
        inner.push(push(ix, iy, iz, c, [i]));
      }
      for (let k = 0; k < 6; k++) {
        const k2 = (k + 1) % 6;
        tri(center, inner[k], inner[k2]);
        tri(inner[k], outer[k], outer[k2]);
        tri(inner[k], outer[k2], inner[k2]);
      }
    }
    const uv = [];
    for (let v = 0; v < pos.length / 3; v++) uv.push(pos[v * 3] * 0.42, pos[v * 3 + 2] * 0.42);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    if (!this.groundTex) this.groundTex = groundDetailTexture();
    const terrain = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, map: this.groundTex }));
    terrain.receiveShadow = true;
    this.world.root.add(terrain);
    Object.assign(this.world, { terrain, baseColors: Float32Array.from(col), vtiles, centerY, corners, base });

    // Seabed and a dark skirt so the map edge never shows empty space.
    const b = this.mapBounds();
    const cx = b.w / PX / 2;
    const cz = b.h / PX / 2;
    const bed = new THREE.Mesh(this.geo.plane, this.lambert('#0F2E4A'));
    bed.scale.set(b.w / PX + 200, 1, b.h / PX + 200);
    bed.position.set(cx, -0.34, cz);
    this.world.root.add(bed);
  }

  buildWater() {
    const b = this.mapBounds();
    const mat = new THREE.MeshStandardMaterial({
      color: '#2E86BF',
      transparent: true,
      opacity: 0.58,
      roughness: 0.18,
      metalness: 0.05,
      normalMap: this.waterNormal,
      normalScale: new THREE.Vector2(0.35, 0.35),
      depthWrite: false,
    });
    this.waterNormal.repeat.set(24, 24);
    const water = new THREE.Mesh(this.geo.plane, mat);
    water.scale.set(b.w / PX + 200, 1, b.h / PX + 200);
    water.position.set(b.w / PX / 2, 0.0, b.h / PX / 2);
    water.renderOrder = 1;
    this.world.root.add(water);
    this.world.water = water;
  }

  // Forests and mountains: hundreds of instances, built once; fog changes only recolor or hide them.
  buildNature() {
    const map = this.state.map;
    const trees = [];
    const peaks = [];
    map.tiles.forEach((t, i) => {
      const [cx, cz] = toPixel(map, i, 1);
      const cy = this.world.centerY[i];
      if (t.forest) {
        const n = 6;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + hash01(i, k) * 0.8;
          const r = k === 0 ? 0.05 : 0.32 + hash01(i, k + 20) * 0.3;
          const x = cx + Math.cos(a) * r;
          const z = cz + Math.sin(a) * r;
          const y = cy * (1 - r) + this.world.base[i] * r + (t.hills ? 0.02 : 0);
          const s = 0.8 + hash01(i, k + 40) * 0.45;
          trees.push({ tile: i, x, y, z, s, shade: hash01(i, k + 60) });
        }
      }
      if (t.t === 'mountain') {
        const spots = [[0, 0, 1], [-0.42, 0.18, 0.7], [0.38, 0.24, 0.64], [0.05, -0.4, 0.6]];
        for (const [ox, oz, sh] of spots) {
          const s = sh * (0.9 + hash01(i, ox * 10 + oz) * 0.25);
          peaks.push({ tile: i, x: cx + ox, y: cy - 0.08, z: cz + oz, h: 0.95 * s, r: 0.42 * s, rot: hash01(i, sh * 7) * Math.PI });
        }
      }
    });

    const canopy = new THREE.InstancedMesh(this.geo.cone, new THREE.MeshLambertMaterial(), trees.length);
    const trunk = new THREE.InstancedMesh(this.geo.trunk, new THREE.MeshLambertMaterial({ color: '#6B4A2E' }), trees.length);
    trees.forEach((t, k) => {
      tmpQuat.setFromAxisAngle(UP, t.shade * 6);
      tmpMatrix.compose(tmpVec.set(t.x, t.y + 0.1 * t.s, t.z), tmpQuat, new THREE.Vector3(0.17 * t.s, 0.42 * t.s, 0.17 * t.s));
      canopy.setMatrixAt(k, tmpMatrix);
      canopy.setColorAt(k, tmpColor.set(t.shade < 0.33 ? '#2F6A33' : t.shade < 0.66 ? '#3B7C3A' : '#4C8A3C'));
      tmpMatrix.compose(tmpVec.set(t.x, t.y, t.z), tmpQuat, new THREE.Vector3(0.035 * t.s, 0.13 * t.s, 0.035 * t.s));
      trunk.setMatrixAt(k, tmpMatrix);
      trunk.setColorAt(k, tmpColor.set('#6B4A2E'));
    });
    const rock = new THREE.InstancedMesh(this.geo.peak, new THREE.MeshLambertMaterial({ flatShading: true }), peaks.length);
    const snow = new THREE.InstancedMesh(this.geo.peak, new THREE.MeshLambertMaterial({ flatShading: true }), peaks.length);
    peaks.forEach((p, k) => {
      tmpQuat.setFromAxisAngle(UP, p.rot);
      tmpMatrix.compose(tmpVec.set(p.x, p.y, p.z), tmpQuat, new THREE.Vector3(p.r, p.h, p.r));
      rock.setMatrixAt(k, tmpMatrix);
      rock.setColorAt(k, tmpColor.set(k % 2 ? '#7A746B' : '#8A847A'));
      const capH = p.h * 0.36;
      tmpMatrix.compose(tmpVec.set(p.x, p.y + p.h - capH + 0.004, p.z), tmpQuat, new THREE.Vector3(p.r * 0.365, capH, p.r * 0.365));
      snow.setMatrixAt(k, tmpMatrix);
      snow.setColorAt(k, tmpColor.set('#F4F3EE'));
    });
    for (const m of [canopy, trunk, rock, snow]) {
      m.castShadow = true;
      m.receiveShadow = true;
      this.world.root.add(m);
    }
    const snapshot = (m, list) => ({ mesh: m, tiles: list.map((x) => x.tile), matrices: Float32Array.from(m.instanceMatrix.array), colors: Float32Array.from(m.instanceColor.array) });
    this.world.instanced = [snapshot(canopy, trees), snapshot(trunk, trees), snapshot(rock, peaks), snapshot(snow, peaks)];
  }

  buildFogCaps() {
    const N = this.state.map.tiles.length;
    const mat = new THREE.MeshLambertMaterial({ map: this.parchment, color: '#FFFFFF' });
    const caps = new THREE.InstancedMesh(hexPrism(1.02, 0.9), mat, N);
    const matrices = new Float32Array(N * 16);
    for (let i = 0; i < N; i++) {
      const [x, z] = toPixel(this.state.map, i, 1);
      tmpMatrix.compose(tmpVec.set(x, 0.12, z), tmpQuat.identity(), new THREE.Vector3(1, 1, 1));
      tmpMatrix.toArray(matrices, i * 16);
      caps.setMatrixAt(i, tmpMatrix);
    }
    caps.receiveShadow = true;
    this.world.root.add(caps);
    this.world.caps = caps;
    this.world.capMatrices = matrices;
  }

  // ---------- keeping the scene in step with the game ----------

  fogState() {
    const s = this.state;
    const N = s.map.tiles.length;
    const fog = new Uint8Array(N); // 0 visible, 1 remembered, 2 unexplored
    if (this.revealAll) return fog;
    const vis = visibleTiles(s, this.viewer);
    const ex = s.players[this.viewer].explored;
    for (let i = 0; i < N; i++) fog[i] = vis[i] ? 0 : ex[i] ? 1 : 2;
    return fog;
  }

  sync() {
    const s = this.state;
    const w = this.world;
    const fog = this.fogState();
    this.fog = fog;
    const fogSig = fog.join('');
    const tiles = s.map.tiles;
    let featSig = '';
    let ownSig = '';
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      if (t.imp || t.district) featSig += `${i}${t.imp || ''}${t.district || ''};`;
      ownSig += `${t.owner},`;
    }
    let citySig = '';
    for (const c of Object.values(s.cities)) citySig += `${c.id}:${c.owner}:${c.pop}:${c.name}:${c.capital}:${wallLevel(c)}:${Math.round(c.hp)};`;
    const fogChanged = w.sig.fog !== fogSig;
    if (fogChanged) this.applyFog(fog);
    if (fogChanged || w.sig.feat !== featSig || w.sig.city !== citySig || w.sig.own !== ownSig) this.buildDynamic(fog);
    w.sig = { fog: fogSig, feat: featSig, city: citySig, own: ownSig };
    this.syncUnits(fog);
  }

  applyFog(fog) {
    const w = this.world;
    const geo = w.terrain.geometry;
    const colors = geo.attributes.color;
    const out = new THREE.Color();
    const c = new THREE.Color();
    for (let v = 0; v < w.vtiles.length; v++) {
      let f = 0;
      for (const t of w.vtiles[v]) f += fog[t] ? 1 : 0;
      f /= w.vtiles[v].length;
      c.setRGB(w.baseColors[v * 3], w.baseColors[v * 3 + 1], w.baseColors[v * 3 + 2]);
      if (f > 0) c.lerp(sepia(c, out), f * 0.85).multiplyScalar(1 - f * 0.28);
      colors.setXYZ(v, c.r, c.g, c.b);
    }
    colors.needsUpdate = true;
    for (const inst of w.instanced) {
      const { mesh, tiles, matrices, colors: base } = inst;
      for (let k = 0; k < tiles.length; k++) {
        const f = fog[tiles[k]];
        if (f === 2) mesh.setMatrixAt(k, tmpMatrix.makeScale(0, 0, 0));
        else mesh.setMatrixAt(k, tmpMatrix.fromArray(matrices, k * 16));
        c.setRGB(base[k * 3], base[k * 3 + 1], base[k * 3 + 2]);
        if (f === 1) c.lerp(sepia(c, out), 0.8).multiplyScalar(0.75);
        mesh.setColorAt(k, c);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
    }
    const caps = w.caps;
    for (let i = 0; i < fog.length; i++) {
      if (fog[i] === 2) caps.setMatrixAt(i, tmpMatrix.fromArray(w.capMatrices, i * 16));
      else caps.setMatrixAt(i, tmpMatrix.makeScale(0, 0, 0));
    }
    caps.instanceMatrix.needsUpdate = true;
  }

  // Cities, districts, improvements, resources, borders and the hex grid. Rebuilt on change.
  buildDynamic(fog) {
    const w = this.world;
    w.dyn.traverse((o) => {
      if (o.geometry && !Object.values(this.geo).includes(o.geometry)) o.geometry.dispose();
      if (o.isSprite) o.material.dispose();
    });
    w.dyn.clear();
    const s = this.state;
    const map = s.map;
    const dim = (i) => fog[i] === 1;
    const bodies = [];
    const roofs = [];
    const walls = [];
    const cyls = [];
    const farms = [];
    const mines = [];
    const mills = [];
    const addBuilding = (list, rlist, x, y, z, bw, bh, bd, rot, color, roofColor, roofH, tile) => {
      list.push({ x, y, z, sx: bw, sy: bh, sz: bd, rot, color, tile });
      rlist.push({ x, y: y + bh, z, sx: bw * 1.18, sy: roofH, sz: bd * 1.18, rot, color: roofColor, tile });
    };

    map.tiles.forEach((t, i) => {
      if (fog[i] === 2) return;
      const [cx, cz] = toPixel(map, i, 1);
      const cy = w.centerY[i];
      if (t.district) {
        const r = seeded(i * 31 + 7);
        const roofColor = DISTRICT_COLORS[t.district];
        if (t.district === 'harbor') {
          // A wooden pier on the water with a warehouse and a crane.
          bodies.push({ x: cx, y: -0.05, z: cz, sx: 0.95, sy: 0.09, sz: 0.3, rot: 0.5, color: '#8A6A48', tile: i });
          bodies.push({ x: cx + 0.12, y: -0.05, z: cz + 0.2, sx: 0.22, sy: 0.09, sz: 0.5, rot: 0.5, color: '#7B5D3E', tile: i });
          addBuilding(bodies, roofs, cx - 0.2, 0.04, cz - 0.02, 0.26, 0.16, 0.2, 0.5, '#EFE7D5', roofColor, 0.1, i);
          bodies.push({ x: cx + 0.28, y: 0.04, z: cz - 0.16, sx: 0.04, sy: 0.5, sz: 0.04, rot: 0, color: '#5B4A3A', tile: i });
          bodies.push({ x: cx + 0.2, y: 0.52, z: cz - 0.16, sx: 0.36, sy: 0.035, sz: 0.035, rot: 0.5, color: '#5B4A3A', tile: i });
        } else {
          const spots = [[-0.28, -0.12], [0.24, -0.2], [0.02, 0.26], [-0.32, 0.3], [0.36, 0.22]];
          spots.forEach(([ox, oz], k) => {
            if (t.district === 'theater' && k === 2) return;
            const bw = 0.2 + r() * 0.1;
            const bh = (k === 1 ? 0.34 : 0.14) + r() * 0.12;
            addBuilding(bodies, roofs, cx + ox, cy - 0.02, cz + oz, bw, bh, bw * (0.8 + r() * 0.4), r() * 0.6, '#EFE7D5', roofColor, 0.12, i);
          });
          // Landmarks: smokestacks for industry, an open-air stage for theater.
          if (t.district === 'industrial') {
            cyls.push({ x: cx + 0.02, y: cy - 0.02, z: cz - 0.02, sx: 0.05, sy: 0.62, sz: 0.05, color: '#7A4A3A', tile: i });
            cyls.push({ x: cx - 0.1, y: cy - 0.02, z: cz + 0.08, sx: 0.04, sy: 0.5, sz: 0.04, color: '#6A4032', tile: i });
          } else if (t.district === 'theater') {
            cyls.push({ x: cx + 0.02, y: cy - 0.03, z: cz + 0.22, sx: 0.24, sy: 0.08, sz: 0.24, color: '#D8CDB4', tile: i });
            cyls.push({ x: cx + 0.02, y: cy - 0.01, z: cz + 0.22, sx: 0.15, sy: 0.08, sz: 0.15, color: '#9B7FB8', tile: i });
          }
        }
        const badge = this.sprite(`district:${t.district}`, 44, 44, (ctx) => {
          ctx.fillStyle = DISTRICT_COLORS[t.district];
          ctx.beginPath();
          ctx.arc(22, 22, 19, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 3;
          ctx.stroke();
          drawDistrictSymbol(ctx, t.district, 22, 22, 11, '#fff');
        }, { world: 0.34, dim: dim(i) });
        badge.position.set(cx - 0.45, cy + 0.72, cz - 0.3);
        w.dyn.add(badge);
      } else if (t.imp === 'farm') farms.push({ i, cx, cy, cz });
      else if (t.imp === 'mine') mines.push({ i, cx, cy, cz });
      else if (t.imp === 'lumbermill') mills.push({ i, cx, cy, cz });
      if (t.res && !t.district && !cityAt(s, i)) {
        const sp = this.sprite(`res:${t.res}`, 24, 24, (ctx) => drawResource(ctx, t.res, 12, 12, 10.5), { dim: dim(i), depthTest: true });
        sp.position.set(cx + 0.46, cy + 0.2, cz + 0.36);
        w.dyn.add(sp);
      }
    });

    for (const c of Object.values(s.cities)) {
      if (fog[c.tile] === 2) continue;
      const p = s.players[c.owner];
      const [cx, cz] = toPixel(map, c.tile, 1);
      const cy = w.centerY[c.tile];
      const r = seeded(c.id * 97 + 13);
      const roofColor = `#${new THREE.Color('#B04E36').lerp(new THREE.Color(p.color), 0.35).getHexString()}`;
      const n = Math.min(18, 6 + c.pop * 2);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + r() * 0.5;
        const rad = 0.28 + r() * 0.52;
        const bw = 0.13 + r() * 0.08;
        addBuilding(bodies, roofs, cx + Math.cos(a) * rad, cy - 0.02, cz + Math.sin(a) * rad * 0.9, bw, 0.1 + r() * 0.12 + c.pop * 0.006, bw * (0.8 + r() * 0.5), r() * Math.PI, '#F0E6D0', roofColor, 0.1, c.tile);
      }
      const towerH = c.capital ? 0.62 : 0.4;
      addBuilding(bodies, roofs, cx, cy - 0.02, cz - 0.02, 0.2, towerH, 0.2, 0.2, '#E8DDC4', c.capital ? '#D9A93A' : roofColor, 0.2, c.tile);
      const lvl = wallLevel(c);
      if (lvl) {
        // Walls, then taller Castle walls, then a Star Fort's darker, thicker ramparts.
        const stone = lvl === 3 ? ['#8C8577', '#7A7366'] : ['#A69E8C', '#978F7E'];
        for (let k = 0; k < 6; k++) {
          const [ax, az] = corner(cx, cz, 0.9, k);
          const [bx, bz] = corner(cx, cz, 0.9, (k + 1) % 6);
          walls.push({ x: (ax + bx) / 2, y: cy - 0.05, z: (az + bz) / 2, sx: 0.9, sy: 0.1 + lvl * 0.05, sz: 0.05 + lvl * 0.025, rot: -Math.atan2(bz - az, bx - ax), color: stone[0], tile: c.tile });
          walls.push({ x: ax, y: cy - 0.05, z: az, sx: 0.1 + lvl * 0.03, sy: 0.16 + lvl * 0.07, sz: 0.1 + lvl * 0.03, rot: lvl === 3 ? Math.PI / 4 : 0, color: stone[1], tile: c.tile });
        }
      }
      const banner = this.cityBanner(c, dim(c.tile));
      banner.position.set(cx, cy + 1.05, cz);
      w.dyn.add(banner);
    }

    const instanced = (geo, list, cast = true) => {
      if (!list.length) return;
      const m = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial(), list.length);
      const out = new THREE.Color();
      list.forEach((b, k) => {
        tmpQuat.setFromAxisAngle(UP, b.rot || 0);
        tmpMatrix.compose(tmpVec.set(b.x, b.y, b.z), tmpQuat, new THREE.Vector3(b.sx, b.sy, b.sz));
        m.setMatrixAt(k, tmpMatrix);
        tmpColor.set(b.color);
        if (dim(b.tile)) tmpColor.lerp(sepia(tmpColor, out), 0.8).multiplyScalar(0.72);
        m.setColorAt(k, tmpColor);
      });
      m.castShadow = cast;
      m.receiveShadow = true;
      w.dyn.add(m);
    };
    instanced(this.geo.box, bodies);
    instanced(this.geo.roof, roofs);
    instanced(this.geo.box, walls);
    instanced(this.geo.cyl, cyls);

    if (farms.length) {
      const m = new THREE.InstancedMesh(this.geo.plane, this.mat('farm', () => new THREE.MeshLambertMaterial({ map: this.farmTex, transparent: true, polygonOffset: true, polygonOffsetFactor: -2 })), farms.length);
      farms.forEach((f, k) => {
        tmpQuat.setFromAxisAngle(UP, hash01(f.i, 5) * Math.PI);
        tmpMatrix.compose(tmpVec.set(f.cx, f.cy + 0.012, f.cz), tmpQuat, new THREE.Vector3(1.0, 1, 0.78));
        m.setMatrixAt(k, tmpMatrix);
        m.setColorAt(k, tmpColor.set(dim(f.i) ? '#9A8C70' : '#FFFFFF'));
      });
      m.receiveShadow = true;
      w.dyn.add(m);
    }
    if (mines.length) {
      const list = [];
      mines.forEach((f) => {
        list.push({ x: f.cx + 0.22, y: f.cy - 0.04, z: f.cz + 0.12, sx: 0.26, sy: 0.16, sz: 0.2, rot: 0.3, color: '#4A3F36', tile: f.i });
        list.push({ x: f.cx - 0.12, y: f.cy - 0.05, z: f.cz + 0.22, sx: 0.16, sy: 0.12, sz: 0.16, rot: 0.8, color: '#9C8F7C', tile: f.i });
      });
      instanced(this.geo.box, list);
    }
    if (mills.length) {
      const list = [];
      mills.forEach((f) => {
        for (let k = 0; k < 3; k++) list.push({ x: f.cx + 0.2, y: f.cy - 0.02 + k * 0.05, z: f.cz + 0.18 + (k % 2) * 0.03, sx: 0.3, sy: 0.05, sz: 0.1, rot: 0.4, color: k % 2 ? '#8A5E3B' : '#9C6C44', tile: f.i });
        list.push({ x: f.cx - 0.18, y: f.cy - 0.03, z: f.cz + 0.24, sx: 0.2, sy: 0.14, sz: 0.16, rot: 0.4, color: '#6E5238', tile: f.i });
      });
      instanced(this.geo.box, list);
    }

    this.buildBorders(fog);
    this.buildGrid(fog);
    this.buildShore(fog);
  }

  // A band of surf where land meets water, drawn just above the water line.
  buildShore(fog) {
    const map = this.state.map;
    const w = this.world;
    const water = (t) => t.t === 'coast' || t.t === 'ocean';
    const pos = [];
    const col = [];
    const idx = [];
    map.tiles.forEach((t, i) => {
      if (water(t) || fog[i] === 2) return;
      const cs = w.corners[i];
      for (let d = 0; d < 6; d++) {
        const n = neighbor(map, i, d);
        if (n < 0 || !water(map.tiles[n])) continue;
        const [nx, nz] = toPixel(map, n, 1);
        const [ka, kb] = EDGE_CORNERS[d];
        const out = (c, f) => [c[0] + (nx - c[0]) * f, 0.012, c[2] + (nz - c[2]) * f];
        const a = out(cs[ka], -0.05);
        const b = out(cs[kb], -0.05);
        const c = out(cs[kb], 0.2);
        const e = out(cs[ka], 0.2);
        const base = pos.length / 3;
        pos.push(...a, ...b, ...c, ...e);
        col.push(1, 1, 1, 0.55, 1, 1, 1, 0.55, 1, 1, 1, 0, 1, 1, 1, 0);
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    });
    if (!pos.length) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
    geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, this.mat('shore', () => new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide })));
    mesh.renderOrder = 1;
    w.dyn.add(mesh);
  }

  buildBorders(fog) {
    const s = this.state;
    const map = s.map;
    const w = this.world;
    const pos = [];
    const col = [];
    const idx = [];
    const quad = (a, b, c, d, color, alphaOuter, alphaInner) => {
      const base = pos.length / 3;
      pos.push(...a, ...b, ...c, ...d);
      col.push(color.r, color.g, color.b, alphaOuter, color.r, color.g, color.b, alphaOuter, color.r, color.g, color.b, alphaInner, color.r, color.g, color.b, alphaInner);
      idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
    };
    const lerp3 = (p, q, f, lift) => [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f + lift, p[2] + (q[2] - p[2]) * f];
    map.tiles.forEach((t, i) => {
      if (t.owner < 0 || fog[i] === 2) return;
      const color = new THREE.Color(s.players[t.owner].color);
      const [cx, cz] = toPixel(map, i, 1);
      const center = [cx, w.centerY[i], cz];
      const cs = w.corners[i];
      for (let d = 0; d < 6; d++) {
        const n = neighbor(map, i, d);
        if (n >= 0 && map.tiles[n].owner === t.owner) continue;
        const [ka, kb] = EDGE_CORNERS[d];
        const a = [cs[ka][0], Math.max(cs[ka][1], 0.02), cs[ka][2]];
        const b = [cs[kb][0], Math.max(cs[kb][1], 0.02), cs[kb][2]];
        const ca = [center[0], Math.max(center[1], 0.02), center[2]];
        // A solid line on the edge and a soft glow fading into the territory.
        quad(lerp3(a, ca, 0.02, 0.035), lerp3(b, ca, 0.02, 0.035), lerp3(b, ca, 0.1, 0.035), lerp3(a, ca, 0.1, 0.035), color, 1, 1);
        quad(lerp3(a, ca, 0.1, 0.03), lerp3(b, ca, 0.1, 0.03), lerp3(b, ca, 0.34, 0.03), lerp3(a, ca, 0.34, 0.03), color, 0.45, 0);
      }
    });
    if (!pos.length) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
    geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, this.mat('border', () => new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4 })));
    mesh.renderOrder = 2;
    w.dyn.add(mesh);
  }

  buildGrid(fog) {
    const map = this.state.map;
    const w = this.world;
    const pos = [];
    map.tiles.forEach((t, i) => {
      if (fog[i] === 2 || t.t === 'ocean' || t.t === 'coast') return;
      const cs = w.corners[i];
      for (let k = 0; k < 3; k++) {
        const a = cs[k];
        const b = cs[(k + 1) % 6];
        pos.push(a[0], a[1] + 0.012, a[2], b[0], b[1] + 0.012, b[2]);
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const lines = new THREE.LineSegments(geo, this.mat('grid', () => new THREE.LineBasicMaterial({ color: '#1A2410', transparent: true, opacity: 0.16, depthWrite: false })));
    w.dyn.add(lines);
  }

  // ---------- sprites (constant screen size unless `world` is given) ----------

  texture(key, w, h, draw) {
    let t = this.textures.get(key);
    if (!t) {
      t = canvasTexture(w, h, draw);
      this.textures.set(key, t);
      if (this.textures.size > 600) {
        const first = this.textures.keys().next().value;
        this.textures.get(first).tex.dispose();
        this.textures.delete(first);
      }
    }
    return t;
  }

  sprite(key, w, h, draw, { world = 0, dim = false, depthTest = false, anchorY = 0.5 } = {}) {
    const t = this.texture(key, w, h, draw);
    const mat = new THREE.SpriteMaterial({ map: t.tex, depthTest, depthWrite: false, sizeAttenuation: !!world, transparent: true, color: dim ? '#8C8474' : '#FFFFFF' });
    const sp = new THREE.Sprite(mat);
    sp.center.set(0.5, anchorY);
    if (world) sp.scale.set(world * (w / h), world, 1);
    else sp.userData.px = [w, h];
    sp.renderOrder = depthTest ? 3 : 20;
    return sp;
  }

  cityBanner(c, dim) {
    const s = this.state;
    const p = s.players[c.owner];
    const maxHp = cityMaxHp(s, c);
    const hurt = c.hp < maxHp;
    const font = '600 15px "Instrument Sans", system-ui, sans-serif';
    const measure = document.createElement('canvas').getContext('2d');
    measure.font = font;
    const nameW = Math.ceil(measure.measureText(c.name).width);
    const bw = nameW + 64;
    const bh = hurt ? 38 : 30;
    const key = `city:${c.name}:${c.pop}:${p.color}:${c.capital}:${hurt ? Math.round((c.hp / maxHp) * 20) : 'x'}:${document.fonts?.status}`;
    return this.sprite(key, bw, bh + 10, (ctx) => {
      const y = c.capital ? 10 : 4;
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      roundRect(ctx, 2, y + 2, bw - 4, 26, 13);
      ctx.fill();
      ctx.fillStyle = p.color;
      roundRect(ctx, 1, y, bw - 4, 26, 13);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.6)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.beginPath();
      ctx.arc(14, y + 13, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '700 13px "JetBrains Mono", Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(c.pop), 14, y + 14);
      ctx.font = font;
      ctx.textAlign = 'left';
      ctx.fillText(c.name, 30, y + 14);
      drawEmblem(ctx, p.emblem, bw - 18, y + 13, 7, '#fff');
      if (c.capital) {
        ctx.fillStyle = '#F2C94C';
        ctx.beginPath();
        for (let k = 0; k < 10; k++) {
          const a = -Math.PI / 2 + (k * Math.PI) / 5;
          const rr = k % 2 ? 3 : 7;
          ctx.lineTo(bw / 2 + Math.cos(a) * rr, 6 + Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
      }
      if (hurt) {
        const f = c.hp / maxHp;
        ctx.fillStyle = 'rgba(0,0,0,.6)';
        ctx.fillRect(bw * 0.15, y + 30, bw * 0.7, 6);
        ctx.fillStyle = f > 0.6 ? '#5CC46A' : f > 0.3 ? '#E8C24A' : '#E0564A';
        ctx.fillRect(bw * 0.15 + 1, y + 31, (bw * 0.7 - 2) * f, 4);
      }
    }, { dim, anchorY: 0 });
  }

  unitFlag(u, selected) {
    const s = this.state;
    const p = s.players[u.owner];
    const civilian = UNITS[u.type].cls === 'civilian';
    const mine = u.owner === this.viewer && !this.revealAll;
    let status = '';
    if (mine) {
      if (u.fortified) status = 'F';
      else if (u.sleeping) status = 'z';
      else if (u.moves > 0 && !u.path && u.skipped !== s.turn) status = 'go';
    }
    const hp = Math.round(u.hp / 10);
    const key = `unit:${u.type}:${p.color}:${p.emblem}:${hp}:${status}:${selected}`;
    return this.texture(key, 44, 52, (ctx) => {
      const cx = 22;
      const cy = 20;
      const r = 15;
      if (selected) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath();
      ctx.arc(cx + 1, cy + 2, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = civilian ? '#F4EEDF' : p.color;
      ctx.beginPath();
      if (civilian) roundRect(ctx, cx - r, cy - r, r * 2, r * 2, 7);
      else ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = civilian ? p.color : 'rgba(255,255,255,.9)';
      ctx.lineWidth = civilian ? 2.5 : 1.8;
      ctx.stroke();
      drawUnitGlyph(ctx, u.type, cx, cy, r * 0.7, civilian ? p.color : '#FFFFFF');
      ctx.fillStyle = 'rgba(15,20,28,.92)';
      ctx.beginPath();
      ctx.arc(cx + r * 0.8, cy + r * 0.75, 6, 0, Math.PI * 2);
      ctx.fill();
      drawEmblem(ctx, p.emblem, cx + r * 0.8, cy + r * 0.75, 4, p.color);
      if (u.hp < 100) {
        const f = u.hp / 100;
        ctx.fillStyle = 'rgba(0,0,0,.65)';
        ctx.fillRect(cx - 14, cy + r + 5, 28, 5);
        ctx.fillStyle = f > 0.6 ? '#5CC46A' : f > 0.3 ? '#E8C24A' : '#E0564A';
        ctx.fillRect(cx - 13, cy + r + 6, 26 * f, 3);
      }
      if (status) {
        ctx.fillStyle = status === 'go' ? '#7BE08A' : 'rgba(15,20,28,.92)';
        ctx.beginPath();
        ctx.arc(cx - r * 0.85, cy - r * 0.8, status === 'go' ? 4 : 6, 0, Math.PI * 2);
        ctx.fill();
        if (status !== 'go') {
          ctx.fillStyle = '#D8DEE4';
          ctx.font = '700 8px "JetBrains Mono", Consolas, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(status, cx - r * 0.85, cy - r * 0.78);
        }
      }
    });
  }

  // Low-poly figures for a unit, in its owner's color.
  unitModel(u) {
    const p = this.state.players[u.owner];
    const g = new THREE.Group();
    const body = this.lambert(p.color);
    const skin = this.lambert(SKIN);
    const wood = this.lambert('#7A5433');
    const cloth = this.lambert('#EDE3C8');
    const pawn = (x, z, s = 1, mat = body) => {
      const b = new THREE.Mesh(this.geo.cone, mat);
      b.scale.set(0.07 * s, 0.2 * s, 0.07 * s);
      b.position.set(x, 0, z);
      const hd = new THREE.Mesh(this.geo.sphere, skin);
      hd.scale.setScalar(0.042 * s);
      hd.position.set(x, 0.22 * s, z);
      b.castShadow = hd.castShadow = true;
      g.add(b, hd);
    };
    const def = UNITS[u.type];
    const model = def.model || 'squad';
    const metal = this.lambert('#3C4046');
    const wheels = (spots) => {
      for (const [x, z] of spots) {
        const wh = new THREE.Mesh(this.geo.wheel, this.lambert('#3E2F22'));
        wh.scale.set(0.02, 0.05, 0.05);
        wh.rotation.y = Math.PI / 2;
        wh.position.set(x, 0.05, z);
        g.add(wh);
      }
    };
    if (model === 'settler') {
      const cart = new THREE.Mesh(this.geo.box, wood);
      cart.scale.set(0.26, 0.08, 0.14);
      cart.position.set(0.05, 0.04, 0);
      const top = new THREE.Mesh(this.geo.cyl, cloth);
      top.scale.set(0.07, 0.24, 0.07);
      top.rotation.z = Math.PI / 2;
      top.position.set(0.17, 0.12, 0);
      for (const [x, z] of [[-0.03, 0.08], [0.13, 0.08], [-0.03, -0.08], [0.13, -0.08]]) {
        const wh = new THREE.Mesh(this.geo.wheel, this.lambert('#3E2F22'));
        wh.scale.set(0.02, 0.05, 0.05);
        wh.rotation.y = Math.PI / 2;
        wh.position.set(x, 0.05, z);
        g.add(wh);
      }
      cart.castShadow = top.castShadow = true;
      g.add(cart, top);
      pawn(-0.16, 0.02, 0.9, this.lambert('#C9B48A'));
    } else if (model === 'builder') {
      pawn(0, 0, 1, this.lambert('#C9B48A'));
      const tool = new THREE.Mesh(this.geo.cyl, wood);
      tool.scale.set(0.01, 0.22, 0.01);
      tool.rotation.z = -0.5;
      tool.position.set(0.05, 0.06, 0);
      g.add(tool);
    } else if (model === 'siege') {
      const base = new THREE.Mesh(this.geo.box, wood);
      base.scale.set(0.3, 0.07, 0.18);
      base.position.y = 0.05;
      const arm = new THREE.Mesh(this.geo.box, wood);
      arm.scale.set(0.03, 0.32, 0.03);
      arm.rotation.z = -0.7;
      arm.position.set(-0.02, 0.1, 0);
      for (const [x, z] of [[-0.1, 0.1], [0.1, 0.1], [-0.1, -0.1], [0.1, -0.1]]) {
        const wh = new THREE.Mesh(this.geo.wheel, this.lambert('#3E2F22'));
        wh.scale.set(0.02, 0.05, 0.05);
        wh.rotation.y = Math.PI / 2;
        wh.position.set(x, 0.05, z);
        g.add(wh);
      }
      base.castShadow = arm.castShadow = true;
      g.add(base, arm);
      pawn(0.2, 0.12, 0.85);
    } else if (model === 'cannon') {
      const carriage = new THREE.Mesh(this.geo.box, wood);
      carriage.scale.set(0.2, 0.06, 0.12);
      carriage.position.set(0, 0.04, 0);
      const barrel = new THREE.Mesh(this.geo.cyl, metal);
      barrel.scale.set(0.035, 0.3, 0.035);
      barrel.rotation.z = -Math.PI / 2 + 0.22;
      barrel.position.set(-0.08, 0.09, 0);
      wheels([[-0.02, 0.09], [-0.02, -0.09]]);
      carriage.castShadow = barrel.castShadow = true;
      g.add(carriage, barrel);
      pawn(-0.16, 0.12, 0.85);
      pawn(-0.18, -0.12, 0.85);
    } else if (model === 'tank') {
      const hull = new THREE.Mesh(this.geo.box, body);
      hull.scale.set(0.34, 0.08, 0.2);
      hull.position.y = 0.035;
      hull.castShadow = true;
      g.add(hull);
      for (const z of [0.11, -0.11]) {
        const track = new THREE.Mesh(this.geo.box, metal);
        track.scale.set(0.36, 0.07, 0.05);
        track.position.set(0, 0, z);
        track.castShadow = true;
        g.add(track);
      }
      if (def.cls === 'ranged') {
        const rack = new THREE.Mesh(this.geo.box, metal);
        rack.scale.set(0.2, 0.08, 0.14);
        rack.rotation.z = 0.4;
        rack.position.set(-0.03, 0.12, 0);
        rack.castShadow = true;
        g.add(rack);
      } else {
        const turret = new THREE.Mesh(this.geo.box, body);
        turret.scale.set(0.15, 0.07, 0.13);
        turret.position.set(-0.02, 0.115, 0);
        const gun = new THREE.Mesh(this.geo.cyl, metal);
        gun.scale.set(0.018, 0.22, 0.018);
        gun.rotation.z = -Math.PI / 2;
        gun.position.set(0.05, 0.15, 0);
        turret.castShadow = gun.castShadow = true;
        g.add(turret, gun);
      }
    } else if (model === 'riders') {
      for (const [x, z] of [[-0.12, 0.08], [0.14, -0.06]]) {
        const horse = new THREE.Mesh(this.geo.box, this.lambert('#7B5536'));
        horse.scale.set(0.2, 0.09, 0.07);
        horse.position.set(x, 0.07, z);
        const head = new THREE.Mesh(this.geo.box, this.lambert('#6A4830'));
        head.scale.set(0.06, 0.09, 0.05);
        head.position.set(x + 0.11, 0.13, z);
        horse.castShadow = head.castShadow = true;
        g.add(horse, head);
        const rider = new THREE.Group();
        g.add(rider);
        const b = new THREE.Mesh(this.geo.cone, body);
        b.scale.set(0.055, 0.15, 0.055);
        b.position.set(x, 0.15, z);
        const hd = new THREE.Mesh(this.geo.sphere, skin);
        hd.scale.setScalar(0.035);
        hd.position.set(x, 0.32, z);
        b.castShadow = true;
        g.add(b, hd);
      }
    } else if (model === 'pawn') {
      pawn(0, 0, 1);
    } else {
      pawn(-0.12, 0.08);
      pawn(0.12, 0.08);
      pawn(0, -0.1, 1.1);
      // The leader's weapon tells unit lines apart: club, sword, spear, bow or rifle.
      const kind = def.glyph;
      const weapon = new THREE.Mesh(this.geo.cyl, kind === 'swordsman' ? this.lambert('#C9CED6') : kind === 'gun' ? metal : wood);
      const long = kind === 'spear';
      weapon.scale.set(0.012, long ? 0.42 : kind === 'gun' ? 0.2 : 0.26, 0.012);
      weapon.rotation.z = kind === 'archer' ? 0 : long ? -0.12 : kind === 'gun' ? -0.9 : -0.35;
      weapon.position.set(0.06, long ? 0 : 0.06, -0.1);
      g.add(weapon);
    }
    const flag = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, depthWrite: false, sizeAttenuation: false, transparent: true }));
    flag.center.set(0.5, 0);
    flag.renderOrder = 30;
    flag.position.y = 0.42;
    g.add(flag);
    for (const c of g.children) if (c !== flag) c.scale.multiplyScalar(1.55), c.position.multiplyScalar(1.55);
    flag.position.y = 0.6;
    g.userData = { flag, owner: u.owner, type: u.type };
    return g;
  }

  syncUnits(fog) {
    const s = this.state;
    const w = this.world;
    const seen = new Set();
    for (const u of Object.values(s.units)) {
      seen.add(u.id);
      let g = w.unitObjs.get(u.id);
      if (g && (g.userData.owner !== u.owner || g.userData.type !== u.type)) {
        w.units.remove(g);
        g = null;
      }
      if (!g) {
        g = this.unitModel(u);
        w.unitObjs.set(u.id, g);
        w.units.add(g);
      }
      g.visible = this.revealAll || fog[u.tile] === 0;
      const t = this.unitFlag(u, this.overlay.selectedUnit === u.id);
      const flag = g.userData.flag;
      if (flag.material.map !== t.tex) {
        flag.material.map = t.tex;
        flag.material.needsUpdate = true;
      }
      flag.userData.px = [t.w, t.h];
    }
    for (const [id, g] of w.unitObjs) {
      if (!seen.has(id)) {
        w.units.remove(g);
        w.unitObjs.delete(id);
      }
    }
  }

  // Where a unit stands (tile center plus a sideways offset when two units share a tile).
  unitSpot(u, tile) {
    const s = this.state;
    const [x, z] = toPixel(s.map, tile, 1);
    const civ = UNITS[u.type].cls === 'civilian';
    const other = civ ? militaryAt(s, tile) : civilianAt(s, tile);
    const city = cityAt(s, tile);
    let ox = 0;
    let oz = 0;
    if (other && other.id !== u.id) {
      ox = civ ? 0.3 : -0.26;
      oz = civ ? 0.22 : -0.12;
    } else if (city) {
      ox = civ ? 0.32 : 0;
      oz = civ ? 0.3 : 0.36;
    }
    return [x + ox, this.world.centerY[tile] - 0.02, z + oz];
  }

  placeUnits(now) {
    const w = this.world;
    for (const [id, g] of w.unitObjs) {
      const u = this.state.units[id];
      if (!u) continue;
      let p = this.unitSpot(u, u.tile);
      for (const a of this.anims) {
        if (a.unit !== id || now < a.start) continue;
        const t = Math.min(1, (now - a.start) / a.dur);
        if (a.kind === 'move') {
          const f = t * (a.tiles.length - 1);
          const k = Math.min(a.tiles.length - 2, Math.floor(f));
          const p1 = this.unitSpot(u, a.tiles[k]);
          const p2 = this.unitSpot(u, a.tiles[k + 1]);
          const e = f - k;
          p = [p1[0] + (p2[0] - p1[0]) * e, p1[1] + (p2[1] - p1[1]) * e + Math.sin(e * Math.PI) * 0.06, p1[2] + (p2[2] - p1[2]) * e];
          g.rotation.y = -Math.atan2(p2[2] - p1[2], p2[0] - p1[0]);
        } else if (a.kind === 'lunge' && !a.ranged) {
          const [tx, tz] = toPixel(this.state.map, a.to, 1);
          const push = Math.sin(t * Math.PI) * 0.35;
          p = [p[0] + (tx - p[0]) * push, p[1], p[2] + (tz - p[2]) * push];
        }
      }
      g.position.set(p[0], p[1], p[2]);
      const flag = g.userData.flag;
      const [fw, fh] = flag.userData.px || [44, 52];
      flag.scale.set(fw * this.pxScale, fh * this.pxScale, 1);
    }
  }

  // ---------- overlays ----------

  hexFill(tiles, color, opacity, inset = 0.9, lift = 0.03) {
    const map = this.state.map;
    const w = this.world;
    const pos = [];
    const idx = [];
    for (const i of tiles) {
      if (i < 0) continue;
      const [cx, cz] = toPixel(map, i, 1);
      const cy = Math.max(w.centerY[i], 0.02);
      const b = pos.length / 3;
      pos.push(cx, cy + lift, cz);
      for (let k = 0; k < 6; k++) {
        const c = w.corners[i][k];
        pos.push(cx + (c[0] - cx) * inset, Math.max(c[1], 0.02) + lift, cz + (c[2] - cz) * inset);
      }
      for (let k = 0; k < 6; k++) idx.push(b, b + 1 + ((k + 1) % 6), b + 1 + k);
    }
    if (!pos.length) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -6 }));
    mesh.renderOrder = 4;
    return mesh;
  }

  hexOutline(tiles, color, opacity, inset = 0.9, lift = 0.04) {
    const map = this.state.map;
    const w = this.world;
    const pos = [];
    for (const i of tiles) {
      if (i < 0) continue;
      const [cx, cz] = toPixel(map, i, 1);
      for (let k = 0; k < 6; k++) {
        const a = w.corners[i][k];
        const b = w.corners[i][(k + 1) % 6];
        pos.push(cx + (a[0] - cx) * inset, Math.max(a[1], 0.02) + lift, cz + (a[2] - cz) * inset);
        pos.push(cx + (b[0] - cx) * inset, Math.max(b[1], 0.02) + lift, cz + (b[2] - cz) * inset);
      }
    }
    if (!pos.length) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
    lines.renderOrder = 5;
    return lines;
  }

  badge(text, color, px = 15) {
    const w = Math.max(30, text.length * px * 0.62 + 16);
    const h = px + 12;
    return this.sprite(`badge:${text}:${color}:${px}`, w, h, (ctx) => {
      ctx.fillStyle = 'rgba(15,20,28,.88)';
      roundRect(ctx, 1, 1, w - 2, h - 2, 8);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = `700 ${px}px "JetBrains Mono", Consolas, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, w / 2, h / 2 + 1);
    });
  }

  yieldSprite(i) {
    const y = this.tileYieldFn ? this.tileYieldFn(i) : null;
    if (!y) return null;
    const items = [];
    for (let k = 0; k < Math.round(y.food); k++) items.push('#7CC05A');
    for (let k = 0; k < Math.round(y.prod); k++) items.push('#E0955A');
    for (let k = 0; k < Math.round(y.gold); k++) items.push('#F2C94C');
    for (let k = 0; k < Math.round(y.science); k++) items.push('#6FA8FF');
    if (!items.length) return null;
    const key = `yield:${items.join('')}`;
    const perRow = 4;
    const rows = Math.ceil(items.length / perRow);
    const w = 60;
    const h = rows * 14 + 4;
    return this.sprite(key, w, h, (ctx) => {
      items.forEach((color, k) => {
        const row = Math.floor(k / perRow);
        const inRow = Math.min(perRow, items.length - row * perRow);
        const x = w / 2 + ((k % perRow) - (inRow - 1) / 2) * 13;
        const yy = 9 + row * 14;
        ctx.fillStyle = 'rgba(0,0,0,.5)';
        ctx.beginPath();
        ctx.arc(x, yy, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, yy, 5, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }

  buildOverlays() {
    const w = this.world;
    const ov = this.overlay;
    w.overlays.traverse((o) => {
      if (o.geometry && !Object.values(this.geo).includes(o.geometry)) o.geometry.dispose();
      if (o.material && (o.isSprite || o.isMesh || o.isLine || o.isLineSegments)) o.material.dispose();
    });
    w.overlays.clear();
    const add = (o) => o && w.overlays.add(o);
    const map = this.state.map;
    const place = (sp, i, dy = 0.35) => {
      const [x, z] = toPixel(map, i, 1);
      sp.position.set(x, Math.max(w.centerY[i], 0.05) + dy, z);
      w.overlays.add(sp);
    };
    if (ov.cityTiles) add(this.hexFill(ov.cityTiles, '#FFFFFF', 0.07));
    if (ov.reach?.size) {
      add(this.hexFill([...ov.reach], '#FFFFFF', 0.16));
      add(this.hexOutline([...ov.reach], '#FFFFFF', 0.45));
    }
    if (ov.targets?.size) {
      add(this.hexFill([...ov.targets], '#E0463A', 0.28));
      add(this.hexOutline([...ov.targets], '#FF6B57', 0.95));
    }
    if (ov.worked) {
      for (const i of ov.worked) {
        const ring = new THREE.Mesh(this.geo.ring, new THREE.MeshBasicMaterial({ color: ov.locked?.has(i) ? '#F2C94C' : '#FFFFFF', transparent: true, opacity: 0.9, depthWrite: false }));
        const [x, z] = toPixel(map, i, 1);
        ring.position.set(x, Math.max(w.centerY[i], 0.02) + 0.05, z);
        ring.scale.setScalar(1.15);
        ring.renderOrder = 5;
        w.overlays.add(ring);
      }
    }
    const yieldTiles = ov.yields || (this.showYields ? map.tiles.map((t, i) => (t.owner === this.viewer && (this.revealAll || this.fog?.[i] !== 2) ? i : -1)).filter((i) => i >= 0) : null);
    if (yieldTiles) {
      for (const i of yieldTiles) {
        const sp = this.yieldSprite(i);
        if (sp) place(sp, i, 0.12);
      }
    }
    if (ov.placements) {
      const best = ov.placements.filter((p) => p.best).map((p) => p.tile);
      add(this.hexFill(ov.placements.map((p) => p.tile), '#FFFFFF', 0.14));
      if (best.length) {
        add(this.hexFill(best, '#F2C94C', 0.35));
        add(this.hexOutline(best, '#F2C94C', 1));
      }
      for (const p of ov.placements) place(this.badge(`+${p.bonus}`, p.best ? '#F2C94C' : '#FFFFFF', 17), p.tile, 0.3);
    }
    if (ov.buyTiles) {
      for (const b of ov.buyTiles) place(this.badge(`${b.cost}g`, b.affordable ? '#F2C94C' : '#8C949C', 13), b.tile, 0.3);
    }
    if (ov.path?.tiles?.length) {
      const pts = [ov.path.from, ...ov.path.tiles].map((i) => {
        const [x, z] = toPixel(map, i, 1);
        return new THREE.Vector3(x, Math.max(w.centerY[i], 0.02) + 0.1, z);
      });
      const dots = [];
      for (let k = 0; k < pts.length - 1; k++) {
        const a = pts[k];
        const b = pts[k + 1];
        const steps = 4;
        for (let s = 1; s <= steps; s++) dots.push(a.clone().lerp(b, s / steps));
      }
      const mesh = new THREE.InstancedMesh(this.geo.sphere, new THREE.MeshBasicMaterial({ color: ov.path.attack ? '#FF6B57' : '#FFFFFF', depthWrite: false, transparent: true, opacity: 0.95 }), dots.length);
      dots.forEach((d, k) => mesh.setMatrixAt(k, tmpMatrix.compose(d, tmpQuat.identity(), new THREE.Vector3(0.045, 0.045, 0.045))));
      mesh.renderOrder = 6;
      w.overlays.add(mesh);
      ov.path.turns.forEach((turn, k) => {
        const last = k === ov.path.turns.length - 1;
        if (!last && ov.path.turns[k + 1] === turn) return;
        place(this.badge(String(turn + 1), ov.path.attack && last ? '#FF6B57' : '#FFFFFF', 13), ov.path.tiles[k], 0.3);
      });
    }
    if (ov.hover >= 0) add(this.hexOutline([ov.hover], '#FFFFFF', 0.9, 0.93, 0.05));
    if (ov.selectedUnit != null) {
      const u = this.state.units[ov.selectedUnit];
      if (u) {
        const ring = new THREE.Mesh(this.geo.ring, new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.9, depthWrite: false }));
        ring.renderOrder = 6;
        ring.userData.follow = u.id;
        w.overlays.add(ring);
        this.selRing = ring;
      }
    } else this.selRing = null;
    this.overlaySprites = w.overlays.children.filter((o) => o.isSprite && o.userData.px);
  }

  // ---------- animations ----------

  animate(events, visibleOnly = true) {
    if (!this.state) return;
    const now = performance.now();
    const vis = visibleTiles(this.state, this.viewer);
    const seen = (t) => !visibleOnly || this.revealAll || vis[t];
    const step = 130 / this.animSpeed;
    for (const e of events) {
      if (e.type === 'move' && e.steps.length && (seen(e.from) || e.steps.some(seen))) {
        this.anims.push({ kind: 'move', unit: e.unit, tiles: [e.from, ...e.steps], start: now, dur: step * e.steps.length });
      } else if (e.type === 'combat' && (seen(e.target) || seen(e.from))) {
        if (e.attacker != null) this.anims.push({ kind: 'lunge', unit: e.attacker, from: e.from, to: e.target, start: now, dur: 280 / this.animSpeed, ranged: e.ranged });
        if (e.dmgToTarget) this.addText(e.target, `-${e.dmgToTarget}`, '#FF6B57', now + 140);
        if (e.dmgToSelf) this.addText(e.from, `-${e.dmgToSelf}`, '#FFB199', now + 140);
        if (e.ranged) this.addShot(e.from, e.target, now);
      } else if ((e.type === 'cityFounded' && seen(e.tile)) || (e.type === 'cityCaptured' && seen(e.tile))) {
        this.addRing(e.tile, this.state.players[e.type === 'cityFounded' ? e.owner : e.to].color, now);
      } else if (e.type === 'border' && seen(e.tile)) {
        this.addRing(e.tile, this.state.players[e.owner].color, now, 0.6);
      }
    }
  }

  addText(tile, text, color, start) {
    const sp = this.badge(text, color, 16);
    const [x, z] = toPixel(this.state.map, tile, 1);
    sp.position.set(x, Math.max(this.world.centerY[tile], 0.05) + 0.7, z);
    sp.visible = false;
    this.world.fx.add(sp);
    this.anims.push({ kind: 'text', obj: sp, base: sp.position.y, start, dur: 1100 });
  }

  addRing(tile, color, start, size = 1) {
    const ring = new THREE.Mesh(this.geo.ring, new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false }));
    const [x, z] = toPixel(this.state.map, tile, 1);
    ring.position.set(x, Math.max(this.world.centerY[tile], 0.02) + 0.06, z);
    ring.renderOrder = 7;
    this.world.fx.add(ring);
    this.anims.push({ kind: 'ring', obj: ring, size, start, dur: 800 });
  }

  addShot(from, to, start) {
    const ball = new THREE.Mesh(this.geo.sphere, new THREE.MeshBasicMaterial({ color: '#FFE08A' }));
    ball.scale.setScalar(0.05);
    ball.visible = false;
    this.world.fx.add(ball);
    const [x1, z1] = toPixel(this.state.map, from, 1);
    const [x2, z2] = toPixel(this.state.map, to, 1);
    this.anims.push({ kind: 'shot', obj: ball, a: [x1, this.world.centerY[from] + 0.3, z1], b: [x2, this.world.centerY[to] + 0.2, z2], start, dur: 300 / this.animSpeed });
  }

  runAnims(now) {
    const keep = [];
    for (const a of this.anims) {
      const t = (now - a.start) / a.dur;
      if (t >= 1) {
        if (a.obj) {
          this.world.fx.remove(a.obj);
          a.obj.material.dispose();
        }
        continue;
      }
      keep.push(a);
      if (t < 0 || !a.obj) continue;
      a.obj.visible = true;
      if (a.kind === 'text') {
        a.obj.position.y = a.base + t * 0.5;
        a.obj.material.opacity = 1 - t * t;
        const [w, h] = a.obj.userData.px;
        a.obj.scale.set(w * this.pxScale, h * this.pxScale, 1);
      } else if (a.kind === 'ring') {
        a.obj.scale.setScalar((0.8 + t * 2.2) * a.size);
        a.obj.material.opacity = 1 - t;
      } else if (a.kind === 'shot') {
        a.obj.position.set(a.a[0] + (a.b[0] - a.a[0]) * t, a.a[1] + (a.b[1] - a.a[1]) * t + Math.sin(t * Math.PI) * 0.7, a.a[2] + (a.b[2] - a.a[2]) * t);
      }
    }
    this.anims = keep;
  }

  // ---------- frame ----------

  loop(now) {
    if (!this.alive) return;
    this.draw(now);
    if (this.onDraw) this.onDraw();
    this.raf = requestAnimationFrame(this.loop);
  }

  draw(now = performance.now()) {
    if (this.camTarget) {
      const dx = this.camTarget.x - this.cam.x;
      const dy = this.camTarget.y - this.cam.y;
      this.cam.x += dx * 0.18;
      this.cam.y += dy * 0.18;
      this.clampCamera();
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) this.camTarget = null;
    }
    this.updateCamera();
    if (!this.state || !this.world) {
      this.gl.render(this.scene, this.camera);
      return;
    }
    if (this.syncedVer !== this.state._ver || this.syncedReveal !== this.revealAll || this.syncedTurn !== this.state.turn) {
      this.sync();
      this.syncedVer = this.state._ver;
      this.syncedReveal = this.revealAll;
      this.syncedTurn = this.state.turn;
      this.lastOverlay = null;
    }
    if (this.overlay !== this.lastOverlay || this.showYields !== this.lastYields) {
      this.syncUnits(this.fog);
      this.buildOverlays();
      this.lastOverlay = this.overlay;
      this.lastYields = this.showYields;
    }
    this.placeUnits(now);
    this.runAnims(now);
    if (this.selRing) {
      const g = this.world.unitObjs.get(this.selRing.userData.follow);
      if (g) {
        this.selRing.position.set(g.position.x, g.position.y + 0.06, g.position.z);
        const pulse = 0.5 + 0.5 * Math.sin(now / 180);
        this.selRing.scale.setScalar(0.95 + pulse * 0.1);
        this.selRing.material.opacity = 0.6 + pulse * 0.4;
      }
    }
    for (const sp of this.overlaySprites || []) {
      const [w, h] = sp.userData.px;
      sp.scale.set(w * this.pxScale, h * this.pxScale, 1);
    }
    this.world.dyn.traverse((o) => {
      if (o.isSprite && o.userData.px) o.scale.set(o.userData.px[0] * this.pxScale, o.userData.px[1] * this.pxScale, 1);
    });
    this.waterNormal.offset.set((now / 60000) % 1, (now / 90000) % 1);
    this.gl.render(this.scene, this.camera);
  }
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
