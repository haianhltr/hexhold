// Boots the game client.
//   ?new             start a new game immediately (add &seed=, &size=, &rivals=, &difficulty=, &civ=)
//   ?debug           enable the ` key, which reveals the whole map

import { App } from './ui/app.js';
import { serialize, deserialize } from './core/state.js';

let root = document.getElementById('app');
if (!root) {
  root = document.createElement('div');
  root.id = 'app';
  document.body.append(root);
}

const app = new App(root);
window.hexhold = app;

window.addEventListener('error', (e) => {
  console.error(e.error || e.message);
  app.toast('Something went wrong. Your last autosave is safe; reload it from the menu if the game misbehaves.', 'error');
});

function start(data = {}) {
  if (data && data.save) {
    try {
      app.loadGame(deserialize(data.save));
      return;
    } catch {
      /* fall through to a normal start */
    }
  }
  const params = new URLSearchParams(location.search);
  if (params.has('new')) {
    app.startNewGame({
      seed: params.get('seed') ? Number(params.get('seed')) : undefined,
      size: params.get('size') || 'small',
      rivals: Number(params.get('rivals') || 2),
      difficulty: params.get('difficulty') || 'normal',
      civ: Number(params.get('civ') || 0),
    });
  } else {
    app.showTitle();
  }
}

// When hosted as a claude.ai artifact, keep the running game across page updates.
const hot = window.claude?.hot;
try {
  hot?.snapshot?.(() => (app.state ? { save: serialize(app.state) } : {}));
} catch {
  /* not hosted there */
}
if (hot?.ready) hot.ready(start);
else start(hot?.data ?? {});
