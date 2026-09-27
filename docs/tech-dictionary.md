# Hexhold tech dictionary

This is the design reference for Hexhold's technology tree. It is written before the code, and `src/data/` implements it.

**Coverage.** Every technology in Civilization VI is covered, including the Gathering Storm expansion:
- the 67 base-game techs
- Buttress and Refining
- the 7 Future-era techs

That's **76 techs in 9 eras**, plus a repeatable **Future Tech**.

**What's ours.** The tech names are ordinary historical terms. Everything else is Hexhold's own design and is tuned for Hexhold's shorter games (60–250 turns instead of about 500):
- science costs
- prerequisites
- what each tech unlocks
- all descriptions

**Eurekas.** Almost every tech has a goal, in the **Eureka** column. Meeting it gives 40% of the tech's cost at once, whether or not you're researching it (China gets 55%). The goals are in `src/data/boosts.js`.

**Civilizations.** Some units, buildings and improvements have a civilization's own version, which replaces the standard one for that civilization only. They're listed in [civilizations-dictionary.md](civilizations-dictionary.md).

**Reading the tables**

| Column | Meaning |
|---|---|
| **Cost** | Science needed |
| **Needs** | Techs that must be researched first. Picking a locked tech in the game queues these automatically. |
| **Unlocks** | What becomes available: units, buildings, districts, improvements, or a permanent bonus for your whole civilization |
| **Eureka** | The goal that gives 40% of the tech's cost at once |

## Eras at a glance

| Era | Techs | Cost per tech | Theme |
|---|---|---|---|
| Ancient | 11 | 22–32 | Settling, first farms and mines, bronze weapons |
| Classical | 8 | 70–90 | Money, cavalry, iron, sea trade, public works |
| Medieval | 8 | 120–145 | Workshops, universities, knights, castles |
| Renaissance | 9 | 260–295 | Banking, gunpowder, printing, star forts |
| Industrial | 8 | 410–470 | Factories, rifles, science as a discipline, steam |
| Modern | 8 | 615–670 | Electricity, steel, tanks, research labs |
| Atomic | 8 | 905–985 | Computers, rockets, combined arms |
| Information | 9 | 1245–1380 | Satellites, composites, robotics |
| Future | 7 | 1780–2315 | The last techs. **Offworld Mission wins the game.** |

A player's **era** is the latest era in which they have researched at least one tech. It shows in the top bar and in Diplomacy.

---

## Ancient era

| Tech | Cost | Needs | Unlocks | Eureka |
|---|---|---|---|---|
| Pottery | 22 | — | **Granary** (+2 Food) | — |
| Animal Husbandry | 22 | — | Wheat and Deer tiles +1 Food | — |
| Mining | 22 | — | **Mine** improvement (+1 Production on hills) | — |
| Sailing | 32 | — | Fish tiles +1 Food | Found a city on the coast |
| Astrology | 32 | — | **Shrine** (+2 Culture) | Explore 10% of the map |
| Irrigation | 32 | Pottery | Farms +1 Food | Improve a Wheat resource |
| Archery | 32 | Animal Husbandry | **Archer** | Destroy an enemy unit |
| Writing | 32 | Pottery | **Campus** district, **Library** | Meet another civilization |
| Masonry | 32 | Mining | **Walls** | Build a Mine |
| Bronze Working | 32 | Mining | **Spearman**, **Encampment** district, **Barracks** | Build 2 Mines |
| The Wheel | 32 | Mining | **Water Mill** (+1 Food, +1 Production) | Improve a Stone resource |

## Classical era

| Tech | Cost | Needs | Unlocks | Eureka |
|---|---|---|---|---|
| Celestial Navigation | 70 | Sailing, Astrology | **Harbor** district, **Lighthouse** | Explore 20% of the map |
| Currency | 70 | Writing | **Commercial Hub** district, **Market** | Have 100 Gold |
| Horseback Riding | 70 | Animal Husbandry | **Horseman** | Train 3 Warriors |
| Iron Working | 70 | Bronze Working | **Swordsman** | Build 3 Mines |
| Shipbuilding | 90 | Sailing | **Shipyard** (in a Harbor) | Have 2 cities on the coast |
| Mathematics | 90 | Currency | **Catapult** | Have 3 districts |
| Construction | 90 | Masonry, Horseback Riding | Builders +1 use | Build a Water Mill |
| Engineering | 90 | The Wheel | **Aqueduct** (+2 Food). Walls +50 HP. | Build Walls |

## Medieval era

| Tech | Cost | Needs | Unlocks | Eureka |
|---|---|---|---|---|
| Military Tactics | 120 | Mathematics | **Pikeman** | Train 2 Spearmen |
| Apprenticeship | 120 | Currency, Horseback Riding | **Industrial Zone** district, **Workshop**, **Man-at-Arms** | Build 4 Mines |
| Stirrups | 120 | Horseback Riding | **Knight** | Complete Feudalism |
| Machinery | 120 | Iron Working, Engineering | **Crossbowman**, **Lumber Mill** improvement (+2 Production on forest) | Train 3 Archers |
| Buttress | 120 | Shipbuilding, Mathematics | +1 Production in every city | Have 5 districts |
| Education | 145 | Mathematics, Apprenticeship | **University** | Build 2 Libraries |
| Military Engineering | 145 | Construction | **Trebuchet**, **Armory** | Build an Aqueduct |
| Castles | 145 | Construction | **Castle** (needs Walls) | Adopt a Tier 2 government |

## Renaissance era

| Tech | Cost | Needs | Unlocks | Eureka |
|---|---|---|---|---|
| Cartography | 260 | Shipbuilding | +1 sight for every unit | Build 2 Harbors |
| Mass Production | 260 | Shipbuilding, Education | Mines and Lumber Mills +1 Production | Build 2 Lumber Mills |
| Banking | 260 | Stirrups, Education | **Bank** | Complete Guilds |
| Gunpowder | 260 | Apprenticeship, Stirrups, Military Engineering | **Musketman** | Build an Armory |
| Printing | 260 | Machinery | +10% Culture | Build an University |
| Square Rigging | 295 | Cartography | Coast tiles +1 Gold | Train a Musketman |
| Astronomy | 295 | Education | **Observatory** | Build 2 Universities |
| Metal Casting | 295 | Gunpowder | **Bombard** | Build 2 Workshops |
| Siege Tactics | 295 | Castles | **Star Fort** (needs Castle) | Build a Castle |

## Industrial era

| Tech | Cost | Needs | Unlocks | Eureka |
|---|---|---|---|---|
| Industrialization | 410 | Mass Production | **Factory** | Build 3 Workshops |
| Scientific Theory | 410 | Astronomy | +15% Science | Complete The Enlightenment |
| Ballistics | 410 | Metal Casting | **Field Cannon** | Train a Bombard |
| Military Science | 410 | Printing, Siege Tactics | **Cavalry**, **Military Academy** | Destroy 10 enemy units |
| Steam Power | 470 | Square Rigging, Industrialization | +1 move for every unit | Build 2 Shipyards |
| Sanitation | 470 | Scientific Theory | **Sewer** (+3 Food) | Grow a city to 12 population |
| Economics | 470 | Banking, Scientific Theory | **Stock Exchange** | Build 2 Banks |
| Rifling | 470 | Ballistics, Military Science | **Line Infantry**, **Ranger** | Train 3 Musketmen |

## Modern era

| Tech | Cost | Needs | Unlocks | Eureka |
|---|---|---|---|---|
| Flight | 615 | Industrialization, Scientific Theory | +1 sight for every unit, +25% Tourism | Build a Factory |
| Replaceable Parts | 615 | Economics | **Infantry** | Train 3 Line Infantry |
| Steel | 615 | Ballistics | **Artillery**. Cities +10 strength. | Build 8 Mines |
| Electricity | 670 | Steam Power | **Power Plant** | Build 2 Factories |
| Radio | 670 | Steam Power, Flight | **Broadcast Center**, +25% Tourism | Complete Conservation |
| Chemistry | 670 | Sanitation | **Research Lab**, **Anti-Tank Crew** | Build 4 Universities |
| Combustion | 670 | Rifling, Steel | **Tank** | Train 2 Field Cannons |
| Refining | 670 | Rifling | Factories +2 Production | Build 3 Factories |

## Atomic era

| Tech | Cost | Needs | Unlocks | Eureka |
|---|---|---|---|---|
| Advanced Flight | 905 | Radio | Units heal +10 HP per turn | Destroy 25 enemy units |
| Rocketry | 905 | Radio, Chemistry | +10% Science | Build a Research Lab |
| Advanced Ballistics | 905 | Replaceable Parts, Steel | **Machine Gun** | Train 2 Artillery |
| Combined Arms | 905 | Steel, Combustion | Melee units +5 strength | Train 3 Infantry |
| Plastics | 905 | Combustion | Coast tiles +1 Production | Build 12 Mines |
| Computers | 985 | Electricity, Radio | +10% Science and Culture, +25% Tourism | Adopt a Tier 3 government |
| Nuclear Fission | 985 | Advanced Ballistics, Combined Arms | +15% Production | Build 2 Research Labs |
| Synthetic Materials | 985 | Plastics | +2 Food in every city | Grow a city to 20 population |

## Information era

| Tech | Cost | Needs | Unlocks | Eureka |
|---|---|---|---|---|
| Telecommunications | 1245 | Computers | +15% Gold | Build 2 Broadcast Centers |
| Satellites | 1245 | Advanced Flight, Rocketry | Reveals the whole map. **Mechanized Infantry**. | Explore 80% of the map |
| Guidance Systems | 1245 | Rocketry, Advanced Ballistics | **Rocket Artillery** | Destroy 40 enemy units |
| Lasers | 1245 | Nuclear Fission | Ranged and siege units +10 ranged strength | Train 2 Machine Guns |
| Composites | 1245 | Synthetic Materials | **Modern Armor**, **Modern Anti-Tank** | Train 3 Tanks |
| Stealth Technology | 1245 | Synthetic Materials | Every unit +5 defense | Have 20 military units |
| Robotics | 1380 | Computers | +15% Production | Build 3 Power Plants |
| Nanotechnology | 1380 | Composites | Campus districts +3 Science | Build 15 Mines |
| Nuclear Fusion | 1380 | Lasers | +3 Production in every city | Build 5 Research Labs |

## Future era

| Tech | Cost | Needs | Unlocks | Eureka |
|---|---|---|---|---|
| Seasteads | 1780 | Nanotechnology | Coast tiles +2 Food | Build 4 Harbors |
| Advanced AI | 1780 | Robotics | +20% Science | Build 6 Research Labs |
| Advanced Power Cells | 1780 | Nuclear Fusion | +1 move for every unit | Complete Optimization Imperative |
| Cybernetics | 1780 | Robotics | Every unit +5 strength | Adopt a Tier 4 government |
| Smart Materials | 1780 | Nanotechnology | +3 Production in every city | Have 20 districts |
| Predictive Systems | 1780 | Telecommunications | +20% Gold | Complete Globalization |
| **Offworld Mission** | 2315 | Advanced AI, Advanced Power Cells, Smart Materials, Satellites | **Science victory:** the first civilization to research it wins | — |
| Future Tech | 2000 | Everything else | Repeatable, +5 score each. Only reachable when you keep playing after a victory. |

---

## Unit lines

When you research the tech for the next unit in a line, the older unit can no longer be built. Existing units can be **upgraded** for gold while they stand inside your borders:
- The cost is twice the difference in production cost, with a minimum of 10 gold.
- Upgrading uses the unit's turn.
- The unit keeps its health and any training bonus.

| Line | Units (strength, ranged strength / range, moves) |
|---|---|
| Melee | Warrior 20 → Swordsman 35 → Man-at-Arms 45 → Musketman 55 → Line Infantry 65 → Infantry 70 → Mechanized Infantry 85 |
| Anti-cavalry (+10 against mounted units) | Spearman 25 → Pikeman 41 → Anti-Tank Crew 70 → Modern Anti-Tank 80 |
| Ranged | Archer 15 (25/2) → Crossbowman 30 (40/2) → Field Cannon 50 (60/2) → Machine Gun 65 (75/2) |
| Mounted | Horseman 36, 4 moves → Knight 48, 4 → Cavalry 62, 5 → Tank 80, 4 → Modern Armor 90, 5 |
| Siege (+10 against cities) | Catapult 23 (35/2) → Trebuchet 30 (45/2) → Bombard 43 (55/2) → Artillery 60 (70/2) → Rocket Artillery 70 (85/3) |
| Recon | Scout 10, 3 moves → Ranger 45, 3 moves |
| Civilian | Settler, Builder (never obsolete) |

Production costs rise with each era: 20–40 in the Ancient era up to about 250 in the Information era.

**City defense keeps pace.** A city's base strength is the higher of these two:
- 15 + 2 × population
- (the strongest melee unit its owner can build) − 10 + population

Defensive buildings stack on top.

## Buildings

| Building | Cost | Needs tech | Where | Effect |
|---|---|---|---|---|
| Monument | 30 | — | City center | +2 Culture |
| Granary | 40 | Pottery | City center | +2 Food |
| Shrine | 40 | Astrology | City center | +2 Culture |
| Water Mill | 50 | The Wheel | City center | +1 Food, +1 Production |
| Walls | 60 | Masonry | City center | +100 HP, +10 strength, ranged strike |
| Aqueduct | 70 | Engineering | City center | +2 Food |
| Castle | 100 | Castles | City center, after Walls | +100 HP, +10 strength |
| Star Fort | 140 | Siege Tactics | City center, after Castle | +100 HP, +10 strength |
| Sewer | 160 | Sanitation | City center | +3 Food |
| Library | 50 | Writing | Campus | +2 Science |
| University | 100 | Education | Campus | +4 Science |
| Observatory | 130 | Astronomy | Campus | +3 Science |
| Research Lab | 220 | Chemistry | Campus | +5 Science |
| Market | 50 | Currency | Commercial Hub | +3 Gold |
| Bank | 120 | Banking | Commercial Hub | +4 Gold |
| Stock Exchange | 190 | Economics | Commercial Hub | +6 Gold |
| Barracks | 50 | Bronze Working | Encampment | New units +5 strength |
| Armory | 100 | Military Engineering | Encampment | New units +5 more strength |
| Military Academy | 180 | Military Science | Encampment | New units +5 more strength |
| Workshop | 80 | Apprenticeship | Industrial Zone | +2 Production |
| Factory | 170 | Industrialization | Industrial Zone | +4 Production |
| Power Plant | 230 | Electricity | Industrial Zone | +5 Production |
| Amphitheater | 80 | Drama and Poetry (civic) | Theater Square | +2 Culture |
| Art Museum | 140 | Humanism (civic) | Theater Square | +3 Culture |
| Broadcast Center | 220 | Radio | Theater Square | +4 Culture |
| Lighthouse | 60 | Celestial Navigation | Harbor | +2 Food |
| Shipyard | 90 | Shipbuilding | Harbor | +3 Production |

## Districts

A city holds one district per 3 population, rounded up. Every district's yield starts at +1 before adjacency bonuses.

| District | Tech | Yield | Adjacency bonus | Placement |
|---|---|---|---|---|
| Campus | Writing | Science | +1 per mountain, +1 per 2 districts | Land |
| Commercial Hub | Currency | Gold | +2 next to coast, +1 per 2 districts | Land |
| Encampment | Bronze Working | — | Military units build 25% faster | Land, not next to the city center |
| Industrial Zone | Apprenticeship | Production | +1 per adjacent mine, +1 per 2 districts | Land |
| Theater Square | Drama and Poetry (civic) | Culture | +1 per 2 districts | Land |
| Harbor | Celestial Navigation | Gold | +2 next to the city center, +1 per adjacent Fish, +1 per 2 districts | **Coast tile** next to land |

The city center counts as a district for adjacency.

## Effect glossary

These are the kinds of bonus a tech can grant. They're data fields in `src/data/techs.js`, and they add together across every tech you've researched.

| Effect | Meaning |
|---|---|
| Resource bonus | Tiles with a given resource yield more |
| Improvement bonus | Farms, mines or lumber mills yield more |
| Terrain bonus | Coast tiles yield more |
| City yield | A flat bonus in every city |
| District bonus | Every district of a type yields more |
| Building bonus | Every building of a type yields more |
| Yield % | A percentage bonus to a yield in every city, applied after the flat bonuses |
| Builder uses | New builders get extra uses |
| Walls HP / city strength | Stronger cities |
| Moves / sight | Every unit moves or sees farther |
| Healing | Units heal more each turn |
| Unit strength | Melee strength, ranged strength or defense for every unit |
| Reveal map | Your whole map becomes explored |
| Victory | Researching the tech wins the game |

## Pacing targets

- A **100-turn** game reaches the Renaissance or Industrial era.
- A **250-turn** game can reach the Future era, and a strong civilization can launch the Offworld Mission.

The AI-vs-AI soak test checks these targets, and the costs above are tuned against it. Governments and policy cards (see [civics-dictionary.md](civics-dictionary.md)) add a lot of science and production, and Eurekas cut research time, so costs were raised in 1.3 (from the Renaissance era on) and in 1.4 (from the Classical era on) to keep these targets.
