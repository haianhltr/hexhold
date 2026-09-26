# Changelog

## 1.2.0 — 2026-09-26

The full tech tree: 76 techs across 9 eras, from Pottery to the Offworld Mission, modeled on Civilization VI with Gathering Storm. The design reference is [docs/tech-dictionary.md](docs/tech-dictionary.md).

- **Tech tree screen:** a full-screen timeline with era bands, prerequisite lines, era jump buttons and a search box that finds techs by name or by what they unlock. It opens scrolled to your current research.
- **Tech effects:** 36 techs give lasting bonuses, such as more food from farms, extra production in every city, extra moves or sight, stronger units and cities, a map reveal, and percentage boosts to yields.
- **Units:** 29 units in upgrade lines, from Warrior to Mechanized Infantry, Spearman to Modern Anti-Tank, Horseman to Modern Armor, and Catapult to Rocket Artillery. A new unit replaces the old one in the build list, and queued units switch over automatically. Upgrade old units for gold inside your borders (the U key). Anti-cavalry units get +10 against mounted units, and siege units +10 against cities.
- **Buildings and districts:** 27 buildings. Castle and Star Fort build on Walls. Three new districts: the Industrial Zone (+1 production per neighboring mine), the Theater Square, and the Harbor, which is built on coast. There's also a new improvement, the Lumber Mill, for forests.
- **City defense keeps up with the era:** a city's strength follows the best melee unit its owner can build.
- **Science victory:** the first civilization to research Offworld Mission wins. You're warned when a rival can start it.
- **Epic game length:** a new 250-turn option has time to reach the Future era.
- **AI:** rivals value techs by what they unlock, head toward the science victory late in the game, build the new districts and buildings, add anti-cavalry and siege units to their armies, and upgrade their units.
- **Maps:** new 2D symbols and 3D models for rifles, spears, cannons and tanks; a pier and crane for Harbors; smokestacks for Industrial Zones; a stage for Theater Squares; log piles for Lumber Mills; and taller walls for Castles and Star Forts.
- **Saves:** 1.1 saves load. Philosophy no longer exists, so it is removed from them.
- **Checks:** 39 unit tests (13 of them new, for the tech tree). The soak test reports each game's era at turn 100 and at the end. The browser check covers the tech tree, search and unit upgrades.

## 1.1.0 — 2026-09-26

The map is now 3D, in the style of Civilization VI.

- **3D renderer (WebGL through Three.js):** a tilted perspective camera that lowers as you zoom in; terrain with height and hills; blended ground colors under a painted grain; shallow and deep water with animated waves and surf; mountains, forests and farms; cities and districts as clusters of 3D buildings, with walls when built; units as small 3D figures under Civ-style flags; soft sunlight and shadows.
- **Fog of war:** unexplored land sits under parchment, and explored areas out of sight turn sepia.
- **Classic 2D:** the original 2D map remains available under Settings → Map view. It's also used automatically when a browser can't show 3D.
- **Settings:** a Map view option (3D or Classic 2D) and a Shadows switch for slower computers.
- Three.js r170 (MIT License) is included in `vendor/three/`, so the game still needs no install, no build step and no network for code.
- The browser check now covers the 3D map, switching views, and frame rate.

## 1.0.0 — 2026-09-26

First release.

- **World:** generated hex maps in two sizes, one shared continent, mountains, hills, forests, climate bands and four bonus resources. The same seed always makes the same map.
- **Cities:** founding, worked tiles with citizen locking, growth, culture-driven border growth, buying tiles, a five-item production queue and buying items with gold.
- **Districts:** Campus, Commercial Hub and Encampment, with adjacency bonuses and a live "+N" preview on every valid tile while you place one.
- **Research:** 12 techs in three tiers plus repeatable Future Tech. Picking a locked tech queues its prerequisites.
- **Units:** Settler, Builder (farms and mines), Scout, Warrior, Archer, Horseman, Swordsman and Catapult. Multi-turn move orders, zones of control, fortify, sleep and skip.
- **Combat:** melee and ranged combat with terrain, fortification and wound modifiers; a preview before every attack; walled cities that strike back; city capture.
- **Diplomacy:** peace with closed borders, war declarations, and peace offers in both directions.
- **AI rivals:** Builder and Conqueror personalities on Easy, Normal and Hard. They expand, research, build districts, garrison, gather armies, besiege cities and sue for peace.
- **Victory:** domination (hold every original capital), highest score at the turn limit (60, 100 or 150 turns), or defeat.
- **Interface:** top bar, unit and city panels, tech tree, diplomacy, notifications, tooltips, minimap, keyboard shortcuts, first-game tips, synthesized sound and move and combat animations.
- **Saving:** autosave every turn (last three kept), five save slots, and export and import as a file or a pasted code.
- **Quality:** unit tests, a 20-game AI soak test and a headless-browser check with real input.
