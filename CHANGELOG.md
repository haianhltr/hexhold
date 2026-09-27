# Changelog

## 1.4.0 — 2026-09-26

Real civilizations, Eurekas and Inspirations, a culture victory, and a history of every civilization. The design references are [docs/civilizations-dictionary.md](docs/civilizations-dictionary.md) and [docs/victory-and-history.md](docs/victory-and-history.md).

- **12 real civilizations** replace the four invented ones: Rome, Egypt, Greece, Persia, China, India, Japan, Korea, Mongolia, England, France and the Aztec. Each has:
  - a historical leader, its own color and emblem, and real city names
  - an ability, for example Greece's extra wildcard policy slot, Japan's stronger district adjacency, or the Aztec Flower War that turns kills into culture
  - a unique unit that replaces a standard one: the Legion, Hoplite, Samurai, Hwacha, Keshig, Redcoat and six more
  - a unique building, district or improvement: the Hanlin Academy, Acropolis, Seowon, Royal Navy Dockyard, Sphinx, Château and others

  The New game screen shows all three traits for the civilization you pick. Rivals are drawn at random from the rest, and the AI plays each civilization as a builder or a conqueror.
- **Eurekas and Inspirations:** 72 techs and 57 civics have a goal, shown on their cards with progress. Meeting it gives 40% of the cost at once (55% for China).
- **Culture victory:** tourism draws visitors from other civilizations. Win by drawing more visitors from every rival than it has tourists at home. Tourism comes from Theater Square buildings, and from all culture once you complete Humanism. Late techs, civics, policy cards and France multiply it. You're warned when a rival gets close.
- **History:** a timeline of historic moments for every civilization, such as founding cities, entering new eras, world firsts, wars, peace, captures and cultural dominance. Moments add a Historic moments row to the score.
- **History screen (R):** victory progress for science, culture, domination and score, plus the timeline for you or everyone you know. The game-over screen links to it.
- **Top bar:** Tourism per turn appears once you have some, and there's a History button.
- **Balance:** Eurekas speed up research, so tech and civic costs from the Classical era on are higher. On Normal, AI-vs-AI Epic games still end in a science victory between turns 180 and 245, or reach the turn limit.
- **Saves:** 1.3 saves load. Their four original civilizations become Rome, Greece, the Aztec and Persia.
- **Checks:** 61 unit tests (10 of them new). The browser check covers the civilization picker, the History screen and unique units. `node tools/docs.mjs` regenerates the civics and civilizations dictionaries from the game data.

## 1.3.0 — 2026-09-26

The civics tree, governments and policy cards, modeled on Civilization VI with Gathering Storm. The design reference is [docs/civics-dictionary.md](docs/civics-dictionary.md).

- **Civics:** 59 civics in 9 eras, researched with culture, plus a repeatable Future Civic. The civics tree uses the same timeline screen as the tech tree (V key, or the civic bar in the top bar), and the two trees link to each other.
- **Governments:** 13 governments in five tiers, from Chiefdom to Synthetic Technocracy. Each has a bonus and a set of military, economic and wildcard policy slots.
- **Policy cards:** 57 cards, such as Urban Planning, Agoge, Natural Philosophy, Conscription, Professional Army and Grande Armée. Later cards replace earlier ones and take their slot automatically.
- **Government screen (G):** slot cards, see what changes cost, confirm or undo, and switch government. Changes are free on any turn you finish a civic; at other times each new card costs gold.
- **New effects:** production toward kinds of units and buildings, doubled district adjacency, stronger district buildings, per-district and capital yields, fewer upkeep costs, cheaper upgrades, tiles and purchases, and faster growth.
- **The Theater Square** and Amphitheater now come from the Drama and Poetry civic, and the Art Museum from Humanism, as in Civ VI.
- **AI:** rivals pick civics, choose governments and fill their policy slots based on what each card is worth to them right now.
- **Top bar:** tech and civic progress side by side, and a Government button that pulses when you have an empty slot you could fill. The End Turn button asks for a civic and a first government.
- **Balance:** tech costs from the Renaissance on are higher, because policies add a lot of science. On Normal, AI-vs-AI Epic games end in a science victory between turns 185 and 245, or reach the turn limit.
- **Score:** each civic is worth 2 points, like a tech.
- **Saves:** 1.2 saves load and start the civics tree from the beginning.
- **Checks:** 51 unit tests (12 of them new, for civics). The soak test checks government and policy rules every round and reports civics eras. The browser check covers the civics tree and slotting a card on the government screen.

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
