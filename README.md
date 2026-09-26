# Hexhold

A turn-based 4X strategy game in the spirit of Civilization VI, built with plain HTML and JavaScript. It runs in any modern browser, with no install, no server and no build step. (Hexhold is a working title.)

The map is 3D, drawn with WebGL through [Three.js](https://threejs.org) (MIT License). Three.js is included in `vendor/three/`, so nothing is fetched at runtime except fonts. A classic 2D map is available under Settings → Map view, and it switches on automatically where WebGL isn't available.

**Play it: https://haianhltr.github.io/hexhold/**

Found cities, place districts for adjacency bonuses, research a 76-tech tree from Pottery to the Offworld Mission, fight rival civilizations, and win by conquest, by science, or by score when time runs out. A game takes 20 minutes to a few hours; the 250-turn Epic length reaches the Future era.

## Play locally

```
node dev-server.mjs
```

Then open http://localhost:5173. Browsers won't load ES modules from `file://`, so opening `index.html` directly won't work.

Handy URL options: `?new` starts a game straight away (add `&seed=42&size=medium&rivals=3&difficulty=hard`), and `?debug` makes the <kbd>`</kbd> key reveal the whole map.

## Check it

| Command | What it does | Time |
|---|---|---|
| `node --test` | Unit tests for the rules | under 1 s |
| `node tools/soak.mjs [games] [turns]` | Full AI-vs-AI games (20 of 150 turns by default), checking rule invariants every round and reporting the era each game reaches | about 7 s |
| `node tools/ui-check.mjs` | Drives a headless Chromium browser through a whole game with real clicks and keys, on the 3D map and the classic 2D map. Fails on any console error, reports frame rate and turn timings, and saves screenshots to `tools/shots/`. | about 1 min |

`ui-check` looks for Edge or Chrome in the usual places and uses the GPU. On a machine without one, set `SOFTWARE_GL=1`. Set `BROWSER=/path/to/chrome` to pick one, or `SITE=https://haianhltr.github.io/hexhold/` to check the published copy instead of a local server.

## Publish it

The game is static files: `index.html`, `styles.css`, `src/` and `vendor/`.

- **GitHub Pages** (live at https://haianhltr.github.io/hexhold/): every push to `main` republishes the site in about a minute. The `.nojekyll` file keeps Pages from filtering any files.
- **itch.io:** zip `index.html`, `styles.css`, `src/` and `vendor/` so that `index.html` is at the top of the zip, then upload it as an HTML5 game. On Windows: `Compress-Archive -Path index.html,styles.css,src,vendor,.nojekyll -DestinationPath hexhold.zip`.

## How the code is organized

```
src/core/     the rules: pure JavaScript with no DOM, so tests and the soak run in Node
src/data/     every balance number (units, buildings, districts, techs, terrain, rules)
src/ai/       rival players; they only change the game through applyAction
src/render/   renderer3d.js (WebGL map), renderer.js (classic 2D map), minimap and drawing kit; all art is drawn in code
src/ui/       panels, screens, input, sound and tips
src/save/     autosave, save slots, export and import
tools/        soak test and browser check
vendor/three/ Three.js r170 and its license
docs/         backlog (epics and stories) and the tech dictionary
```

Every change to the game goes through `applyAction(state, action)` in `src/core/actions.js`. The game state is one plain object that survives `JSON.stringify`, which is all a save file is. To rebalance, edit `src/data/`.

The plan and status of every story are in [docs/backlog.md](docs/backlog.md). Every tech, unit line, building and district, with costs and pacing targets, is listed in [docs/tech-dictionary.md](docs/tech-dictionary.md). What changed per version is in [CHANGELOG.md](CHANGELOG.md).
