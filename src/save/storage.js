// Saving to the browser (localStorage) and to files. Every storage call is guarded: private
// windows and blocked storage make localStorage throw, and the game must keep working anyway.

import { serialize, deserialize } from '../core/state.js';

const PREFIX = 'hexhold.';
const AUTOSAVES = 3;
export const SLOT_COUNT = 5;

function read(key) {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, value);
    return true;
  } catch {
    return false;
  }
}

function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* storage unavailable */
  }
}

function describe(state, name) {
  const human = state.players.find((p) => p.human) || state.players[0];
  return { name: name || null, turn: state.turn, civ: human.name, color: human.color, emblem: human.emblem, size: state.size, difficulty: state.difficulty, savedAt: Date.now() };
}

export function autosave(state) {
  const text = serialize(state);
  for (let k = AUTOSAVES - 2; k >= 0; k--) {
    const v = read(`auto.${k}`);
    if (v) {
      write(`auto.${k + 1}`, v);
      write(`auto.${k + 1}.meta`, read(`auto.${k}.meta`) || '{}');
    }
  }
  let ok = write('auto.0', text);
  if (!ok) {
    // Out of space: drop the oldest autosave and try again.
    remove(`auto.${AUTOSAVES - 1}`);
    ok = write('auto.0', text);
  }
  if (ok) write('auto.0.meta', JSON.stringify(describe(state)));
  return ok;
}

export function saveToSlot(n, state, name) {
  const ok = write(`slot.${n}`, serialize(state));
  if (ok) write(`slot.${n}.meta`, JSON.stringify(describe(state, name)));
  return ok;
}

export function listSaves() {
  const out = [];
  for (let k = 0; k < AUTOSAVES; k++) {
    if (!read(`auto.${k}`)) continue;
    out.push({ key: `auto.${k}`, kind: 'auto', index: k, meta: parseMeta(read(`auto.${k}.meta`)) });
  }
  for (let n = 1; n <= SLOT_COUNT; n++) {
    out.push({ key: `slot.${n}`, kind: 'slot', index: n, empty: !read(`slot.${n}`), meta: parseMeta(read(`slot.${n}.meta`)) });
  }
  return out;
}

function parseMeta(text) {
  try {
    return JSON.parse(text || '{}');
  } catch {
    return {};
  }
}

export function loadSave(key) {
  const text = read(key);
  if (!text) throw new Error('That save is empty.');
  return deserialize(text);
}

export function deleteSave(key) {
  remove(key);
  remove(`${key}.meta`);
}

export const hasContinue = () => !!read('auto.0');

export const DEFAULT_SETTINGS = { volume: 0.6, muted: false, animSpeed: 1, hints: true, hintsSeen: {}, autoNext: true, showYields: false, view: '3d', shadows: true };

export function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(read('settings') || '{}') };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  write('settings', JSON.stringify(settings));
}

export function downloadSave(state) {
  const blob = new Blob([serialize(state)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hexhold-turn-${state.turn}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function saveText(state) {
  return serialize(state);
}

export function parseSaveText(text) {
  return deserialize(text);
}
