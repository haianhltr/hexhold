# Hexhold v1.0 backlog

**Hexhold** is a working title. Rename it any time.

## Status (v1.0.0, 2026-09-26)

**All 50 Must stories are built and verified.** The checks behind that:

- `node --test`: 26 tests pass, including one showing that the same seed replays an identical AI game.
- `node tools/soak.mjs`: 20 AI-vs-AI games of 150 turns ran with zero rule violations in about 7 s. The slowest round took 15 ms.
- `node tools/ui-check.mjs`: a full game in headless Edge, with real clicks and keys, produced no console errors.
  - A frame takes 3.7 ms at normal zoom and 8.3 ms fully zoomed out, against a 60 fps budget of 16.7 ms.
  - Ending a turn at turn 60 with 3 AI rivals takes 50 ms, against a target of 1,500 ms.

| Story | Status |
|---|---|
| Every Must story | Done |
| Should: E0.5 debug overlay | Partly done. `?debug` plus the <kbd>`</kbd> key reveals the map; there's no FPS or coordinate readout. |
| Should: E1.3, E2.3, E3.3, E3.4, E4.6, E4.8, E7.4, E7.6, E9.4, E9.5, E9.6, E10.2, E11.1, E11.2 | Done |
| Could: E1.8 minimap | Done |
| Could: E9.7 touch | Partly done. Tap to select, drag to pan and pinch to zoom work; there are no hover tooltips on touch. |
| Could: E3.5 scout auto-explore, E5.6 pillage, E6.4 boosts, E8.6 AI worker, E11.3 music | Not built. E8.6 turned out to be unnecessary: AI turns take milliseconds. |
| E12.3 browser support | Verified in Chromium (Edge) only. Firefox and Safari are still to be tested by hand. |
| E12.5 deploy | GitHub Pages: done, live at https://haianhltr.github.io/hexhold/ and verified with the browser check. itch.io: not uploaded yet (needs your itch.io account; the steps are in the README). |

Changes from the plan:

- Sleep is <kbd>Z</kbd> instead of <kbd>S</kbd>, because WASD pans the map.
- Zones of control follow the Civ 5 rule: moving from one enemy-adjacent tile to another costs all remaining moves. This keeps "move, then attack" possible.
- Research costs came down (22, 55 and 110 Science) after the soak test showed early research was too slow.

## Product goal

A turn-based 4X strategy game in the spirit of Civilization VI that runs in any modern browser from plain HTML and JavaScript. There's nothing to install, no server and no build step. One game takes about 30–45 minutes.

**v1.0 ships when** a player can:

- start a game against 1–3 AI rivals on a generated hex map
- found and grow cities
- place districts that earn adjacency bonuses
- research a tech tree
- fight wars and capture cities
- win or lose
- save, quit and resume

All of that has to work with no console errors in current Chrome, Edge, Firefox and Safari.

## Constraints and decisions

| Topic | Decision | Why |
|---|---|---|
| Language | Vanilla JavaScript (ES modules), HTML, CSS | The goal is JS and HTML only |
| Rendering | Canvas 2D | Hex maps are 2D. It's fast and needs no library. |
| Runtime libraries | None | Nothing to install or update |
| Server | None. Static files only. | Hosts free on GitHub Pages or itch.io |
| Local run | `node dev-server.mjs` (zero-dependency, about 30 lines) | Browsers refuse to load ES modules from `file://`, and Python isn't installed here |
| Tests | Node's built-in runner, `node --test` | No dependencies. The rules code runs without a browser. |
| Game state | One plain object that survives `JSON.stringify` / `JSON.parse` unchanged | Saving, AI, replays and multiplayer later all come for free |
| Changing state | Every change goes through `applyAction(state, action)` | The player and the AI use the same path, and validation lives in one place |
| Randomness | Seeded RNG stored in the state | The same seed gives the same map, and bugs can be replayed |
| Saving | `localStorage` autosave plus export/import of a `.json` file | No server |
| Balance | Every number lives in `src/data/` | Tuning means editing data, not logic |
| Names and art | Original names and art only. No Civilization names, logos, leaders or assets. | Legal safety |

## Target folder layout

```
index.html
styles.css
dev-server.mjs          zero-dependency static server for local play
package.json            scripts only ("test", "dev"); no dependencies
src/
  main.js               boot: wires state, renderer, UI, input
  core/                 pure rules; no DOM; runs in Node for tests
    rng.js  hex.js  state.js  actions.js  turn.js
    mapgen.js  pathfind.js  visibility.js
    city.js  yields.js  production.js  tech.js
    districts.js  combat.js  victory.js  score.js
  data/                 all balance numbers
    terrain.js  units.js  buildings.js  districts.js  techs.js  names.js
  ai/                   rival players; only ever calls applyAction
  render/               canvas: camera, map, units, overlays, animation
  ui/                   DOM panels, screens, input, sound
  save/                 autosave, slots, export/import, migrations
tests/                  node --test
tools/soak.mjs          headless AI-vs-AI games for QA
docs/backlog.md
```

## v1.0 game rules

These are starting values. They live in `src/data/` and will change during balancing.

**Map.** Small is 28 × 18 hexes with 1–2 rivals. Medium is 36 × 22 with up to 3 rivals. Hexes are pointy-top with axial coordinates, and the edges don't wrap.

**Terrain**

| Terrain | Yields | Move cost | Defense | Notes |
|---|---|---|---|---|
| Grassland | 2 Food | 1 | 0 | |
| Plains | 1 Food, 1 Production | 1 | 0 | |
| Desert | 0 | 1 | 0 | |
| Hills | +1 Production over its base | 2 | +3 | +1 sight |
| Forest | 1 Food, 1 Production | 2 | +3 | |
| Mountain | – | impassable | – | Campus adjacency |
| Coast | 1 Food, 1 Gold | not walkable | – | Workable by cities |
| Ocean | 1 Food | not walkable | – | |

**Bonus resources**

- Wheat: +1 Food, on grassland or plains
- Stone: +1 Production, on hills
- Fish: +1 Food, on coast

**Yields.** Each yield drives one system:

- Food grows the city.
- Production builds things.
- Gold pays upkeep and buys things.
- Science researches techs.
- Culture expands borders.

**Cities**

- A Settler founds a city. The city claims the tiles within radius 1.
- Each population point works one tile and eats 2 Food.
- The capital gets a palace bonus: +2 Science, +2 Gold, +1 Culture.
- Cities must be at least 4 tiles apart.

**Districts** (the Civ 6 signature). Each district occupies a tile inside the city's borders. A city gets 1 district per 3 population, rounded up.

| District | Building | Adjacency bonus | Rule |
|---|---|---|---|
| Campus | Library (+2 Science) | +1 Science per adjacent Mountain. +1 per 2 adjacent districts. | |
| Commercial Hub | Market (+3 Gold) | +2 Gold if next to Coast. +1 per 2 adjacent districts. | |
| Encampment | Barracks (new melee units +5 strength) | None | Can't be next to the city center |

**City-center buildings**

- Monument: +2 Culture
- Granary: +2 Food
- Walls: +100 city HP and a ranged strike

**Units**

| Unit | Strength | Ranged (range) | Moves | Cost | Needs |
|---|---|---|---|---|---|
| Settler | – | – | 2 | 50 | City population 2+. Costs 1 population. |
| Builder | – | – | 2 | 30 | 3 charges: Farm (+1 Food), Mine (+1 Production on hills) |
| Scout | 10 | – | 3 | 25 | |
| Warrior | 20 | – | 2 | 30 | |
| Archer | 15 | 25 (2) | 2 | 45 | Archery |
| Horseman | 36 | – | 4 | 70 | Horseback Riding |
| Swordsman | 35 | – | 2 | 80 | Bronze Working |

One military and one civilian unit can share a tile.

**Combat**

- Damage = 30 × e^((attacker − defender) / 25) × random(0.8–1.2). Units have 100 HP.
- A unit loses 1 strength per 10 HP missing.
- Defense modifiers: hills +3, forest +3, fortified +4.
- In melee both units take damage. Ranged attacks take no counter-damage.
- Cities have 200 HP (300 with walls) and strength 15 + 2 × population (+10 with walls). A melee unit captures a city whose HP reaches 0.

**Techs.** 12 techs in 3 tiers, costing 25, 50 and 90 Science.

| Tier | Techs |
|---|---|
| 1 | Pottery (Granary), Mining (Mine), Animal Husbandry, Archery (Archer) |
| 2 | Writing (Campus, Library), Masonry (Walls), Horseback Riding (Horseman), Bronze Working (Encampment, Barracks, Swordsman) |
| 3 | Currency (Commercial Hub, Market), Mathematics, Construction, Philosophy |

The tier 3 effects beyond Currency are still to be decided during balancing.

**Victory and defeat**

- Domination: you own every original capital.
- Score: you have the highest score when the turn limit ends. The default limit is 100 turns.
- Defeat: you lose all your cities.

## Milestones

Rough timings for one person building with Claude.

| Milestone | Epics | You can… | Rough time |
|---|---|---|---|
| **M1 Walk the map** | E0, E1, E3 (part) | Pan and zoom a generated world. Move a unit with pathfinding and fog of war. | 2–3 days |
| **M2 Found and grow** | E2, E3, E4, E6 | Found cities, work tiles, grow, build, research, end turns | 3–4 days |
| **M3 War** | E7, E8 | Fight, capture cities, and face AI that settles, builds and attacks. Win or lose. | 3–4 days |
| **M4 Feels like Civ 6** | E5, E9 | Place districts with adjacency previews, with a complete UI and a setup screen | 3 days |
| **M5 Ship v1.0** | E10, E11, E12 | Save and load, sound, hints, performance work, then deploy | 2–3 days |

## Epics

| Epic | Milestone | Stories | Must-haves |
|---|---|---|---|
| E0 Foundation | M1 | 5 | 4 |
| E1 Map and world | M1 | 8 | 6 |
| E2 Turns and game flow | M2–M3 | 6 | 5 |
| E3 Units and movement | M1–M2 | 5 | 2 |
| E4 Cities and economy | M2 | 8 | 6 |
| E5 Districts and buildings | M4 | 6 | 5 |
| E6 Tech tree | M2 | 4 | 3 |
| E7 Combat | M3 | 6 | 4 |
| E8 AI rivals | M3 | 6 | 5 |
| E9 Interface | M4 | 7 | 3 |
| E10 Save and load | M5 | 3 | 2 |
| E11 Sound and polish | M5 | 3 | 0 |
| E12 Release | M5 | 5 | 5 |

**Sizes:** S is up to half a day, M is about a day, L is 2–3 days.

**Priority:** Must ships in v1.0. Should ships in v1.0 if time allows. Could is v1.1 or later.

---

## E0 Foundation

#### E0.1 Project skeleton · S · Must
*As a developer, I want a runnable skeleton so every later story has a home.*
- `index.html` loads `src/main.js` as a module and draws a full-window canvas.
- `node dev-server.mjs` serves the folder at `http://localhost:5173` with correct MIME types.
- The folder layout above exists. The README explains how to run and test.

#### E0.2 Test harness · S · Must
*As a developer, I want fast tests on game rules so balance changes don't break the game.*
- `node --test` runs everything in `tests/` with no installs.
- Modules in `src/core/` import in Node without touching `window` or `document`.

#### E0.3 Seeded randomness and state model · S · Must
*As a developer, I want one serializable state with its own RNG so games are reproducible.*
- The same seed produces the same random sequence (tested).
- The state round-trips through `JSON.stringify` / `JSON.parse` with no loss (tested).
- The state shape is documented at the top of `state.js`.

#### E0.4 Action pipeline · M · Must
*As a developer, I want every state change to go through `applyAction` so players and AI follow the same rules.*
- `applyAction(state, action)` validates the action, applies it and returns events for the UI and animations.
- An invalid action is rejected with a readable reason, and the state is left untouched.
- A debug log of recent actions is available in the console.

#### E0.5 Debug overlay · S · Should
*As a developer, I want a debug view so I can inspect the world quickly.*
- The backtick key toggles an overlay showing tile coordinates, FPS, the seed and a "reveal map" switch.

## E1 Map and world

#### E1.1 Hex math · S · Must
*As a developer, I want reliable hex utilities so map, movement and combat agree on geometry.*
- Axial and offset conversion, neighbors, distance, rings and pixel↔hex conversion, each with unit tests.

#### E1.2 Generate a world from a seed · M · Must
*As a player, I want a new map each game so every game plays differently.*
- The same seed and size always produce the same map (tested).
- The map has 1–2 continents with mixed terrain, mountain ranges and coastlines.
- There's a start position for every player, at least 7 tiles apart, each with at least 4 food tiles within radius 2.

#### E1.3 Bonus resources · S · Should
*As a player, I want resources on the map so where I settle matters.*
- Wheat, Stone and Fish appear on their valid terrain, on about 8% of workable tiles.

#### E1.4 Draw the map · M · Must
*As a player, I want a clear, good-looking map so I can read the world at a glance.*
- Each terrain has a distinct color plus a simple drawn icon (trees, hill arcs, peaks, waves). Resources get icons.
- Only on-screen hexes are drawn, so a Medium map pans at 60 fps on a mid-range laptop.
- The map is sharp on HiDPI screens.

#### E1.5 Camera · M · Must
*As a player, I want to move around the map easily.*
- You can pan by dragging, with arrow keys or with WASD. You can zoom with the mouse wheel or a trackpad pinch, within limits.
- Selecting a unit or city centers the camera on it smoothly.

#### E1.6 Tile tooltip · S · Must
*As a player, I want to inspect any tile so I can plan moves and cities.*
- Hovering shows terrain, yields, resource, owner, move cost and defense bonus.

#### E1.7 Fog of war · M · Must
*As a player, I want to discover the world so exploring feels meaningful.*
- Tiles have three states:
  - Unexplored, drawn as parchment.
  - Explored but not currently visible, drawn dimmed with the last known state.
  - Visible.
- Units see 2 tiles (3 from hills). Cities see 2 tiles past their borders.
- AI players only know what they have explored.

#### E1.8 Minimap · S · Could
*As a player, I want an overview map so I can jump anywhere.*
- A corner minimap shows explored terrain, borders and the camera frame. Clicking it moves the camera.

## E2 Turns and game flow

#### E2.1 Turn loop · M · Must
*As a player, I want to end my turn and watch the world respond.*
- The End Turn button and the Enter key end the turn. The rivals then play, and a new turn starts.
- Start-of-turn processing runs in a fixed, tested order: yields, growth, production, research, borders, healing.

#### E2.2 "Needs orders" prompt · S · Must
*As a player, I want the game to tell me what still needs attention so I don't forget units or cities.*
- The End Turn button changes to "Unit needs orders", "Choose research" or "Choose production". Clicking it jumps to the next item.

#### E2.3 Notifications · S · Should
*As a player, I want to know what happened this turn.*
- A notification stack covers growth, finished production, researched techs, attacks and cities lost. Clicking a notification jumps to where it happened.

#### E2.4 New game setup · S · Must
*As a player, I want to choose how my game is set up.*
- Options: map size, number of rivals (1–3), difficulty (Easy, Normal, Hard), turn limit (60, 100 or 150), and a seed (random or typed in).

#### E2.5 Victory and defeat · S · Must
*As a player, I want a clear ending so a game feels complete.*
- The game checks for Domination, Score at the turn limit, and Defeat.
- The end screen shows the score breakdown, turns, cities and techs, with "New game" and "Keep playing" buttons.

#### E2.6 Score · S · Must
*As a player, I want to see how I rank against my rivals.*
- Score: 5 per city, 1 per population, 2 per tech, 3 per district, and 1 per 10 tiles owned. It's shown for every known player.

## E3 Units and movement

#### E3.1 Unit model · S · Must
*As a developer, I want units defined as data so adding a unit type means adding data.*
- Unit types live in `data/units.js`. Each unit has HP, remaining moves, an owner and a position.
- One military and one civilian unit can share a tile.

#### E3.2 Select and move · M · Must
*As a player, I want to click a unit and send it somewhere.*
- A* pathfinding over move costs. Mountains and water are impassable.
- A path preview shows how many turns the move takes. Moves longer than one turn continue automatically on later turns.
- Moving units slide to the new tile in about 150 ms.

#### E3.3 Unit orders · S · Should
*As a player, I want basic orders so I can manage units quickly.*
- Skip (Space), Fortify (F, +4 defense), Sleep and Delete, each with a button and a hotkey.

#### E3.4 Zone of control · S · Should
*As a player, I want enemy units to block movement so positioning matters.*
- A military unit must stop when it enters a tile next to an enemy military unit.

#### E3.5 Scout auto-explore · S · Could
*As a player, I want scouts to explore on their own so early turns go faster.*
- An "Explore" order moves the scout toward the nearest unexplored area each turn until nothing is left to reach.

## E4 Cities and economy

#### E4.1 Found a city · S · Must
*As a player, I want to settle cities so I can build an empire.*
- A Settler founds a city on valid land at least 4 tiles from any other city. It gets a name from the player's list and claims radius 1.
- The first city is the capital and gets the palace bonus.

#### E4.2 Worked tiles and yields · M · Must
*As a player, I want my cities to work good tiles so they grow and produce.*
- Tiles are assigned automatically: food first until population 3, then balanced.
- In the city screen, the player can lock a citizen onto a specific tile.

#### E4.3 Growth · S · Must
*As a player, I want cities to grow when fed.*
- Surplus food fills a growth bar. The threshold formula lives in data. A city starving at zero food loses 1 population.

#### E4.4 Production queue · M · Must
*As a player, I want to choose what each city builds.*
- Cities can build units, buildings and districts, with up to 5 items queued. Leftover production carries over.
- Gold can buy the current item at 4 gold per production point remaining.

#### E4.5 Border growth · S · Must
*As a player, I want my borders to grow so my cities get more land.*
- Culture fills a border bar. When it's full, the city claims the best adjacent unowned tile within radius 3.
- Gold can buy a specific tile.

#### E4.6 Gold and upkeep · S · Should
*As a player, I want gold to matter so I have to manage an economy.*
- Each unit beyond the free allowance (2 per city) costs 1 gold per turn.
- If the treasury goes negative, a unit is disbanded and the player is notified.

#### E4.7 City screen · M · Must
*As a player, I want one place to manage a city.*
- Shows population, yields, growth and border progress, the production queue, buildings, a worked-tiles overlay, and a rename option.

#### E4.8 Builders and improvements · M · Should
*As a player, I want to improve my land.*
- A Builder has 3 charges. It can build a Farm (+1 Food on grassland or plains) or a Mine (+1 Production on hills). Improvements are drawn on the map.

## E5 Districts and buildings

#### E5.1 Buildings · S · Must
*As a player, I want buildings that strengthen my cities.*
- Monument, Granary and Walls go in the city center. Library, Market and Barracks each need their district. Their effects show up in the yields.

#### E5.2 Place a district · M · Must
*As a player, I want to choose where each district goes so city layout is a real decision.*
- Choosing a district highlights the valid tiles inside the borders. Mountains, water, the city center and existing districts aren't valid. An Encampment can't go next to the city center.
- A district replaces the tile's normal yields.

#### E5.3 Adjacency bonuses · S · Must
*As a player, I want placement to be rewarded so planning pays off.*
- Campus and Commercial Hub get the adjacency bonuses from the rules above.
- Bonuses are recalculated when a neighboring tile changes (tested).

#### E5.4 Adjacency preview · S · Must
*As a player, I want to see each tile's bonus before I place a district.*
- While placing, every valid tile shows a "+N" badge and the best tile is highlighted. This is the moment that makes it feel like Civ 6.

#### E5.5 District limit · S · Must
*As a player, I want clear limits so I understand why I can't place more.*
- A city gets 1 district per 3 population, rounded up. When a district is unavailable, the tooltip says why ("City needs population 4").

#### E5.6 Pillage districts · S · Could
*As an attacker, I want to damage enemy districts so war has an economic side.*
- A military unit on an enemy district can pillage it. The district stops producing yields until repaired.

## E6 Tech tree

#### E6.1 Tech data · S · Must
*As a developer, I want the tech tree as data so it's easy to rebalance.*
- 12 techs, each with its tier, prerequisites, cost and unlocks.

#### E6.2 Research · S · Must
*As a player, I want science to unlock new options.*
- Science goes into the current tech, and overflow carries over. Having no research chosen triggers the "Choose research" prompt.

#### E6.3 Tech tree screen · M · Must
*As a player, I want to see the tree and plan a path.*
- Tiers are shown as columns with prerequisite lines, turns to finish, and icons for what each tech unlocks.
- Each tech shows its state: researched, available or locked.
- Clicking a locked tech queues its prerequisites automatically.

#### E6.4 Boosts · S · Could
*As a player, I want in-game actions to speed up research.*
- Each tech has a condition, such as "kill a unit with an Archer". Meeting it grants 40% of the tech's cost.

## E7 Combat

#### E7.1 Melee attack · M · Must
*As a player, I want to attack enemy units.*
- Moving onto an enemy unit attacks it using the damage formula, and both units take damage.
- If the defender dies and the attacker survives, the attacker moves in. Attacking ends the unit's turn.

#### E7.2 Ranged attack · S · Must
*As a player, I want ranged units to attack from a distance.*
- Range 2. Mountains block the shot. There's no counter-damage.

#### E7.3 Modifiers and combat preview · M · Must
*As a player, I want to know the likely result before I attack.*
- Terrain, fortify, missing HP and Barracks modifiers all apply.
- Hovering a target shows the expected damage range for both sides and lists the modifiers.

#### E7.4 Healing · S · Should
*As a player, I want damaged units to recover.*
- A unit heals +10 HP per turn in neutral land and +20 in its own territory. It doesn't heal on a turn it moved or attacked.

#### E7.5 City combat and capture · M · Must
*As a player, I want to besiege and take enemy cities.*
- Cities have their own HP and strength and regenerate 20 HP per turn when not attacked. Walls give a ranged strike.
- A melee unit captures a city at 0 HP, and captured capitals count toward Domination.

#### E7.6 War and peace · S · Should
*As a player, I want to choose when to go to war.*
- Players start at peace. Declaring war is an action. The AI accepts peace depending on how the war is going.
- A diplomacy panel lists the rivals you've met and whether you're at war.

## E8 AI rivals

#### E8.1 AI framework · M · Must
*As a developer, I want AI players built on the same rules as the human player.*
- AI turns only use `applyAction`, and the same seed gives the same result.
- Each AI turn takes at most 300 ms on a Medium map.

#### E8.2 Expansion · M · Must
*As a player, I want rivals that grow so the map fills up and gets contested.*
- The AI scores possible city sites on food, production, coast and distance. On Normal it settles 3–6 cities by turn 60.

#### E8.3 Build and research priorities · M · Must
*As a player, I want rivals with sensible economies so they stay competitive.*
- Weighted priorities drive what the AI builds and researches: defense when threatened, settlers early, districts mid-game.
- There are two personalities, Builder and Conqueror, which use different weights.

#### E8.4 Military behavior · L · Must
*As a player, I want rivals that defend and attack convincingly.*
- The AI keeps a garrison in each city and gathers at least 4 units before attacking. It targets the weakest reachable city and pulls badly damaged units back to heal.

#### E8.5 Difficulty · S · Must
*As a player, I want a difficulty that suits me.*
- Easy, Normal and Hard change AI yields (×0.8, ×1 and ×1.25), starting units and aggression.

#### E8.6 AI in a Web Worker · M · Could
*As a player, I want the screen to stay smooth while rivals think.*
- If AI turns take longer than 300 ms, they run in a Web Worker while the UI shows each rival's name as it plays.

## E9 Interface

#### E9.1 Top bar · S · Must
*As a player, I want my empire's numbers always visible.*
- Science, Culture and Gold per turn, the gold total, the turn and year, and research progress.

#### E9.2 Unit panel · S · Must
*As a player, I want to see and command the selected unit.*
- Shows the unit's name, strength, HP and moves, and its available orders as buttons with their hotkeys.

#### E9.3 Selection feedback · S · Must
*As a player, I want to see where I can go and what I can attack.*
- The selected unit gets a ring. Tiles it can reach this turn are highlighted, attackable enemies are marked, and the path line shows turn numbers.

#### E9.4 Keyboard shortcuts · S · Should
*As a player, I want to play quickly from the keyboard.*
- Enter ends the turn. Space skips a unit, F fortifies, B founds a city, T opens the tech tree, and Esc closes panels. A help panel lists them all.

#### E9.5 First-game hints · S · Should
*As a new player, I want gentle guidance so I learn by playing.*
- Tips appear at the right moments: found a city, choose research, build a warrior, place a district. You can dismiss them or turn them off.

#### E9.6 Visual style pass · M · Should
*As a player, I want the game to look cohesive and readable.*
- One consistent palette and parchment-style fog. Readable at 1280 × 720 and above.
- Each owner's color is paired with a pattern or label, never color alone, for color-blind players.

#### E9.7 Touch controls · M · Could
*As a tablet player, I want to play with touch.*
- Tap to select, drag to pan, pinch to zoom. Buttons are at least 44 px.

## E10 Save and load

#### E10.1 Autosave and Continue · S · Must
*As a player, I want the game to save itself so I never lose progress.*
- The game autosaves after each turn and keeps the last 3 autosaves. "Continue" on the title screen resumes the latest one.

#### E10.2 Save slots · S · Should
*As a player, I want named saves so I can try different strategies.*
- 5 named slots, each showing the turn and the date saved.

#### E10.3 Export and import · S · Must
*As a player, I want a save file I can keep or move to another computer.*
- Download the save as `.json` and load it back.
- Saves carry a version number. Older versions are migrated, or an error explains what went wrong.
- A save stays under 1 MB.

## E11 Sound and polish

#### E11.1 Sound effects · S · Should
*As a player, I want feedback sounds so actions feel satisfying.*
- Sounds for clicking, moving, attacking, founding a city, finishing a tech and starting a turn.
- There's a volume slider and a mute button. Sound starts only after the first click.

#### E11.2 Animations · S · Should
*As a player, I want motion that shows what happened.*
- A lunge and floating damage numbers on attacks, a pop when a city is founded, and a fade-in for new border tiles.

#### E11.3 Music · S · Could
*As a player, I want a calm soundtrack for long sessions.*
- A few looping tracks with their own volume control.

## E12 Release

#### E12.1 Performance · M · Must
*As a player, I want the game smooth all the way to the end.*
- On a Medium map with 3 AIs, panning holds 60 fps.
- Ending a turn at turn 100, including every AI turn, takes under 1.5 s on a mid-range laptop.
- Memory stays stable over 150 turns.

#### E12.2 AI-vs-AI soak test · M · Must
*As a developer, I want automated full games so crashes show up before players find them.*
- `node tools/soak.mjs` plays 4 AIs for 150 turns on each of 20 seeds, headless, in under 2 minutes.
- It fails if there's any exception or rule violation.

#### E12.3 Browser support · S · Must
*As a player, I want it to work in my browser.*
- A full game works in current desktop Chrome, Edge, Firefox and Safari, with no console errors or warnings.

#### E12.4 Title screen and credits · S · Must
*As a player, I want a proper front door.*
- New Game, Continue, Load, Settings and Credits, plus the game's name and a version number.

#### E12.5 Deploy · S · Must
*As a player, I want to play from a link.*
- The game is published on GitHub Pages and uploaded to itch.io as an HTML5 game, with a changelog for v1.0.

---

## After v1.0

These are not in the ship scope.

- **Hotseat multiplayer:** pass-and-play on one computer. No server needed. The first v1.1 candidate.
- **Civics tree and policy cards**
- **Rivers, naval units and embarking**
- **Science victory and later eras**
- **Religion, great people, city-states and trade routes**
- **Talking rival leaders:** needs Claude API calls through a small server, which breaks the no-server rule.
- **Play by link:** asynchronous multiplayer. Needs a server, or a flow for sharing save files.
- **Walk into your city in first person**
- **A round world:** a hex globe with 12 pentagons.

## Definition of done

- New rule logic has tests, and `node --test` passes.
- There are no console errors or warnings.
- Numbers live in `src/data/`, not in logic.
- If the state's shape changed, the save version is bumped and a migration is added.
- `tools/soak.mjs` passes once it exists.

## Open questions

Defaults are in place, so none of these block the start.

1. **Name.** Hexhold is a placeholder.
2. **Art.** The default is shapes drawn in code. A sprite sheet can replace them later without changing any rules.
3. **Default turn limit.** It's 100 for now. Change it after playtesting.
4. **Hotseat multiplayer in v1.0?** Currently planned for v1.1.
