// Browser smoke test: drives a headless Chromium browser (Edge or Chrome) over the DevTools
// protocol, plays through scripted turns, saves screenshots to tools/shots/ and fails on any
// console error or uncaught exception.
//   node tools/ui-check.mjs            (set BROWSER=path/to/chrome.exe to choose the browser)

import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const shots = join(root, 'tools', 'shots');
const PORT = 5199;
const DEBUG_PORT = 9339;
const candidates = [
  process.env.BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const browserPath = candidates.find((p) => existsSync(p));
if (!browserPath) {
  console.error('No Chromium-based browser found. Set BROWSER to its path.');
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn(process.execPath, [join(root, 'dev-server.mjs')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
const profile = join(tmpdir(), `hexhold-ui-${Date.now()}`);
const browser = spawn(browserPath, [
  '--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--window-size=1440,900', '--hide-scrollbars', 'about:blank',
], { stdio: 'ignore' });

let ws;
let nextId = 1;
const pending = new Map();
const problems = [];
const listeners = [];

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) {
        ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((res, rej) => {
          ws.onopen = res;
          ws.onerror = rej;
        });
        ws.onmessage = (m) => {
          const msg = JSON.parse(m.data);
          if (msg.id && pending.has(msg.id)) {
            pending.get(msg.id)(msg);
            pending.delete(msg.id);
          } else if (msg.method) listeners.forEach((l) => l(msg));
        };
        return;
      }
    } catch {
      /* browser still starting */
    }
    await sleep(200);
  }
  throw new Error('Could not connect to the browser');
}

function send(method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((res) => pending.set(id, res));
}

async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(`${expression.slice(0, 80)}…: ${r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text}`);
  return r.result?.result?.value;
}

async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(shots, `${name}.png`), Buffer.from(r.result.data, 'base64'));
  console.log(`  saved tools/shots/${name}.png`);
}

async function load(url) {
  const loaded = new Promise((res) => {
    const l = (m) => {
      if (m.method === 'Page.loadEventFired') {
        listeners.splice(listeners.indexOf(l), 1);
        res();
      }
    };
    listeners.push(l);
  });
  await send('Page.navigate', { url });
  await loaded;
  await evaluate('document.fonts.ready.then(() => true)');
  await sleep(400);
}

// Ends turns (letting the AI play for the human) until `turns` have passed.
const PLAY = (turns) => `(async () => {
  const { runAI } = await import('/src/ai/ai.js');
  const app = window.hexhold;
  for (let i = 0; i < ${turns} && app.state.phase === 'playing'; i++) {
    const me = app.state.players[app.humanId];
    me.human = false; runAI(app.state, me.id, []); me.human = true;
    app.refresh();
    app.endTurn();
    while (app.busy) await new Promise(r => setTimeout(r, 20));
  }
  return app.state.turn;
})()`;

async function main() {
  await mkdir(shots, { recursive: true });
  await connect();
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  listeners.push((m) => {
    if (m.method === 'Runtime.exceptionThrown') problems.push(`exception: ${m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text}`);
    if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) problems.push(`console.${m.params.type}: ${m.params.args.map((a) => a.value ?? a.description).join(' ')}`);
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' && !/favicon/.test(m.params.entry.url || '')) problems.push(`log: ${m.params.entry.text} ${m.params.entry.url || ''}`);
  });
  const base = `http://localhost:${PORT}/`;

  console.log('Title screen');
  await load(base);
  await shot('01-title');

  console.log('New game setup');
  await evaluate(`[...document.querySelectorAll('.title-actions button')].find(b => b.textContent === 'New game').click()`);
  await sleep(200);
  await shot('02-setup');

  console.log('Start a game and found the capital');
  await load(`${base}?new&seed=42&rivals=2`);
  await shot('03-start');
  await evaluate(`hexhold.unitCommand('found'); true`);
  await sleep(500);
  const cityId = await evaluate(`Object.values(hexhold.state.cities).find(c => c.owner === hexhold.humanId).id`);
  await evaluate(`hexhold.selectCity(hexhold.state.cities[${cityId}]); true`);
  await sleep(300);
  await shot('04-city-panel');
  await evaluate(`hexhold.dispatch({ type: 'setProduction', city: ${cityId}, item: { kind: 'unit', key: 'warrior' } }).ok`);
  await evaluate(`hexhold.dispatch({ type: 'research', tech: 'writing' }).ok`);

  console.log('Real mouse and keyboard input');
  const click = async (x, y, button = 'left') => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button, clickCount: 1, buttons: button === 'left' ? 1 : 2 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button, clickCount: 1 });
    await sleep(120);
  };
  const screenOf = (expr) => evaluate(`(() => { const t = ${expr}; const [x, y] = hexhold.renderer.worldToScreen(...hexhold.renderer.tileCenter(t)); return [Math.round(x), Math.round(y)]; })()`);
  await evaluate(`hexhold.deselect(); true`);
  const warriorId = await evaluate(`Object.values(hexhold.state.units).find(u => u.owner === hexhold.humanId && u.type === 'warrior').id`);
  const [wx, wy] = await screenOf(`hexhold.state.units[${warriorId}].tile`);
  await click(wx, wy);
  const picked = await evaluate(`hexhold.selection?.id === ${warriorId}`);
  const dest = await evaluate(`(() => { const u = hexhold.state.units[${warriorId}]; return [...hexhold.renderer.overlay.reach].find(t => t !== u.tile); })()`);
  const [dx, dy] = await screenOf(String(dest));
  await click(dx, dy);
  const moved = await evaluate(`hexhold.state.units[${warriorId}].tile === ${dest}`);
  console.log(`  click selects the warrior: ${picked}; click on a highlighted tile moves it: ${moved}`);
  if (!picked || !moved) throw new Error('Mouse selection or movement failed');
  await evaluate(`hexhold.selectCity(hexhold.state.cities[${cityId}]); true`);
  await sleep(150);
  await evaluate(`[...document.querySelectorAll('.opt-main')].find(b => b.textContent.startsWith('Scout')).click(); true`);
  const queued = await evaluate(`hexhold.state.cities[${cityId}].queue[0]?.key`);
  console.log(`  clicking Scout in the city panel sets production: ${queued === 'scout'}`);
  if (queued !== 'scout') throw new Error('City production click failed');
  const turnBefore = await evaluate('hexhold.state.turn');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, shiftKey: true, modifiers: 8 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, modifiers: 8 });
  await evaluate(`(async () => { while (hexhold.busy) await new Promise(r => setTimeout(r, 20)); return true; })()`);
  await sleep(200);
  const turnAfter = await evaluate('hexhold.state.turn');
  console.log(`  Shift+Enter ends the turn: ${turnAfter === turnBefore + 1}`);
  if (turnAfter !== turnBefore + 1) throw new Error('Ending the turn from the keyboard failed');

  console.log('Select a unit and preview a move');
  await evaluate(`(() => { const u = Object.values(hexhold.state.units).find(u => u.owner === hexhold.humanId && u.type === 'warrior'); hexhold.selectUnit(u); const r = hexhold.renderer.overlay.reach; const t = [...r].pop(); const [x,y] = hexhold.renderer.worldToScreen(...hexhold.renderer.tileCenter(t)); hexhold.onHover(t, x, y); return true; })()`);
  await sleep(300);
  await shot('05-unit-selected');

  console.log('Tech tree');
  await evaluate(`document.querySelector('.tb-research').click(); true`);
  await sleep(400);
  await shot('06-tech-tree');
  await evaluate(`hexhold.closeModal(); true`);

  console.log('Play 30 turns');
  const t30 = await evaluate(PLAY(30));
  console.log(`  reached turn ${t30}`);
  await sleep(600);
  await shot('07-turn-30');

  console.log('District placement');
  const placed = await evaluate(`(() => {
    const app = hexhold; const s = app.state;
    const p = s.players[app.humanId];
    for (const k of ['pottery','writing']) if (!p.techs.includes(k)) p.techs.push(k);
    const c = Object.values(s.cities).find(c => c.owner === app.humanId);
    c.queue = c.queue.filter(q => q.kind !== 'district');
    app.selectCity(c); app.startDistrictPlacement(c, 'campus');
    return !!app.renderer.overlay.placements?.length;
  })()`);
  console.log(`  placement tiles shown: ${placed}`);
  await sleep(400);
  await shot('08-district-placement');
  await evaluate(`hexhold.mode = null; hexhold.deselect(); true`);

  console.log('Diplomacy and help');
  await evaluate(`document.querySelector('.tb-actions button:nth-child(2)').click(); true`);
  await sleep(300);
  await shot('09-diplomacy');
  await evaluate(`hexhold.closeModal(); true`);

  console.log('Play to the end');
  const tEnd = await evaluate(PLAY(80));
  console.log(`  reached turn ${tEnd}, phase ${await evaluate('hexhold.state.phase')}`);
  await sleep(1400);
  await shot('10-late-game');

  console.log('Map rendering speed (Medium map, 4 civs, late game)');
  await load(`${base}?new&seed=7&size=medium&rivals=3`);
  await evaluate(PLAY(60));
  const perf = await evaluate(`(() => {
    const r = hexhold.renderer; const out = {};
    for (const zoom of [1.05, 0.45]) {
      r.cam.zoom = zoom; r.clampCamera();
      const t0 = performance.now();
      for (let i = 0; i < 40; i++) r.draw(performance.now());
      out[zoom] = +((performance.now() - t0) / 40).toFixed(2);
    }
    r.cam.zoom = 1.05; r.dirty = true;
    return out;
  })()`);
  console.log(`  average frame: ${perf['1.05']} ms at normal zoom, ${perf['0.45']} ms zoomed all the way out (16.7 ms = 60 fps)`);
  const turnCost = await evaluate(`(async () => {
    const t0 = performance.now(); hexhold.endTurn();
    while (hexhold.busy) await new Promise(r => setTimeout(r, 5));
    return Math.round(performance.now() - t0);
  })()`);
  console.log(`  ending a turn with 3 AI rivals took ${turnCost} ms (target under 1500)`);
  await shot('13-medium-late');

  console.log('Save and reload');
  const saved = await evaluate(`(async () => { const s = await import('/src/save/storage.js'); return s.autosave(hexhold.state); })()`);
  await load(base);
  const cont = await evaluate(`!![...document.querySelectorAll('.title-actions button')].find(b => b.textContent === 'Continue')`);
  console.log(`  autosave ok: ${saved}, continue offered: ${cont}`);
  await evaluate(`[...document.querySelectorAll('.title-actions button')].find(b => b.textContent === 'Continue').click()`);
  await sleep(800);
  await shot('11-continued');

  console.log('Narrow window');
  await send('Emulation.setDeviceMetricsOverride', { width: 800, height: 900, deviceScaleFactor: 1, mobile: false });
  await sleep(500);
  await shot('12-narrow');
}

let failed = false;
try {
  await main();
} catch (e) {
  failed = true;
  console.error(e);
} finally {
  try {
    ws?.close();
  } catch {
    /* already closed */
  }
  browser.kill();
  server.kill();
  await sleep(300);
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
if (problems.length) {
  console.error(`\n${problems.length} browser problem(s):`);
  for (const p of problems.slice(0, 20)) console.error(`  ${p}`);
}
console.log(failed || problems.length ? '\nUI check FAILED' : '\nUI check passed: no console errors');
process.exit(failed || problems.length ? 1 : 0);
